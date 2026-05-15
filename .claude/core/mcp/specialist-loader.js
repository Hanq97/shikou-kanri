/**
 * Specialist Loader - Dynamic specialist discovery from _INDEX.md files
 *
 * Features:
 * - Scan specialists/code/ directories
 * - Load all *INDEX*.md files
 * - Build specialist registry with metadata
 * - Support keyword-based routing
 * - Fallback to hardcoded paths if needed
 *
 * Architecture:
 * - Phase 4: Specialist Refactoring Integration
 * - Groups 2-6: 49+ specialists (app-router, repositories, providers, core, orchestrators)
 * - Index-based loading for zero maintenance
 */

const fs = require('fs');
const path = require('path');

class SpecialistLoader {
    constructor() {
        this.specialistsDir = path.join(process.cwd(), '.claude/agents/specialists');
        this.registry = new Map();
        this.keywordMap = new Map();
        this.loaded = false;
    }

    /**
     * Load all specialists from *INDEX*.md files
     */
    loadSpecialists() {
        if (this.loaded) {
            console.log('[SpecialistLoader] Already loaded, skipping...');
            return;
        }

        console.log('[SpecialistLoader] Scanning specialists directory...');

        // Find all *INDEX*.md files
        const indexFiles = this.findIndexFiles(this.specialistsDir);
        console.log(`[SpecialistLoader] Found ${indexFiles.length} INDEX files`);

        // Parse each index file
        for (const indexPath of indexFiles) {
            this.parseIndexFile(indexPath);
        }

        this.loaded = true;
        console.log(`[SpecialistLoader] Loaded ${this.registry.size} specialists`);
        console.log(`[SpecialistLoader] Mapped ${this.keywordMap.size} keywords`);
    }

    /**
     * Find all *INDEX*.md files recursively
     */
    findIndexFiles(dir) {
        const indexFiles = [];

        const scan = (currentDir) => {
            if (!fs.existsSync(currentDir)) {
                return;
            }

            const files = fs.readdirSync(currentDir);

            for (const file of files) {
                const fullPath = path.join(currentDir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory() && !file.startsWith('.')) {
                    scan(fullPath);
                } else if (file.toUpperCase().includes('INDEX') && file.endsWith('.md')) {
                    indexFiles.push(fullPath);
                }
            }
        };

        scan(dir);
        return indexFiles;
    }

    /**
     * Parse *INDEX*.md file to extract specialist metadata
     */
    parseIndexFile(indexPath) {
        const content = fs.readFileSync(indexPath, 'utf8');
        const dirName = path.dirname(indexPath);

        console.log(`[SpecialistLoader] Parsing ${path.basename(indexPath)}...`);

        // Extract specialist file references from markdown
        // Format variations:
        // 1. **[file-name.md](./file-name.md)** (123 lines)
        // 2. | file-name.md | 123 | ...
        // 3. - **[file-name.md](./file-name.md)**

        // Pattern 1: Markdown links with file size
        const linkPattern = /\*\*\[(.*?\.md)\]\(\.\/(.*?\.md)\)\*\*(?:\s+\((\d+)\s+lines?\))?/g;
        let match;

        while ((match = linkPattern.exec(content)) !== null) {
            const fileName = match[2];
            const fullPath = path.join(dirName, fileName);

            if (fs.existsSync(fullPath)) {
                const metadata = this.extractMetadata(content, fileName);
                this.registerSpecialist(fileName, fullPath, metadata);
            }
        }

        // Pattern 2: Table format
        const tablePattern = /\|\s*([a-zA-Z0-9_-]+\.md)\s*\|\s*(\d+)\s*\|/g;
        while ((match = tablePattern.exec(content)) !== null) {
            const fileName = match[1];
            const fullPath = path.join(dirName, fileName);

            if (fs.existsSync(fullPath)) {
                const metadata = this.extractMetadata(content, fileName);
                this.registerSpecialist(fileName, fullPath, metadata);
            }
        }
    }

    /**
     * Register specialist in registry and keyword map
     */
    registerSpecialist(fileName, fullPath, metadata) {
        // Skip if already registered
        if (this.registry.has(fileName)) {
            return;
        }

        this.registry.set(fileName, {
            path: fullPath,
            fileName: fileName,
            category: metadata.category,
            patterns: metadata.patterns,
            keywords: metadata.keywords,
            technologies: metadata.technologies,
            description: metadata.description
        });

        // Map keywords to specialist
        if (metadata.keywords) {
            for (const keyword of metadata.keywords) {
                const lowerKeyword = keyword.toLowerCase();
                if (!this.keywordMap.has(lowerKeyword)) {
                    this.keywordMap.set(lowerKeyword, []);
                }
                this.keywordMap.get(lowerKeyword).push(fileName);
            }
        }

        // Map technologies to specialist
        if (metadata.technologies) {
            for (const tech of metadata.technologies) {
                const lowerTech = tech.toLowerCase();
                if (!this.keywordMap.has(lowerTech)) {
                    this.keywordMap.set(lowerTech, []);
                }
                this.keywordMap.get(lowerTech).push(fileName);
            }
        }

        // Map patterns to specialist
        if (metadata.patterns) {
            for (const pattern of metadata.patterns) {
                const lowerPattern = pattern.toLowerCase();
                if (!this.keywordMap.has(lowerPattern)) {
                    this.keywordMap.set(lowerPattern, []);
                }
                this.keywordMap.get(lowerPattern).push(fileName);
            }
        }
    }

    /**
     * Extract metadata for a specialist file from index content
     */
    extractMetadata(content, fileName) {
        const metadata = {
            category: null,
            patterns: [],
            keywords: [],
            technologies: [],
            description: ''
        };

        // Find section for this file (look for file name in various formats)
        const fileNameEscaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sectionPattern = new RegExp(
            `(?:^|\\n)(?:#{1,6}\\s+|\\d+\\.\\s+)?.*?${fileNameEscaped}[^\\n]*\\n([\\s\\S]{0,500})`,
            'i'
        );
        const match = content.match(sectionPattern);

        if (match) {
            const section = match[1];

            // Extract description (first line or bullet)
            const descMatch = section.match(/^\s*-?\s*(.+?)(?:\n|$)/);
            if (descMatch) {
                metadata.description = descMatch[1].trim();
            }

            // Extract patterns (Pattern X.Y, Pattern X.Y-X.Z)
            const patternMatches = section.matchAll(/Pattern\s+([\d.]+(?:-[\d.]+)?)/gi);
            for (const pm of patternMatches) {
                metadata.patterns.push(pm[1]);
            }

            // Extract keywords from description and section
            const keywordSources = [
                section.match(/Keywords?:\s*([^\n]+)/i),
                section.match(/Tags?:\s*([^\n]+)/i)
            ];

            for (const ks of keywordSources) {
                if (ks) {
                    const keywords = ks[1].split(/[,;]/).map(k => k.trim()).filter(k => k.length > 0);
                    metadata.keywords.push(...keywords);
                }
            }

            // Extract technologies
            const techMatch = section.match(/Technolog(?:y|ies):\s*([^\n]+)/i);
            if (techMatch) {
                const techs = techMatch[1].split(/[,;]/).map(t => t.trim()).filter(t => t.length > 0);
                metadata.technologies.push(...techs);
            }

            // Infer keywords from description
            const descKeywords = this.inferKeywordsFromDescription(metadata.description);
            metadata.keywords.push(...descKeywords);
        }

        // Infer category from file name
        metadata.category = this.inferCategory(fileName);

        // Remove duplicates
        metadata.keywords = [...new Set(metadata.keywords)];
        metadata.technologies = [...new Set(metadata.technologies)];
        metadata.patterns = [...new Set(metadata.patterns)];

        return metadata;
    }

    /**
     * Infer keywords from description text
     */
    inferKeywordsFromDescription(description) {
        const keywords = [];
        const lowerDesc = description.toLowerCase();

        // Common technology keywords
        const techKeywords = [
            'fastapi', 'langgraph', 'react', 'next.js', 'typescript',
            'postgres', 'neo4j', 'qdrant', 'redis', 'kafka',
            'jwt', 'oauth', 'bcrypt', 'encryption', 'validation',
            'repository', 'service', 'controller', 'middleware',
            'export', 'import', 'filter', 'pagination', 'sort',
            'theme', 'language', 'notification', 'keyboard',
            'llm', 'vlm', 'embedding', 'voice', 'openai', 'anthropic'
        ];

        for (const keyword of techKeywords) {
            if (lowerDesc.includes(keyword)) {
                keywords.push(keyword);
            }
        }

        return keywords;
    }

    /**
     * Infer category from specialist filename
     */
    inferCategory(fileName) {
        const lowerName = fileName.toLowerCase();

        if (lowerName.includes('frontend') || lowerName.includes('react') ||
            lowerName.includes('next') || lowerName.includes('component') ||
            lowerName.includes('widget') || lowerName.includes('feature') ||
            lowerName.includes('page') || lowerName.includes('app-')) {
            return 'frontend';
        }

        if (lowerName.includes('backend') || lowerName.includes('fastapi') ||
            lowerName.includes('repository') || lowerName.includes('provider') ||
            lowerName.includes('service') || lowerName.includes('api') ||
            lowerName.includes('core-')) {
            return 'backend';
        }

        if (lowerName.includes('database') || lowerName.includes('postgres') ||
            lowerName.includes('neo4j') || lowerName.includes('qdrant') ||
            lowerName.includes('redis')) {
            return 'database';
        }

        if (lowerName.includes('orchestrator') || lowerName.includes('langgraph') ||
            lowerName.includes('agent')) {
            return 'orchestration';
        }

        return 'unknown';
    }

    /**
     * Find specialist by keyword
     * @param {string} keyword - Keyword to search
     * @returns {Array<string>} - Array of specialist file names
     */
    findByKeyword(keyword) {
        if (!this.loaded) {
            this.loadSpecialists();
        }

        const lowerKeyword = keyword.toLowerCase();
        return this.keywordMap.get(lowerKeyword) || [];
    }

    /**
     * Get specialist path by filename
     * @param {string} fileName - Specialist file name
     * @returns {string|null} - Full path to specialist or null
     */
    getPath(fileName) {
        if (!this.loaded) {
            this.loadSpecialists();
        }

        const specialist = this.registry.get(fileName);
        return specialist ? specialist.path : null;
    }

    /**
     * List all specialists
     * @returns {Array<object>} - Array of specialist metadata
     */
    listAll() {
        if (!this.loaded) {
            this.loadSpecialists();
        }

        return Array.from(this.registry.values());
    }

    /**
     * Get statistics
     * @returns {object} - Statistics about loaded specialists
     */
    getStatistics() {
        if (!this.loaded) {
            this.loadSpecialists();
        }

        const categories = {};
        for (const specialist of this.registry.values()) {
            const cat = specialist.category || 'unknown';
            categories[cat] = (categories[cat] || 0) + 1;
        }

        return {
            totalSpecialists: this.registry.size,
            totalKeywords: this.keywordMap.size,
            categories: categories,
            loaded: this.loaded
        };
    }
}

module.exports = SpecialistLoader;

// CLI usage for testing
if (require.main === module) {
    const loader = new SpecialistLoader();
    loader.loadSpecialists();

    console.log('\n=== Specialist Loader Statistics ===\n');
    const stats = loader.getStatistics();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n=== Sample Specialists ===\n');
    const all = loader.listAll();
    all.slice(0, 5).forEach(s => {
        console.log(`- ${s.fileName}`);
        console.log(`  Category: ${s.category}`);
        console.log(`  Patterns: ${s.patterns.join(', ')}`);
        console.log(`  Keywords: ${s.keywords.slice(0, 5).join(', ')}...`);
        console.log('');
    });
}
