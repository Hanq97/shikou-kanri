/**
 * Session Memory Manager
 * セッションメモリマネージャ
 * Quản Lý Bộ Nhớ Phiên
 *
 * Purpose: Cross-plan context storage with TTL and size limits
 * 目的：TTLとサイズ制限を備えたクロスプラン コンテキストストレージ
 * Mục đích: Lưu trữ ngữ cảnh cross-plan với TTL và giới hạn kích thước
 *
 * Features:
 * - Cross-plan context storage
 * - Memory key management
 * - Context expiration (TTL)
 * - Memory size limits
 * - Automatic cleanup
 *
 * Version: 1.0.0
 * Created: 2025-12-27
 */

class SessionMemory {
    constructor(options = {}) {
        this.config = {
            maxMemorySize: 100,              // Maximum number of stored contexts
            defaultTTL: 3600000,             // Default 1 hour TTL (ms)
            cleanupInterval: 300000,         // Cleanup every 5 minutes
            maxContextSize: 100000,          // Max 100KB per context
            enableCompression: false,        // Future: enable compression
            ...options
        };

        // Storage
        this.memory = new Map();             // key → { data, metadata }

        // Metadata tracking
        this.metadata = {
            totalStores: 0,
            totalRetrieves: 0,
            totalExpired: 0,
            totalEvicted: 0,
            hitRate: 0.0,
            avgContextSize: 0
        };

        // Start cleanup timer
        this.cleanupTimer = setInterval(() => {
            this._cleanup();
        }, this.config.cleanupInterval);

        console.log('[SessionMemory] Initialized');
        console.log(`[SessionMemory] Config: maxSize=${this.config.maxMemorySize}, TTL=${this.config.defaultTTL}ms`);
    }

    /**
     * Store context in session memory
     *
     * @param {string} key - Unique memory key
     * @param {any} data - Context data to store
     * @param {Object} options - Storage options { ttl, tags, planId }
     * @returns {Object} - Storage result
     */
    save(key, data, options = {}) {
        console.log(`[SessionMemory] Saving: ${key}`);

        // Validate key
        if (!key || typeof key !== 'string') {
            throw new Error('Key must be a non-empty string');
        }

        // Check data size
        const dataSize = this._estimateSize(data);
        if (dataSize > this.config.maxContextSize) {
            throw new Error(`Context size (${dataSize}) exceeds maximum (${this.config.maxContextSize})`);
        }

        // Check capacity and evict if needed
        if (this.memory.size >= this.config.maxMemorySize && !this.memory.has(key)) {
            this._evictOldest();
        }

        // Store with metadata
        const ttl = options.ttl || this.config.defaultTTL;
        const entry = {
            data: data,
            metadata: {
                key: key,
                planId: options.planId || null,
                tags: options.tags || [],
                size: dataSize,
                createdAt: Date.now(),
                expiresAt: Date.now() + ttl,
                accessCount: 0,
                lastAccessedAt: null
            }
        };

        this.memory.set(key, entry);
        this.metadata.totalStores++;
        this.metadata.avgContextSize = (this.metadata.avgContextSize * (this.metadata.totalStores - 1) + dataSize) / this.metadata.totalStores;

        console.log(`[SessionMemory] Stored ${key} (${dataSize} bytes, TTL: ${ttl}ms)`);

        return {
            key: key,
            size: dataSize,
            expiresAt: new Date(entry.metadata.expiresAt).toISOString()
        };
    }

    /**
     * Retrieve context from session memory
     *
     * @param {string} key - Memory key
     * @param {Object} options - Retrieval options { extendTTL }
     * @returns {any|null} - Stored data or null if not found/expired
     */
    retrieve(key, options = {}) {
        console.log(`[SessionMemory] Retrieving: ${key}`);

        this.metadata.totalRetrieves++;

        const entry = this.memory.get(key);

        if (!entry) {
            console.log(`[SessionMemory] Key not found: ${key}`);
            this._updateHitRate(false);
            return null;
        }

        // Check expiration
        if (Date.now() > entry.metadata.expiresAt) {
            console.log(`[SessionMemory] Key expired: ${key}`);
            this.memory.delete(key);
            this.metadata.totalExpired++;
            this._updateHitRate(false);
            return null;
        }

        // Update access metadata
        entry.metadata.accessCount++;
        entry.metadata.lastAccessedAt = Date.now();

        // Extend TTL if requested
        if (options.extendTTL) {
            const extension = options.extendTTL === true ? this.config.defaultTTL : options.extendTTL;
            entry.metadata.expiresAt = Date.now() + extension;
            console.log(`[SessionMemory] Extended TTL for ${key} by ${extension}ms`);
        }

        this._updateHitRate(true);
        console.log(`[SessionMemory] Retrieved ${key} (accessed ${entry.metadata.accessCount} times)`);

        return entry.data;
    }

    /**
     * Delete context from session memory
     *
     * @param {string} key - Memory key
     * @returns {boolean} - True if deleted, false if not found
     */
    delete(key) {
        console.log(`[SessionMemory] Deleting: ${key}`);

        const existed = this.memory.delete(key);

        if (existed) {
            console.log(`[SessionMemory] Deleted ${key}`);
        } else {
            console.log(`[SessionMemory] Key not found: ${key}`);
        }

        return existed;
    }

    /**
     * Check if key exists and is not expired
     *
     * @param {string} key - Memory key
     * @returns {boolean} - True if exists and valid
     */
    has(key) {
        const entry = this.memory.get(key);

        if (!entry) {
            return false;
        }

        if (Date.now() > entry.metadata.expiresAt) {
            this.memory.delete(key);
            this.metadata.totalExpired++;
            return false;
        }

        return true;
    }

    /**
     * Get all keys for a specific plan
     *
     * @param {string} planId - Plan identifier
     * @returns {Array<string>} - Array of keys
     */
    getKeysByPlan(planId) {
        const keys = [];

        for (const [key, entry] of this.memory.entries()) {
            if (entry.metadata.planId === planId) {
                // Check expiration
                if (Date.now() <= entry.metadata.expiresAt) {
                    keys.push(key);
                }
            }
        }

        return keys;
    }

    /**
     * Get all keys with a specific tag
     *
     * @param {string} tag - Tag to search for
     * @returns {Array<string>} - Array of keys
     */
    getKeysByTag(tag) {
        const keys = [];

        for (const [key, entry] of this.memory.entries()) {
            if (entry.metadata.tags.includes(tag)) {
                // Check expiration
                if (Date.now() <= entry.metadata.expiresAt) {
                    keys.push(key);
                }
            }
        }

        return keys;
    }

    /**
     * Clear all memory for a specific plan
     *
     * @param {string} planId - Plan identifier
     * @returns {number} - Number of keys deleted
     */
    clearPlan(planId) {
        console.log(`[SessionMemory] Clearing plan: ${planId}`);

        const keysToDelete = this.getKeysByPlan(planId);

        for (const key of keysToDelete) {
            this.memory.delete(key);
        }

        console.log(`[SessionMemory] Cleared ${keysToDelete.length} keys for plan ${planId}`);

        return keysToDelete.length;
    }

    /**
     * Clear all memory
     *
     * @returns {number} - Number of keys deleted
     */
    clearAll() {
        console.log('[SessionMemory] Clearing all memory');

        const count = this.memory.size;
        this.memory.clear();

        console.log(`[SessionMemory] Cleared ${count} keys`);

        return count;
    }

    /**
     * Get memory statistics
     *
     * @returns {Object} - Statistics object
     */
    getStats() {
        return {
            ...this.metadata,
            currentSize: this.memory.size,
            maxSize: this.config.maxMemorySize,
            utilizationRate: (this.memory.size / this.config.maxMemorySize * 100).toFixed(2) + '%'
        };
    }

    /**
     * Get all keys currently in memory
     *
     * @returns {Array<string>} - Array of all valid keys
     */
    getAllKeys() {
        const keys = [];

        for (const [key, entry] of this.memory.entries()) {
            // Check expiration
            if (Date.now() <= entry.metadata.expiresAt) {
                keys.push(key);
            }
        }

        return keys;
    }

    /**
     * Cleanup method to remove expired entries
     */
    destroy() {
        console.log('[SessionMemory] Destroying session memory');

        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        this.memory.clear();
        console.log('[SessionMemory] Destroyed');
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Cleanup expired entries
     */
    _cleanup() {
        const now = Date.now();
        let expiredCount = 0;

        for (const [key, entry] of this.memory.entries()) {
            if (now > entry.metadata.expiresAt) {
                this.memory.delete(key);
                expiredCount++;
            }
        }

        if (expiredCount > 0) {
            console.log(`[SessionMemory] Cleanup: removed ${expiredCount} expired entries`);
            this.metadata.totalExpired += expiredCount;
        }
    }

    /**
     * Evict oldest entry to make room
     */
    _evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.memory.entries()) {
            const lastAccess = entry.metadata.lastAccessedAt || entry.metadata.createdAt;
            if (lastAccess < oldestTime) {
                oldestTime = lastAccess;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            console.log(`[SessionMemory] Evicting oldest entry: ${oldestKey}`);
            this.memory.delete(oldestKey);
            this.metadata.totalEvicted++;
        }
    }

    /**
     * Estimate size of data in bytes
     *
     * @param {any} data - Data to estimate
     * @returns {number} - Estimated size in bytes
     */
    _estimateSize(data) {
        const str = JSON.stringify(data);
        return new Blob([str]).size;
    }

    /**
     * Update hit rate statistic
     *
     * @param {boolean} hit - True if cache hit, false if miss
     */
    _updateHitRate(hit) {
        const total = this.metadata.totalRetrieves;
        const hits = hit ?
            Math.round(this.metadata.hitRate * (total - 1) / 100) + 1 :
            Math.round(this.metadata.hitRate * (total - 1) / 100);

        this.metadata.hitRate = (hits / total * 100).toFixed(2);
    }
}

module.exports = SessionMemory;
