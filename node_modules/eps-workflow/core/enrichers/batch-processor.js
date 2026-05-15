'use strict';

const { EventEmitter } = require('events');

/**
 * Batch Processor - Process multiple ASTs with cost optimization
 *
 * WHY: Reduce API costs and improve throughput when enriching many files
 * HOW: Batch similar files together, prioritize important files, track progress
 *
 * Features:
 * - Batch grouping by language/framework
 * - Priority queue for important files
 * - Parallel processing with concurrency control
 * - Progress tracking and reporting
 * - Cost estimation before processing
 *
 * @module batch-processor
 */

// Default configuration
const DEFAULT_CONFIG = {
  batchSize: 10,
  concurrency: 3,
  priorityBoost: ['controller', 'service', 'repository', 'entity'],
  skipPatterns: [/\.test\./, /\.spec\./, /\.d\.ts$/],
  maxCostPerBatch: 0.10,  // USD
  dryRun: false,
};

/**
 * BatchProcessor class
 */
class BatchProcessor extends EventEmitter {
  constructor(enricher, config = {}) {
    super();
    this.enricher = enricher;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this._queue = [];
    this._processing = false;
    this._processed = 0;
    this._failed = 0;
    this._skipped = 0;
    this._results = new Map();
  }

  /**
   * Add ASTs to the processing queue
   *
   * @param {UnifiedAST[]} asts - ASTs to process
   */
  enqueue(asts) {
    for (const ast of asts) {
      // Check skip patterns
      if (this._shouldSkip(ast)) {
        this._skipped++;
        continue;
      }

      // Calculate priority
      const priority = this._calculatePriority(ast);

      this._queue.push({
        ast,
        priority,
        status: 'pending',
      });
    }

    // Sort by priority (higher first)
    this._queue.sort((a, b) => b.priority - a.priority);

    this.emit('queued', { count: asts.length, queueSize: this._queue.length });
  }

  /**
   * Process all queued ASTs
   *
   * @returns {Promise<Map<string, object>>} Results map (filePath -> enrichment)
   */
  async processAll() {
    if (this._processing) {
      throw new Error('Already processing');
    }

    this._processing = true;
    this.emit('start', { queueSize: this._queue.length });

    try {
      // Group into batches
      const batches = this._createBatches();

      // Process batches with concurrency control
      for (let i = 0; i < batches.length; i += this.config.concurrency) {
        const batchSlice = batches.slice(i, i + this.config.concurrency);

        // Estimate cost before processing
        const estimatedCost = this._estimateBatchCost(batchSlice);
        this.emit('batchStart', {
          batchIndex: i / this.config.concurrency,
          totalBatches: Math.ceil(batches.length / this.config.concurrency),
          estimatedCost,
        });

        if (this.config.dryRun) {
          // Dry run - skip actual processing
          for (const batch of batchSlice) {
            for (const item of batch.items) {
              item.status = 'skipped';
              this._skipped++;
            }
          }
          continue;
        }

        // Process batches in parallel
        const promises = batchSlice.map(batch => this._processBatch(batch));
        await Promise.all(promises);

        this.emit('batchComplete', {
          batchIndex: i / this.config.concurrency,
          processed: this._processed,
          failed: this._failed,
        });
      }

    } finally {
      this._processing = false;
      this.emit('complete', {
        processed: this._processed,
        failed: this._failed,
        skipped: this._skipped,
        results: this._results.size,
      });
    }

    return this._results;
  }

  /**
   * Process a single batch
   */
  async _processBatch(batch) {
    for (const item of batch.items) {
      try {
        item.status = 'processing';
        this.emit('itemStart', { filePath: item.ast.filePath });

        const result = await this.enricher.enrichAST(item.ast);

        item.status = 'completed';
        this._results.set(item.ast.filePath, result);
        this._processed++;

        this.emit('itemComplete', {
          filePath: item.ast.filePath,
          success: true,
        });

      } catch (error) {
        item.status = 'failed';
        item.error = error.message;
        this._failed++;

        this.emit('itemComplete', {
          filePath: item.ast.filePath,
          success: false,
          error: error.message,
        });
      }
    }
  }

  /**
   * Create batches grouped by language/framework
   */
  _createBatches() {
    const batches = [];
    const groups = new Map();

    // Group by language + framework
    for (const item of this._queue) {
      const key = `${item.ast.language}:${item.ast.framework?.name || 'none'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    }

    // Create batches from groups
    for (const [key, items] of groups) {
      for (let i = 0; i < items.length; i += this.config.batchSize) {
        batches.push({
          key,
          items: items.slice(i, i + this.config.batchSize),
        });
      }
    }

    return batches;
  }

  /**
   * Calculate processing priority for an AST
   */
  _calculatePriority(ast) {
    let priority = 0;

    // Base priority by lines of code (larger = more important)
    priority += Math.min(ast.meta.linesOfCode / 100, 5);

    // Boost for specific file types
    const fileName = ast.filePath.toLowerCase();
    for (const pattern of this.config.priorityBoost) {
      if (fileName.includes(pattern)) {
        priority += 10;
        break;
      }
    }

    // Boost for files with many classes/methods
    priority += Math.min(ast.classes.length * 2, 10);
    priority += Math.min(ast.functions.length, 5);

    // Boost for framework components
    if (ast.framework?.components?.length > 0) {
      priority += 5;
    }

    return priority;
  }

  /**
   * Check if AST should be skipped
   */
  _shouldSkip(ast) {
    const filePath = ast.filePath;

    for (const pattern of this.config.skipPatterns) {
      if (pattern.test(filePath)) {
        return true;
      }
    }

    // Skip empty files
    if (ast.classes.length === 0 && ast.functions.length === 0) {
      return true;
    }

    return false;
  }

  /**
   * Estimate cost for a batch slice
   */
  _estimateBatchCost(batches) {
    let totalTokens = 0;

    for (const batch of batches) {
      for (const item of batch.items) {
        // Estimate tokens based on code summary
        const summary = this.enricher._buildCodeSummary(item.ast);
        totalTokens += Math.ceil(summary.length / 4) * 2;  // Input + output estimate
      }
    }

    // Gemini Flash pricing: ~$0.00001 per 1000 tokens (very rough)
    return (totalTokens / 1000) * 0.00001;
  }

  /**
   * Get current queue status
   */
  getStatus() {
    const pending = this._queue.filter(i => i.status === 'pending').length;
    const processing = this._queue.filter(i => i.status === 'processing').length;
    const completed = this._queue.filter(i => i.status === 'completed').length;
    const failed = this._queue.filter(i => i.status === 'failed').length;

    return {
      queueSize: this._queue.length,
      pending,
      processing,
      completed,
      failed,
      skipped: this._skipped,
      isProcessing: this._processing,
    };
  }

  /**
   * Get results for a specific file
   */
  getResult(filePath) {
    return this._results.get(filePath);
  }

  /**
   * Get all results
   */
  getAllResults() {
    return new Map(this._results);
  }

  /**
   * Clear queue and results
   */
  clear() {
    this._queue = [];
    this._results.clear();
    this._processed = 0;
    this._failed = 0;
    this._skipped = 0;
  }

  /**
   * Cancel processing (if possible)
   */
  cancel() {
    // Mark remaining items as cancelled
    for (const item of this._queue) {
      if (item.status === 'pending') {
        item.status = 'cancelled';
      }
    }
    this._processing = false;
    this.emit('cancelled');
  }
}

/**
 * Create a progress reporter for console output
 */
function createProgressReporter(processor) {
  let startTime = null;

  processor.on('start', ({ queueSize }) => {
    startTime = Date.now();
    console.log(`\n📦 Starting batch processing: ${queueSize} files`);
  });

  processor.on('batchStart', ({ batchIndex, totalBatches, estimatedCost }) => {
    console.log(`\n⏳ Batch ${batchIndex + 1}/${totalBatches} (est. cost: $${estimatedCost.toFixed(6)})`);
  });

  processor.on('itemComplete', ({ filePath, success, error }) => {
    const icon = success ? '✅' : '❌';
    const status = success ? 'done' : `failed: ${error}`;
    console.log(`  ${icon} ${filePath.split('/').pop()}: ${status}`);
  });

  processor.on('complete', ({ processed, failed, skipped, results }) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Batch processing complete in ${elapsed}s`);
    console.log(`   Processed: ${processed}, Failed: ${failed}, Skipped: ${skipped}`);
    console.log(`   Results: ${results} enrichments`);
  });

  processor.on('cancelled', () => {
    console.log('\n⚠️ Batch processing cancelled');
  });
}

module.exports = {
  BatchProcessor,
  createProgressReporter,
  DEFAULT_CONFIG,
};
