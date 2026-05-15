/**
 * KBUpdater - Updates Knowledge Base files with learned patterns
 * Week 6 Day 3: Knowledge Base Integration
 *
 * Responsibilities:
 * - Merge extracted patterns into existing KB files
 * - Create backup before updates
 * - Version increment (semantic versioning)
 * - Validate schema compliance
 * - Prevent duplicate patterns
 * - Track learning source and metadata
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class KBUpdater {
    constructor(kbPath) {
        this.kbPath = kbPath || path.join(__dirname, 'knowledge-base');
        this.backupPath = path.join(this.kbPath, '.backups');
    }

    /**
     * Create backup of KB files before update
     */
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const backupDir = path.join(this.backupPath, timestamp);

        try {
            await fs.mkdir(backupDir, { recursive: true });

            // Backup all JSON files
            const files = await fs.readdir(this.kbPath);
            const jsonFiles = files.filter(f => f.endsWith('.json') && f.endsWith('-kb.json'));

            for (const file of jsonFiles) {
                const sourcePath = path.join(this.kbPath, file);
                const backupFilePath = path.join(backupDir, file);
                await fs.copyFile(sourcePath, backupFilePath);
            }

            // Cleanup old backups (keep last 5)
            await this.cleanupOldBackups(5);

            return {
                success: true,
                backupDir,
                filesBackedUp: jsonFiles.length
            };
        } catch (error) {
            throw new Error(`Backup failed: ${error.message}`);
        }
    }

    /**
     * Cleanup old backup directories (keep only last N)
     */
    async cleanupOldBackups(keepCount = 5) {
        try {
            const backups = await fs.readdir(this.backupPath);
            const sortedBackups = backups.sort().reverse(); // Most recent first

            if (sortedBackups.length <= keepCount) {
                return { deleted: 0, kept: sortedBackups.length };
            }

            const toDelete = sortedBackups.slice(keepCount);
            let deleted = 0;

            for (const backup of toDelete) {
                const backupPath = path.join(this.backupPath, backup);
                await fs.rm(backupPath, { recursive: true, force: true });
                deleted++;
            }

            return { deleted, kept: keepCount };
        } catch (error) {
            console.warn('Cleanup warning:', error.message);
            return { deleted: 0, kept: 0 };
        }
    }

    /**
     * Load KB file
     */
    async loadKB(filename) {
        const filePath = path.join(this.kbPath, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }

    /**
     * Save KB file
     */
    async saveKB(filename, kb) {
        const filePath = path.join(this.kbPath, filename);
        await fs.writeFile(filePath, JSON.stringify(kb, null, 2), 'utf-8');
    }

    /**
     * Check if pattern already exists in KB
     */
    patternExists(kb, patternKey) {
        return kb.hasOwnProperty(patternKey) && patternKey !== 'metadata';
    }

    /**
     * Increment semantic version
     */
    incrementVersion(version, changeType = 'MINOR') {
        const [major, minor, patch] = version.split('.').map(Number);

        if (changeType === 'MAJOR') {
            return `${major + 1}.0.0`;
        } else if (changeType === 'MINOR') {
            return `${major}.${minor + 1}.0`;
        } else if (changeType === 'PATCH') {
            return `${major}.${minor}.${patch + 1}`;
        }

        return version;
    }

    /**
     * Update backend-kb.json with learned patterns
     */
    async updateBackendKB(newPatterns = []) {
        const filename = 'backend-kb.json';
        const kb = await this.loadKB(filename);

        let patternsAdded = 0;
        const addedDate = new Date().toISOString().substring(0, 10);

        // Add new patterns
        for (const pattern of newPatterns) {
            const key = this.generateKBKey(pattern.name);

            if (this.patternExists(kb, key)) {
                console.log(`Pattern '${key}' already exists, skipping`);
                continue;
            }

            kb[key] = {
                description: pattern.description || pattern.name,
                approved_pattern: pattern.approved_pattern || pattern.name,
                rejected_patterns: pattern.rejected_patterns || [],
                rationale: pattern.rationale || '',
                do: pattern.do || [],
                dont: pattern.dont || [],
                examples: pattern.examples || [],
                violations: pattern.violations || [],
                keywords: pattern.keywords || [],
                learned_from: pattern.source || 'memory-enhancement',
                added_date: addedDate,
                frequency: pattern.frequency || 0,
                confidence: pattern.confidence || 0
            };

            patternsAdded++;
        }

        // Update metadata
        if (patternsAdded > 0) {
            kb.metadata.version = this.incrementVersion(kb.metadata.version, 'MINOR');
            kb.metadata.token_cost = this.estimateTokenCost(kb);
            kb.metadata.last_updated = addedDate;
        }

        await this.saveKB(filename, kb);

        return {
            success: true,
            file: filename,
            patternsAdded,
            newVersion: kb.metadata.version,
            tokenCost: kb.metadata.token_cost
        };
    }

    /**
     * Update frontend-kb.json with learned patterns
     */
    async updateFrontendKB(newPatterns = []) {
        const filename = 'frontend-kb.json';
        const kb = await this.loadKB(filename);

        let patternsAdded = 0;
        const addedDate = new Date().toISOString().substring(0, 10);

        for (const pattern of newPatterns) {
            const key = this.generateKBKey(pattern.name);

            if (this.patternExists(kb, key)) {
                console.log(`Pattern '${key}' already exists, skipping`);
                continue;
            }

            kb[key] = {
                description: pattern.description || pattern.name,
                approved_pattern: pattern.approved_pattern || pattern.name,
                rejected_patterns: pattern.rejected_patterns || [],
                rationale: pattern.rationale || '',
                do: pattern.do || [],
                dont: pattern.dont || [],
                examples: pattern.examples || [],
                violations: pattern.violations || [],
                keywords: pattern.keywords || [],
                learned_from: pattern.source || 'memory-enhancement',
                added_date: addedDate,
                frequency: pattern.frequency || 0,
                confidence: pattern.confidence || 0
            };

            patternsAdded++;
        }

        if (patternsAdded > 0) {
            kb.metadata.version = this.incrementVersion(kb.metadata.version, 'MINOR');
            kb.metadata.token_cost = this.estimateTokenCost(kb);
            kb.metadata.last_updated = addedDate;
        }

        await this.saveKB(filename, kb);

        return {
            success: true,
            file: filename,
            patternsAdded,
            newVersion: kb.metadata.version,
            tokenCost: kb.metadata.token_cost
        };
    }

    /**
     * Update database-kb.json with learned patterns
     */
    async updateDatabaseKB(newPatterns = []) {
        const filename = 'database-kb.json';
        const kb = await this.loadKB(filename);

        let patternsAdded = 0;
        const addedDate = new Date().toISOString().substring(0, 10);

        for (const pattern of newPatterns) {
            const key = this.generateKBKey(pattern.name);

            if (this.patternExists(kb, key)) {
                console.log(`Pattern '${key}' already exists, skipping`);
                continue;
            }

            kb[key] = {
                description: pattern.description || pattern.name,
                approved_pattern: pattern.approved_pattern || pattern.name,
                rejected_patterns: pattern.rejected_patterns || [],
                rationale: pattern.rationale || '',
                do: pattern.do || [],
                dont: pattern.dont || [],
                examples: pattern.examples || [],
                violations: pattern.violations || [],
                keywords: pattern.keywords || [],
                learned_from: pattern.source || 'memory-enhancement',
                added_date: addedDate,
                frequency: pattern.frequency || 0,
                confidence: pattern.confidence || 0
            };

            patternsAdded++;
        }

        if (patternsAdded > 0) {
            kb.metadata.version = this.incrementVersion(kb.metadata.version, 'MINOR');
            kb.metadata.token_cost = this.estimateTokenCost(kb);
            kb.metadata.last_updated = addedDate;
        }

        await this.saveKB(filename, kb);

        return {
            success: true,
            file: filename,
            patternsAdded,
            newVersion: kb.metadata.version,
            tokenCost: kb.metadata.token_cost
        };
    }

    /**
     * Create new KB file (for architecture, testing, implementation)
     */
    async createNewKB(filename, metadata, patterns) {
        const kb = {
            metadata: {
                version: '1.0.0',
                technology: metadata.technology || 'Framework-agnostic',
                token_cost: 0,
                created: new Date().toISOString().substring(0, 10),
                learned_from: metadata.learnedFrom || 'Week 0, 1, 2, 3 successful plans'
            }
        };

        const addedDate = new Date().toISOString().substring(0, 10);

        // Add patterns
        for (const pattern of patterns) {
            const key = this.generateKBKey(pattern.name);

            kb[key] = {
                description: pattern.description || pattern.name,
                approved_pattern: pattern.approved_pattern || pattern.name,
                rejected_patterns: pattern.rejected_patterns || [],
                rationale: pattern.rationale || '',
                do: pattern.do || [],
                dont: pattern.dont || [],
                examples: pattern.examples || [],
                violations: pattern.violations || [],
                keywords: pattern.keywords || [],
                learned_from: pattern.source || 'memory-enhancement',
                added_date: addedDate,
                frequency: pattern.frequency || 0,
                confidence: pattern.confidence || 0
            };
        }

        // Estimate token cost
        kb.metadata.token_cost = this.estimateTokenCost(kb);

        await this.saveKB(filename, kb);

        return {
            success: true,
            file: filename,
            patternsAdded: patterns.length,
            version: kb.metadata.version,
            tokenCost: kb.metadata.token_cost
        };
    }

    /**
     * Generate KB key from pattern name
     * Example: "Constructor Injection" → "constructor_injection"
     */
    generateKBKey(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_');
    }

    /**
     * Estimate token cost of KB file
     * Rough estimate: 1 word ≈ 1.3 tokens
     */
    estimateTokenCost(kb) {
        const jsonStr = JSON.stringify(kb, null, 2);
        const wordCount = jsonStr.split(/\s+/).length;
        return Math.round(wordCount * 1.3);
    }

    /**
     * Validate KB schema compliance
     */
    validateKB(kb) {
        const errors = [];

        // Check metadata
        if (!kb.metadata) {
            errors.push('Missing metadata');
        } else {
            if (!kb.metadata.version) errors.push('Missing metadata.version');
            if (!kb.metadata.technology) errors.push('Missing metadata.technology');
        }

        // Check each pattern section
        for (const [key, value] of Object.entries(kb)) {
            if (key === 'metadata') continue;

            if (!value.description) errors.push(`${key}: Missing description`);
            if (!value.approved_pattern) errors.push(`${key}: Missing approved_pattern`);
            if (!Array.isArray(value.rejected_patterns)) errors.push(`${key}: rejected_patterns must be array`);
            if (!Array.isArray(value.do)) errors.push(`${key}: do must be array`);
            if (!Array.isArray(value.dont)) errors.push(`${key}: dont must be array`);
            if (!Array.isArray(value.examples)) errors.push(`${key}: examples must be array`);
            if (!Array.isArray(value.keywords)) errors.push(`${key}: keywords must be array`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get KB statistics
     */
    async getKBStats(filename) {
        const kb = await this.loadKB(filename);

        const patterns = Object.keys(kb).filter(k => k !== 'metadata');
        const examples = patterns.reduce((sum, key) => sum + (kb[key].examples?.length || 0), 0);

        return {
            file: filename,
            version: kb.metadata.version,
            technology: kb.metadata.technology,
            patterns: patterns.length,
            examples,
            tokenCost: kb.metadata.token_cost || this.estimateTokenCost(kb)
        };
    }
}

module.exports = { KBUpdater };
