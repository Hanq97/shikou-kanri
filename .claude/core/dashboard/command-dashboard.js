#!/usr/bin/env node

/**
 * CommandDashboard - EPS Command Registry and Usage Statistics
 *
 * Provides centralized view of all EPS commands with:
 * - Command registry with 7 categories
 * - Real-time usage statistics
 * - Performance metrics visualization
 * - Detailed command help with examples
 *
 * Version: 3.7.0
 * Created: 2025-12-24
 */

const fs = require('fs').promises;
const path = require('path');

class CommandDashboard {
    constructor(options = {}) {
        this.config = {
            commandsDir: options.commandsDir || path.join(__dirname, '..', 'commands'),
            historyPath: options.historyPath || path.join(__dirname, '..', 'memory-bank', 'command-history.json'),
            confidenceHistoryPath: options.confidenceHistoryPath || path.join(__dirname, '..', 'memory-bank', 'confidence-history.json'),
            ...options
        };

        this.commands = [];
        this.history = null;
        this.confidenceHistory = null;

        // Command categories
        this.categories = {
            workflow: { icon: '📋', label: 'WORKFLOW COMMANDS', color: '\x1b[36m' },
            review: { icon: '🔍', label: 'REVIEW COMMANDS', color: '\x1b[32m', badge: '⭐ NEW' },
            optimization: { icon: '⚡', label: 'OPTIMIZATION COMMANDS', color: '\x1b[33m', badge: '⭐ NEW' },
            versioning: { icon: '📦', label: 'VERSIONING COMMANDS', color: '\x1b[35m', badge: '⭐ NEW' },
            memory: { icon: '💾', label: 'MEMORY COMMANDS', color: '\x1b[34m' },
            design: { icon: '🎨', label: 'DESIGN COMMANDS', color: '\x1b[36m' },
            utility: { icon: '🛠️', label: 'UTILITY COMMANDS', color: '\x1b[37m' }
        };
    }

    /**
     * Load all command files from commands/
     */
    async loadCommands() {
        try {
            const files = await fs.readdir(this.config.commandsDir);
            const commandFiles = files.filter(f => f.endsWith('.md'));

            this.commands = [];
            for (const file of commandFiles) {
                const filePath = path.join(this.config.commandsDir, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const command = this.parseCommand(content, file);
                if (command) {
                    this.commands.push(command);
                }
            }

            return this.commands;
        } catch (error) {
            console.error('Error loading commands:', error.message);
            return [];
        }
    }

    /**
     * Parse command metadata from markdown file
     */
    parseCommand(content, filename) {
        const lines = content.split('\n');

        // Extract command name from first h1 heading
        const nameMatch = content.match(/^#\s+\/?([a-z-]+)/m);
        if (!nameMatch) return null;

        const name = '/' + nameMatch[1];

        // Extract description (first line after name)
        const descMatch = content.match(/^#[^\n]+\n([^\n]+)/m);
        const description = descMatch ? descMatch[1].trim() : '';

        // Determine category based on command name or content
        const category = this.detectCategory(name, content);

        // Extract parameters (look for ## Parameters or ## 📥 PARAMETERS section)
        const params = this.extractParameters(content);

        // Extract examples (look for ## Examples or ## 💡 EXAMPLES section)
        const examples = this.extractExamples(content);

        // Extract related commands
        const related = this.extractRelatedCommands(content);

        return {
            name,
            description,
            category,
            parameters: params,
            examples,
            relatedCommands: related,
            filePath: filename
        };
    }

    /**
     * Detect command category from name and content
     */
    detectCategory(name, content) {
        if (name.includes('plan-review')) return 'review';
        if (name.includes('plan-optimize')) return 'optimization';
        if (name.includes('plan-version')) return 'versioning';
        if (['research', 'innovate', 'plan', 'execute', 'validate', 'workflow'].some(cmd => name.includes(cmd))) {
            return 'workflow';
        }
        if (['save', 'recall', 'list'].some(cmd => name.includes(cmd))) {
            return 'memory';
        }
        if (name.includes('design')) return 'design';
        return 'utility';
    }

    /**
     * Extract parameters from markdown content
     */
    extractParameters(content) {
        const params = [];
        const paramSectionMatch = content.match(/##\s+.*PARAMETERS?.*\n([\s\S]*?)(?=\n##|$)/i);

        if (paramSectionMatch) {
            const paramSection = paramSectionMatch[1];
            // Match table rows like: | `planPath` | string | ✅ Yes | - | Path to plan file |
            const tableRows = paramSection.match(/\|[^\n]+\|/g) || [];

            for (const row of tableRows) {
                if (row.includes('Parameter') || row.includes('---')) continue;

                const cells = row.split('|').map(c => c.trim()).filter(Boolean);
                if (cells.length >= 4) {
                    params.push({
                        name: cells[0].replace(/`/g, ''),
                        type: cells[1],
                        required: cells[2].includes('Yes') || cells[2].includes('✅'),
                        description: cells[cells.length - 1]
                    });
                }
            }
        }

        return params;
    }

    /**
     * Extract examples from markdown content
     */
    extractExamples(content) {
        const examples = [];
        const exampleSectionMatch = content.match(/##\s+.*EXAMPLES?.*\n([\s\S]*?)(?=\n##|$)/i);

        if (exampleSectionMatch) {
            const exampleSection = exampleSectionMatch[1];
            // Match code blocks with optional titles
            const codeBlocks = exampleSection.match(/```bash\n([^`]+)```/g) || [];

            for (const block of codeBlocks) {
                const code = block.replace(/```bash\n?|\n?```/g, '').trim();
                examples.push({ command: code });
            }
        }

        return examples;
    }

    /**
     * Extract related commands from markdown content
     */
    extractRelatedCommands(content) {
        const related = [];
        const relatedSectionMatch = content.match(/##\s+.*RELATED.*\n([\s\S]*?)(?=\n##|$)/i);

        if (relatedSectionMatch) {
            const relatedSection = relatedSectionMatch[1];
            const commandMatches = relatedSection.match(/\/?([a-z-]+):/g) || [];

            for (const match of commandMatches) {
                const cmdName = '/' + match.replace(':', '').replace('/', '');
                if (!related.includes(cmdName)) {
                    related.push(cmdName);
                }
            }
        }

        return related;
    }

    /**
     * Display command registry (View 1)
     */
    async showRegistry(options = {}) {
        const { category, format = 'cli' } = options;

        await this.loadCommands();

        let filteredCommands = this.commands;
        if (category) {
            filteredCommands = this.commands.filter(c => c.category === category);
        }

        // Group by category
        const grouped = {};
        for (const cmd of filteredCommands) {
            if (!grouped[cmd.category]) {
                grouped[cmd.category] = [];
            }
            grouped[cmd.category].push(cmd);
        }

        if (format === 'cli') {
            return this.formatRegistryCLI(grouped);
        } else if (format === 'json') {
            return JSON.stringify(grouped, null, 2);
        } else if (format === 'markdown') {
            return this.formatRegistryMarkdown(grouped);
        }
    }

    /**
     * Format registry as CLI output
     */
    formatRegistryCLI(grouped) {
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';
        const dim = '\x1b[2m';

        let output = '\n';
        output += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
        output += '║                        EPS COMMAND REGISTRY                                   ║\n';
        output += `║                     ${this.commands.length} Commands Available (v3.7.0)                            ║\n`;
        output += '╚══════════════════════════════════════════════════════════════════════════════╝\n\n';

        // Display categories in order
        const categoryOrder = ['workflow', 'review', 'optimization', 'versioning', 'memory', 'design', 'utility'];

        for (const catKey of categoryOrder) {
            if (!grouped[catKey] || grouped[catKey].length === 0) continue;

            const catInfo = this.categories[catKey];
            const commands = grouped[catKey];

            output += `${catInfo.icon} ${bold}${catInfo.label}${reset} (${commands.length})`;
            if (catInfo.badge) {
                output += ` ${catInfo.badge}`;
            }
            output += '\n';
            output += '─'.repeat(80) + '\n';

            for (const cmd of commands) {
                const paddedName = cmd.name.padEnd(22);
                output += `  ${paddedName} ${cmd.description}\n`;
            }

            output += '\n';
        }

        output += `${dim}💡 TIP: Use /commands --help <command> for detailed information${reset}\n`;
        output += `${dim}      Use /commands --stats for usage statistics${reset}\n`;
        output += `${dim}      Use /commands --category <name> to filter by category${reset}\n\n`;

        return output;
    }

    /**
     * Format registry as Markdown
     */
    formatRegistryMarkdown(grouped) {
        let output = '# EPS Command Registry\n\n';
        output += `**Total Commands**: ${this.commands.length}\n\n`;

        const categoryOrder = ['workflow', 'review', 'optimization', 'versioning', 'memory', 'design', 'utility'];

        for (const catKey of categoryOrder) {
            if (!grouped[catKey] || grouped[catKey].length === 0) continue;

            const catInfo = this.categories[catKey];
            const commands = grouped[catKey];

            output += `## ${catInfo.icon} ${catInfo.label}\n\n`;
            output += `| Command | Description |\n`;
            output += `|---------|-------------|\n`;

            for (const cmd of commands) {
                output += `| \`${cmd.name}\` | ${cmd.description} |\n`;
            }

            output += '\n';
        }

        return output;
    }

    /**
     * Display usage statistics (View 2)
     */
    async showStats(options = {}) {
        const { period = 7, format = 'cli' } = options;

        // Load command history
        await this.loadHistory(period);

        if (!this.history || this.history.length === 0) {
            return '\n⚠️  No command history found\n\n';
        }

        // Calculate statistics
        const stats = {
            overall: this.calculateOverallStats(this.history),
            byCommand: this.calculateByCommand(this.history),
            byCategory: this.calculateByCategory(this.history),
            trends: this.calculateTrends(this.history, period)
        };

        if (format === 'cli') {
            return this.formatStatsCLI(stats, period);
        } else if (format === 'json') {
            return JSON.stringify(stats, null, 2);
        } else if (format === 'csv') {
            return this.formatStatsCSV(stats);
        }
    }

    /**
     * Load command history from JSON file
     */
    async loadHistory(days) {
        try {
            const content = await fs.readFile(this.config.historyPath, 'utf-8');
            const allHistory = JSON.parse(content);

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            this.history = allHistory.filter(entry => {
                const entryDate = new Date(entry.timestamp);
                return entryDate >= cutoffDate;
            });

            return this.history;
        } catch (error) {
            // History file may not exist yet
            this.history = [];
            return [];
        }
    }

    /**
     * Calculate overall statistics
     */
    calculateOverallStats(history) {
        const total = history.length;
        if (total === 0) return null;

        const successful = history.filter(h => h.status === 'success').length;
        const avgTime = history.reduce((sum, h) => sum + (h.executionTime || 0), 0) / total;

        // Most used command
        const commandCounts = {};
        for (const entry of history) {
            commandCounts[entry.command] = (commandCounts[entry.command] || 0) + 1;
        }
        const mostUsed = Object.entries(commandCounts)
            .sort(([, a], [, b]) => b - a)[0] || ['N/A', 0];

        // Fastest command
        const commandTimes = {};
        for (const entry of history) {
            if (!commandTimes[entry.command]) {
                commandTimes[entry.command] = [];
            }
            commandTimes[entry.command].push(entry.executionTime || 0);
        }
        const avgTimes = Object.entries(commandTimes).map(([cmd, times]) => [
            cmd,
            times.reduce((sum, t) => sum + t, 0) / times.length
        ]);
        const fastest = avgTimes.sort(([, a], [, b]) => a - b)[0] || ['N/A', 0];

        return {
            totalCalls: total,
            successRate: (successful / total) * 100,
            avgExecutionTime: avgTime / 1000, // Convert to seconds
            mostUsedCommand: { name: mostUsed[0], count: mostUsed[1] },
            fastestCommand: { name: fastest[0], avgTime: fastest[1] / 1000 }
        };
    }

    /**
     * Calculate statistics by command
     */
    calculateByCommand(history) {
        const commands = {};

        for (const entry of history) {
            if (!commands[entry.command]) {
                commands[entry.command] = {
                    calls: 0,
                    successes: 0,
                    totalTime: 0
                };
            }

            commands[entry.command].calls++;
            if (entry.status === 'success') {
                commands[entry.command].successes++;
            }
            commands[entry.command].totalTime += (entry.executionTime || 0);
        }

        // Calculate averages and sort by usage
        return Object.entries(commands).map(([name, data]) => ({
            command: name,
            calls: data.calls,
            successRate: (data.successes / data.calls) * 100,
            avgTime: (data.totalTime / data.calls) / 1000 // Convert to seconds
        })).sort((a, b) => b.calls - a.calls);
    }

    /**
     * Calculate statistics by category
     */
    calculateByCategory(history) {
        // Load commands to get categories
        const categories = {};

        for (const entry of history) {
            // Determine category from command name
            const category = this.detectCategory(entry.command, '');

            if (!categories[category]) {
                categories[category] = {
                    totalTime: 0,
                    count: 0
                };
            }

            categories[category].totalTime += (entry.executionTime || 0);
            categories[category].count++;
        }

        return Object.entries(categories).map(([name, data]) => ({
            category: name,
            avgTime: (data.totalTime / data.count) / 1000, // Convert to seconds
            calls: data.count
        }));
    }

    /**
     * Calculate daily trends
     */
    calculateTrends(history, period) {
        const dailyStats = {};

        for (const entry of history) {
            const date = new Date(entry.timestamp).toISOString().split('T')[0];

            if (!dailyStats[date]) {
                dailyStats[date] = { total: 0, success: 0 };
            }

            dailyStats[date].total++;
            if (entry.status === 'success') {
                dailyStats[date].success++;
            }
        }

        return Object.entries(dailyStats).map(([date, data]) => ({
            date,
            successRate: (data.success / data.total) * 100
        })).sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Format statistics as CLI output
     */
    formatStatsCLI(stats, period) {
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';
        const dim = '\x1b[2m';

        let output = '\n';
        output += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
        output += '║                      COMMAND USAGE STATISTICS                                 ║\n';
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        output += `║                     Period: ${startDate} to ${endDate}                          ║\n`;
        output += '╚══════════════════════════════════════════════════════════════════════════════╝\n\n';

        if (stats.overall) {
            output += `${bold}📊 OVERALL STATISTICS${reset}\n`;
            output += '─'.repeat(80) + '\n';
            output += `Total Command Calls:         ${stats.overall.totalCalls}\n`;
            output += `Success Rate:               ${stats.overall.successRate.toFixed(1)}%\n`;
            output += `Avg Execution Time:         ${stats.overall.avgExecutionTime.toFixed(1)} seconds\n`;
            output += `Most Used Command:          ${stats.overall.mostUsedCommand.name} (${stats.overall.mostUsedCommand.count} calls)\n`;
            output += `Fastest Command:            ${stats.overall.fastestCommand.name} (${stats.overall.fastestCommand.avgTime.toFixed(1)}s avg)\n\n`;
        }

        if (stats.byCommand && stats.byCommand.length > 0) {
            output += `${bold}📈 USAGE BY COMMAND (Top 10)${reset}\n`;
            output += '─'.repeat(80) + '\n';
            output += 'Command              Calls   Success   Avg Time   Chart\n';
            output += '─'.repeat(80) + '\n';

            const maxCalls = Math.max(...stats.byCommand.map(c => c.calls));
            const top10 = stats.byCommand.slice(0, 10);

            for (const cmd of top10) {
                const paddedName = cmd.command.padEnd(20);
                const paddedCalls = String(cmd.calls).padStart(5);
                const paddedSuccess = `${cmd.successRate.toFixed(1)}%`.padStart(7);
                const paddedTime = `${cmd.avgTime.toFixed(1)}s`.padStart(8);

                // ASCII bar chart
                const barLength = Math.round((cmd.calls / maxCalls) * 30);
                const bar = '█'.repeat(barLength);

                output += `${paddedName} ${paddedCalls}   ${paddedSuccess}  ${paddedTime}   ${bar}\n`;
            }

            output += '\n';
        }

        if (stats.byCategory && stats.byCategory.length > 0) {
            output += `${bold}⏱️  PERFORMANCE BY CATEGORY${reset}\n`;
            output += '─'.repeat(80) + '\n';

            for (const cat of stats.byCategory) {
                const paddedName = cat.category.padEnd(15);
                const avgTime = `${cat.avgTime.toFixed(1)}s avg`.padEnd(12);

                // ASCII bar chart (max 20 seconds)
                const barLength = Math.min(Math.round(cat.avgTime), 20);
                const bar = '█'.repeat(barLength);

                output += `${paddedName} ${avgTime} [${bar.padEnd(20)}]\n`;
            }

            output += '\n';
        }

        output += `${dim}💡 INSIGHTS${reset}\n`;
        output += '─'.repeat(80) + '\n';
        output += `✓ Week 7 new commands: /plan-review, /plan-optimize, /plan-version-*\n`;
        output += `✓ Use these commands to improve plan quality before execution\n`;
        output += `⚠ New commands not yet tracked - consider using them for better workflows\n\n`;

        return output;
    }

    /**
     * Format statistics as CSV
     */
    formatStatsCSV(stats) {
        let csv = 'Command,Calls,Success Rate,Avg Time (s)\n';

        for (const cmd of stats.byCommand) {
            csv += `${cmd.command},${cmd.calls},${cmd.successRate.toFixed(1)},${cmd.avgTime.toFixed(1)}\n`;
        }

        return csv;
    }

    /**
     * Display detailed help for specific command (View 3)
     */
    async showHelp(commandName, format = 'cli') {
        await this.loadCommands();

        const cmd = this.commands.find(c => c.name === commandName || c.name === '/' + commandName);

        if (!cmd) {
            return `\n❌ Command not found: ${commandName}\n\nUse /commands to see all available commands.\n\n`;
        }

        if (format === 'cli') {
            return this.formatHelpCLI(cmd);
        } else if (format === 'json') {
            return JSON.stringify(cmd, null, 2);
        } else if (format === 'markdown') {
            return this.formatHelpMarkdown(cmd);
        }
    }

    /**
     * Format help as CLI output
     */
    formatHelpCLI(cmd) {
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';
        const dim = '\x1b[2m';

        let output = '\n';
        output += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
        output += `║                            ${cmd.name.padEnd(44)}║\n`;
        output += `║                     ${cmd.description.padEnd(50)}║\n`;
        output += '╚══════════════════════════════════════════════════════════════════════════════╝\n\n';

        output += `${bold}📋 DESCRIPTION${reset}\n`;
        output += '─'.repeat(80) + '\n';
        output += `${cmd.description}\n\n`;

        if (cmd.parameters && cmd.parameters.length > 0) {
            output += `${bold}📥 PARAMETERS${reset}\n`;
            output += '─'.repeat(80) + '\n';

            for (const param of cmd.parameters) {
                const required = param.required ? '(required)' : '(optional)';
                output += `  ${bold}${param.name}${reset} ${dim}${param.type} ${required}${reset}\n`;
                output += `    ${param.description}\n\n`;
            }
        }

        if (cmd.examples && cmd.examples.length > 0) {
            output += `${bold}💡 EXAMPLES${reset}\n`;
            output += '─'.repeat(80) + '\n\n';

            for (let i = 0; i < cmd.examples.length; i++) {
                output += `${dim}Example ${i + 1}:${reset}\n`;
                output += `${cmd.examples[i].command}\n\n`;
            }
        }

        if (cmd.relatedCommands && cmd.relatedCommands.length > 0) {
            output += `${bold}🔗 RELATED COMMANDS${reset}\n`;
            output += '─'.repeat(80) + '\n';
            output += cmd.relatedCommands.map(c => `  ${c}`).join('\n') + '\n\n';
        }

        output += `${dim}💡 TIP: Use /commands --stats to see usage statistics${reset}\n\n`;

        return output;
    }

    /**
     * Format help as Markdown
     */
    formatHelpMarkdown(cmd) {
        let output = `# ${cmd.name}\n\n`;
        output += `${cmd.description}\n\n`;

        if (cmd.parameters && cmd.parameters.length > 0) {
            output += `## Parameters\n\n`;
            output += `| Parameter | Type | Required | Description |\n`;
            output += `|-----------|------|----------|-------------|\n`;

            for (const param of cmd.parameters) {
                const required = param.required ? 'Yes' : 'No';
                output += `| \`${param.name}\` | ${param.type} | ${required} | ${param.description} |\n`;
            }

            output += '\n';
        }

        if (cmd.examples && cmd.examples.length > 0) {
            output += `## Examples\n\n`;

            for (const ex of cmd.examples) {
                output += `\`\`\`bash\n${ex.command}\n\`\`\`\n\n`;
            }
        }

        if (cmd.relatedCommands && cmd.relatedCommands.length > 0) {
            output += `## Related Commands\n\n`;
            output += cmd.relatedCommands.map(c => `- ${c}`).join('\n') + '\n\n';
        }

        return output;
    }

    /**
     * Export registry and stats to JSON/CSV
     */
    async export(format = 'json') {
        await this.loadCommands();
        await this.loadHistory(30); // Last 30 days

        const data = {
            registry: this.commands,
            statistics: this.history ? {
                overall: this.calculateOverallStats(this.history),
                byCommand: this.calculateByCommand(this.history),
                byCategory: this.calculateByCategory(this.history)
            } : null,
            exportDate: new Date().toISOString()
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            return this.formatStatsCSV(data.statistics);
        }
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const dashboard = new CommandDashboard();

    (async () => {
        if (args.includes('--help') && args.length > 1) {
            // Show help for specific command
            const cmdIndex = args.indexOf('--help') + 1;
            const cmdName = args[cmdIndex];
            const output = await dashboard.showHelp(cmdName);
            console.log(output);
        } else if (args.includes('--stats')) {
            // Show statistics
            const period = args.includes('--period') ? parseInt(args[args.indexOf('--period') + 1]) : 7;
            const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'cli';
            const output = await dashboard.showStats({ period, format });
            console.log(output);
        } else if (args.includes('--export')) {
            // Export data
            const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'json';
            const output = await dashboard.export(format);
            console.log(output);
        } else if (args.includes('--category')) {
            // Show specific category
            const category = args[args.indexOf('--category') + 1];
            const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'cli';
            const output = await dashboard.showRegistry({ category, format });
            console.log(output);
        } else {
            // Default: Show registry
            const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'cli';
            const output = await dashboard.showRegistry({ format });
            console.log(output);
        }
    })();
}

module.exports = { CommandDashboard };
