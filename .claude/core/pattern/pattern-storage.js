/**
 * PatternStorage - Manages pattern persistence and retrieval
 * Week 6 Day 2: Pattern Extraction Engine
 *
 * Provides:
 * - Save extracted patterns with metadata
 * - Load patterns by ID or type
 * - Export patterns to JSON
 * - Calculate pattern confidence scores
 * - High-frequency pattern filtering
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class PatternStorage {
    constructor(storagePath) {
        this.storagePath = storagePath || path.join(
            __dirname,
            '../memory-bank/eps-enhancement/learned-patterns'
        );
        this.ensureStorageExistsSync();
    }

    /**
     * Ensure storage directory exists (synchronous for constructor)
     */
    ensureStorageExistsSync() {
        try {
            if (!fsSync.existsSync(this.storagePath)) {
                fsSync.mkdirSync(this.storagePath, { recursive: true });
            }
        } catch (error) {
            console.error('Error creating storage directory:', error.message);
        }
    }

    /**
     * Ensure storage directory exists (async)
     */
    async ensureStorageExists() {
        try {
            await fs.mkdir(this.storagePath, { recursive: true });
        } catch (error) {
            // Directory already exists, ignore
        }
    }

    /**
     * Save extracted patterns
     */
    async savePatterns(patterns, metadata = {}) {
        await this.ensureStorageExists();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `patterns-${timestamp}.json`;
        const filePath = path.join(this.storagePath, filename);

        const data = {
            metadata: {
                extractedAt: new Date().toISOString(),
                totalPatterns: patterns.length,
                version: '1.0.0',
                ...metadata
            },
            patterns: patterns.map(p => ({
                id: this.generatePatternId(p),
                type: p.type,
                name: p.name,
                category: p.category || 'General',
                frequency: p.frequency || 1,
                confidence: this.calculatePatternConfidence(p),
                description: p.description || '',
                examples: p.examples || [],
                evidence: p.evidence || '',
                sources: p.sources || [p.source],
                learnedFrom: p.learnedFrom || [],
                addedDate: new Date().toISOString()
            }))
        };

        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

        return {
            saved: true,
            filePath,
            patternsCount: patterns.length,
            filename
        };
    }

    /**
     * Load patterns by ID
     */
    async loadPatternById(patternId) {
        const files = await fs.readdir(this.storagePath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        for (const file of jsonFiles) {
            const filePath = path.join(this.storagePath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            const pattern = data.patterns.find(p => p.id === patternId);
            if (pattern) {
                return pattern;
            }
        }

        return null;
    }

    /**
     * Load all patterns
     */
    async loadAllPatterns() {
        try {
            const files = await fs.readdir(this.storagePath);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            const allPatterns = [];

            for (const file of jsonFiles) {
                const filePath = path.join(this.storagePath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);

                allPatterns.push(...data.patterns);
            }

            return allPatterns;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Directory doesn't exist yet
                return [];
            }
            throw error;
        }
    }

    /**
     * Load latest patterns file
     */
    async loadLatestPatterns() {
        try {
            const files = await fs.readdir(this.storagePath);
            const jsonFiles = files
                .filter(f => f.endsWith('.json'))
                .sort()
                .reverse(); // Most recent first

            if (jsonFiles.length === 0) {
                return null;
            }

            const latestFile = jsonFiles[0];
            const filePath = path.join(this.storagePath, latestFile);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            return data;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get patterns by type
     */
    async getPatternsByType(type) {
        const allPatterns = await this.loadAllPatterns();
        return allPatterns.filter(p => p.type === type);
    }

    /**
     * Get high-frequency patterns (for KB addition)
     */
    async getHighFrequencyPatterns(minFrequency = 3) {
        const allPatterns = await this.loadAllPatterns();
        return allPatterns
            .filter(p => p.frequency >= minFrequency)
            .sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * Get patterns by category
     */
    async getPatternsByCategory(category) {
        const allPatterns = await this.loadAllPatterns();
        return allPatterns.filter(p =>
            p.category.toLowerCase().includes(category.toLowerCase())
        );
    }

    /**
     * Search patterns by keyword
     */
    async searchPatterns(keyword) {
        const allPatterns = await this.loadAllPatterns();
        const keywordLower = keyword.toLowerCase();

        return allPatterns.filter(p =>
            p.name.toLowerCase().includes(keywordLower) ||
            p.category.toLowerCase().includes(keywordLower) ||
            p.description.toLowerCase().includes(keywordLower)
        );
    }

    /**
     * Generate unique pattern ID
     */
    generatePatternId(pattern) {
        const base = `${pattern.type}-${pattern.name}`.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''); // Remove leading/trailing dashes

        const hash = this.simpleHash(JSON.stringify({
            type: pattern.type,
            name: pattern.name,
            category: pattern.category
        }));

        return `${base}-${hash}`;
    }

    /**
     * Calculate pattern confidence
     * Based on:
     * - Frequency (70%): Higher frequency = more reliable
     * - Example count (30%): More examples = better documented
     */
    calculatePatternConfidence(pattern) {
        // Factor 1: Frequency score (70%)
        // Frequency >= 10 = 1.0, linear scale below
        const freqScore = Math.min((pattern.frequency || 1) / 10, 1);

        // Factor 2: Example score (30%)
        // 5+ examples = 1.0, linear scale below
        const exampleCount = pattern.examples?.length || 0;
        const exampleScore = Math.min(exampleCount / 5, 1);

        // Weighted average
        const confidence = (freqScore * 0.7 + exampleScore * 0.3);

        // Return as percentage (0-100)
        return Math.round(confidence * 100);
    }

    /**
     * Simple hash function for generating short IDs
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36).substring(0, 6);
    }

    /**
     * Export patterns to JSON file
     */
    async exportPatterns(outputPath, options = {}) {
        const allPatterns = await this.loadAllPatterns();

        // Apply filters if specified
        let filteredPatterns = allPatterns;
        if (options.type) {
            filteredPatterns = filteredPatterns.filter(p => p.type === options.type);
        }
        if (options.minFrequency) {
            filteredPatterns = filteredPatterns.filter(p => p.frequency >= options.minFrequency);
        }
        if (options.minConfidence) {
            filteredPatterns = filteredPatterns.filter(p => p.confidence >= options.minConfidence);
        }

        const exportData = {
            exportedAt: new Date().toISOString(),
            totalPatterns: filteredPatterns.length,
            filters: options,
            patterns: filteredPatterns,
            statistics: {
                byType: this.groupByType(filteredPatterns),
                byFrequency: this.groupByFrequency(filteredPatterns),
                byConfidence: this.groupByConfidence(filteredPatterns)
            }
        };

        await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');

        return {
            exported: true,
            filePath: outputPath,
            patternsCount: filteredPatterns.length
        };
    }

    /**
     * Group patterns by type
     */
    groupByType(patterns) {
        const grouped = {};
        for (const pattern of patterns) {
            grouped[pattern.type] = (grouped[pattern.type] || 0) + 1;
        }
        return grouped;
    }

    /**
     * Group patterns by frequency
     */
    groupByFrequency(patterns) {
        return {
            veryHigh: patterns.filter(p => p.frequency >= 10).length,  // ≥10 occurrences
            high: patterns.filter(p => p.frequency >= 5 && p.frequency < 10).length, // 5-9
            medium: patterns.filter(p => p.frequency >= 3 && p.frequency < 5).length, // 3-4
            low: patterns.filter(p => p.frequency < 3).length  // <3
        };
    }

    /**
     * Group patterns by confidence
     */
    groupByConfidence(patterns) {
        return {
            excellent: patterns.filter(p => p.confidence >= 90).length,  // ≥90%
            good: patterns.filter(p => p.confidence >= 70 && p.confidence < 90).length, // 70-89%
            moderate: patterns.filter(p => p.confidence >= 50 && p.confidence < 70).length, // 50-69%
            low: patterns.filter(p => p.confidence < 50).length  // <50%
        };
    }

    /**
     * Get storage statistics
     */
    async getStatistics() {
        const allPatterns = await this.loadAllPatterns();

        return {
            totalPatterns: allPatterns.length,
            byType: this.groupByType(allPatterns),
            byFrequency: this.groupByFrequency(allPatterns),
            byConfidence: this.groupByConfidence(allPatterns),
            averageFrequency: allPatterns.length > 0
                ? (allPatterns.reduce((sum, p) => sum + p.frequency, 0) / allPatterns.length).toFixed(2)
                : 0,
            averageConfidence: allPatterns.length > 0
                ? (allPatterns.reduce((sum, p) => sum + p.confidence, 0) / allPatterns.length).toFixed(2)
                : 0
        };
    }

    /**
     * Delete old pattern files (keep only last N)
     */
    async cleanupOldFiles(keepCount = 5) {
        const files = await fs.readdir(this.storagePath);
        const jsonFiles = files
            .filter(f => f.endsWith('.json') && f.startsWith('patterns-'))
            .sort()
            .reverse(); // Most recent first

        if (jsonFiles.length <= keepCount) {
            return { deleted: 0, kept: jsonFiles.length };
        }

        const filesToDelete = jsonFiles.slice(keepCount);
        let deleted = 0;

        for (const file of filesToDelete) {
            const filePath = path.join(this.storagePath, file);
            await fs.unlink(filePath);
            deleted++;
        }

        return { deleted, kept: keepCount };
    }

    /**
     * Merge duplicate patterns
     * If two patterns have same type and name, merge them
     */
    async mergeDuplicates() {
        const allPatterns = await this.loadAllPatterns();
        const merged = new Map();

        for (const pattern of allPatterns) {
            const key = `${pattern.type}:${pattern.name}`;

            if (merged.has(key)) {
                const existing = merged.get(key);

                // Merge frequency (sum)
                existing.frequency = (existing.frequency || 1) + (pattern.frequency || 1);

                // Merge examples (unique)
                existing.examples = [...new Set([
                    ...(existing.examples || []),
                    ...(pattern.examples || [])
                ])];

                // Merge sources (unique)
                existing.sources = [...new Set([
                    ...(existing.sources || []),
                    ...(pattern.sources || [])
                ])];

                // Update confidence (recalculate)
                existing.confidence = this.calculatePatternConfidence(existing);
            } else {
                merged.set(key, { ...pattern });
            }
        }

        return Array.from(merged.values());
    }
}

module.exports = { PatternStorage };
