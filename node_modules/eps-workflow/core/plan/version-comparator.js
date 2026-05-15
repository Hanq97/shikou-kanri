/**
 * Version Comparator - Side-by-side diff and impact analysis for plan versions
 * バージョン比較器 - プランバージョンの並列差分と影響分析
 * Bộ So Sánh Phiên Bản - Diff song song và phân tích tác động cho phiên bản plan
 *
 * Purpose: Compare two plan versions with LCS algorithm and impact analysis
 * Version: 1.0.0
 * Created: 2025-12-24
 */

class VersionComparator {
    /**
     * Compare two plan versions
     * 2つのプランバージョン比較
     * So sánh hai phiên bản plan
     */
    async compare(versionA, versionB, options = {}) {
        const {
            diffFormat = 'summary',  // 'unified' | 'split' | 'summary'
            includeImpact = true,
            verbose = false
        } = options;

        // Detect changes
        const changes = this.detectChanges(versionA.content, versionB.content);

        // Calculate impact
        const impact = includeImpact
            ? this.analyzeImpact(changes, versionA, versionB)
            : null;

        // Format comparison
        return this.formatComparison(
            versionA,
            versionB,
            changes,
            impact,
            diffFormat,
            verbose
        );
    }

    /**
     * Detect all changes between two plan versions
     * 2つのプランバージョン間の全変更検出
     * Phát hiện tất cả thay đổi giữa hai phiên bản plan
     */
    detectChanges(contentA, contentB) {
        return {
            sections: this.detectSectionChanges(contentA, contentB),
            lines: this.computeDiff(contentA, contentB),
            statistics: this.calculateChangeStatistics(contentA, contentB)
        };
    }

    /**
     * Detect section-level changes
     * セクションレベルの変更検出
     * Phát hiện thay đổi ở cấp section
     */
    detectSectionChanges(contentA, contentB) {
        const sectionsA = this._extractSections(contentA);
        const sectionsB = this._extractSections(contentB);

        const changes = [];

        // Find added sections
        for (const [id, sectionB] of sectionsB.entries()) {
            if (!sectionsA.has(id)) {
                changes.push({
                    type: 'added',
                    sectionId: id,
                    sectionTitle: sectionB.title,
                    content: sectionB.content,
                    linesAdded: this._countLines(sectionB.content)
                });
            }
        }

        // Find deleted sections
        for (const [id, sectionA] of sectionsA.entries()) {
            if (!sectionsB.has(id)) {
                changes.push({
                    type: 'deleted',
                    sectionId: id,
                    sectionTitle: sectionA.title,
                    content: sectionA.content,
                    linesDeleted: this._countLines(sectionA.content)
                });
            }
        }

        // Find modified sections
        for (const [id, sectionA] of sectionsA.entries()) {
            if (sectionsB.has(id)) {
                const sectionB = sectionsB.get(id);
                const diff = this.computeDiff(sectionA.content, sectionB.content);

                if (diff.hasChanges) {
                    changes.push({
                        type: 'modified',
                        sectionId: id,
                        sectionTitle: sectionA.title,
                        diff: diff,
                        linesAdded: diff.linesAdded,
                        linesDeleted: diff.linesDeleted
                    });
                }
            }
        }

        return changes;
    }

    /**
     * Compute unified diff between two texts using LCS algorithm
     * LCSアルゴリズムを使用した2つのテキスト間の統一差分計算
     * Tính diff thống nhất giữa hai văn bản bằng thuật toán LCS
     */
    computeDiff(textA, textB) {
        const linesA = textA.split('\n');
        const linesB = textB.split('\n');

        // Use longest common subsequence (LCS) algorithm
        const lcs = this.longestCommonSubsequence(linesA, linesB);

        const changes = [];
        let i = 0, j = 0, lcsIndex = 0;

        while (i < linesA.length || j < linesB.length) {
            if (lcsIndex < lcs.length &&
                i < linesA.length &&
                j < linesB.length &&
                linesA[i] === lcs[lcsIndex] &&
                linesB[j] === lcs[lcsIndex]) {
                // Unchanged line
                changes.push({
                    type: 'unchanged',
                    lineNumber: i + 1,
                    content: linesA[i]
                });
                i++;
                j++;
                lcsIndex++;
            } else if (i < linesA.length && (lcsIndex >= lcs.length || linesA[i] !== lcs[lcsIndex])) {
                // Deleted line
                changes.push({
                    type: 'deleted',
                    lineNumber: i + 1,
                    content: linesA[i]
                });
                i++;
            } else if (j < linesB.length) {
                // Added line
                changes.push({
                    type: 'added',
                    lineNumber: j + 1,
                    content: linesB[j]
                });
                j++;
            }
        }

        return {
            hasChanges: changes.some(c => c.type !== 'unchanged'),
            linesAdded: changes.filter(c => c.type === 'added').length,
            linesDeleted: changes.filter(c => c.type === 'deleted').length,
            changes
        };
    }

    /**
     * Longest common subsequence algorithm (LCS)
     * 最長共通部分列アルゴリズム
     * Thuật toán dãy con chung dài nhất
     */
    longestCommonSubsequence(a, b) {
        const m = a.length;
        const n = b.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        // Fill DP table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (a[i - 1] === b[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        // Reconstruct LCS
        const lcs = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (a[i - 1] === b[j - 1]) {
                lcs.unshift(a[i - 1]);
                i--;
                j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }

        return lcs;
    }

    /**
     * Analyze impact of changes
     * 変更の影響分析
     * Phân tích tác động của thay đổi
     */
    analyzeImpact(changes, versionA, versionB) {
        return {
            timeline: this.analyzeTimelineImpact(changes, versionA, versionB),
            quality: this.analyzeQualityImpact(versionA, versionB),
            scope: this.analyzeScopeImpact(changes)
        };
    }

    /**
     * Analyze timeline impact
     * タイムライン影響分析
     * Phân tích tác động về timeline
     */
    analyzeTimelineImpact(changes, versionA, versionB) {
        const timeA = this._extractTotalTime(versionA.content);
        const timeB = this._extractTotalTime(versionB.content);
        const timeDelta = timeB - timeA;
        const percentChange = timeA > 0 ? (timeDelta / timeA) * 100 : 0;

        return {
            originalTime: timeA,
            newTime: timeB,
            timeDelta,
            percentChange: Math.round(percentChange * 10) / 10,
            impact: Math.abs(percentChange) > 20 ? 'high' : Math.abs(percentChange) > 10 ? 'medium' : 'low',
            description: timeDelta > 0
                ? `Timeline increased by ${timeDelta.toFixed(1)}h (${percentChange.toFixed(1)}%)`
                : `Timeline decreased by ${Math.abs(timeDelta).toFixed(1)}h (${Math.abs(percentChange).toFixed(1)}%)`
        };
    }

    /**
     * Analyze quality impact
     * 品質影響分析
     * Phân tích tác động về chất lượng
     */
    analyzeQualityImpact(versionA, versionB) {
        const qualityA = versionA.metadata?.quality_score || 0;
        const qualityB = versionB.metadata?.quality_score || 0;
        const qualityDelta = qualityB - qualityA;

        return {
            originalQuality: qualityA,
            newQuality: qualityB,
            qualityDelta,
            impact: Math.abs(qualityDelta) > 10 ? 'high' : Math.abs(qualityDelta) > 5 ? 'medium' : 'low',
            description: qualityDelta > 0
                ? `Quality improved by ${qualityDelta.toFixed(1)}%`
                : `Quality decreased by ${Math.abs(qualityDelta).toFixed(1)}%`
        };
    }

    /**
     * Analyze scope impact
     * スコープ影響分析
     * Phân tích tác động về phạm vi
     */
    analyzeScopeImpact(changes) {
        const sectionsAdded = changes.sections.filter(c => c.type === 'added').length;
        const sectionsDeleted = changes.sections.filter(c => c.type === 'deleted').length;
        const sectionsModified = changes.sections.filter(c => c.type === 'modified').length;

        return {
            sectionsAdded,
            sectionsDeleted,
            sectionsModified,
            totalSections: sectionsAdded + sectionsDeleted + sectionsModified,
            impact: (sectionsAdded + sectionsDeleted) > 3 ? 'high' : (sectionsAdded + sectionsDeleted) > 1 ? 'medium' : 'low'
        };
    }

    /**
     * Calculate change statistics
     * 変更統計計算
     * Tính toán thống kê thay đổi
     */
    calculateChangeStatistics(contentA, contentB) {
        const linesA = contentA.split('\n');
        const linesB = contentB.split('\n');

        return {
            totalLinesA: linesA.length,
            totalLinesB: linesB.length,
            linesAdded: Math.max(0, linesB.length - linesA.length),
            linesDeleted: Math.max(0, linesA.length - linesB.length)
        };
    }

    /**
     * Format comparison output
     * 比較出力フォーマット
     * Định dạng đầu ra so sánh
     */
    formatComparison(versionA, versionB, changes, impact, format, verbose) {
        switch (format) {
            case 'summary':
                return this._formatSummary(versionA, versionB, changes, impact);
            case 'split':
                return this._formatSideBySide(versionA, versionB, changes);
            case 'unified':
                return this._formatUnified(versionA, versionB, changes, verbose);
            default:
                return this._formatSummary(versionA, versionB, changes, impact);
        }
    }

    /**
     * Format summary comparison
     * サマリー比較フォーマット
     * Định dạng so sánh tóm tắt
     */
    _formatSummary(versionA, versionB, changes, impact) {
        let output = '╔══════════════════════════════════════════════════════════════════════════╗\n';
        output += '║                        VERSION COMPARISON                                 ║\n';
        output += '╚══════════════════════════════════════════════════════════════════════════╝\n\n';

        output += `v${versionA.metadata.version} → v${versionB.metadata.version}\n\n`;

        output += '📊 CHANGE STATISTICS:\n';
        output += `   Sections added: ${changes.sections.filter(c => c.type === 'added').length}\n`;
        output += `   Sections deleted: ${changes.sections.filter(c => c.type === 'deleted').length}\n`;
        output += `   Sections modified: ${changes.sections.filter(c => c.type === 'modified').length}\n`;
        output += `   Lines added: ${changes.statistics.linesAdded}\n`;
        output += `   Lines deleted: ${changes.statistics.linesDeleted}\n\n`;

        if (impact) {
            output += '🎯 IMPACT ANALYSIS:\n';
            output += `   Timeline: ${impact.timeline.description} (${impact.timeline.impact})\n`;
            output += `   Quality: ${impact.quality.description} (${impact.quality.impact})\n`;
            output += `   Scope: ${impact.scope.totalSections} sections changed (${impact.scope.impact})\n`;
        }

        return output;
    }

    /**
     * Format side-by-side diff
     * 並列差分フォーマット
     * Định dạng diff song song
     */
    _formatSideBySide(versionA, versionB, changes) {
        let output = '╔══════════════════════════════════════════════════════════════════════════╗\n';
        output += '║                     SIDE-BY-SIDE COMPARISON                               ║\n';
        output += '╚══════════════════════════════════════════════════════════════════════════╝\n\n';

        output += `v${versionA.metadata.version} → v${versionB.metadata.version}\n\n`;

        output += '┌─────────────────────────────────┬─────────────────────────────────┐\n';
        output += '│         Version A (Old)         │         Version B (New)         │\n';
        output += '├─────────────────────────────────┼─────────────────────────────────┤\n';

        for (const change of changes.sections.slice(0, 10)) {  // Show first 10 changes
            if (change.type === 'added') {
                const title = this._truncate(change.sectionTitle, 30);
                output += `│                                 │ + ${title.padEnd(30)}│\n`;
            } else if (change.type === 'deleted') {
                const title = this._truncate(change.sectionTitle, 30);
                output += `│ - ${title.padEnd(30)}│                                 │\n`;
            } else if (change.type === 'modified') {
                const title = this._truncate(change.sectionTitle, 30);
                output += `│ ~ ${title.padEnd(30)}│ ~ ${title.padEnd(30)}│\n`;
            }
        }

        output += '└─────────────────────────────────┴─────────────────────────────────┘\n';

        return output;
    }

    /**
     * Format unified diff
     * 統一差分フォーマット
     * Định dạng diff thống nhất
     */
    _formatUnified(versionA, versionB, changes, verbose) {
        let output = `--- v${versionA.metadata.version}\n`;
        output += `+++ v${versionB.metadata.version}\n\n`;

        const maxLines = verbose ? 100 : 20;
        const relevantChanges = changes.lines.changes
            .filter(c => c.type !== 'unchanged')
            .slice(0, maxLines);

        for (const change of relevantChanges) {
            if (change.type === 'added') {
                output += `+ ${change.content}\n`;
            } else if (change.type === 'deleted') {
                output += `- ${change.content}\n`;
            }
        }

        if (changes.lines.changes.filter(c => c.type !== 'unchanged').length > maxLines) {
            output += `\n... (${changes.lines.changes.filter(c => c.type !== 'unchanged').length - maxLines} more changes)\n`;
        }

        return output;
    }

    /**
     * Extract sections from content
     * コンテンツからセクション抽出
     * Trích xuất sections từ nội dung
     */
    _extractSections(content) {
        const sections = new Map();
        const lines = content.split('\n');

        let currentSection = null;
        let currentContent = [];

        for (const line of lines) {
            if (line.startsWith('##')) {
                // Save previous section
                if (currentSection) {
                    sections.set(currentSection.id, {
                        title: currentSection.title,
                        content: currentContent.join('\n')
                    });
                }

                // Start new section
                currentSection = {
                    id: line.trim(),
                    title: line.replace(/^#+\s*/, '')
                };
                currentContent = [line];
            } else if (currentSection) {
                currentContent.push(line);
            }
        }

        // Save last section
        if (currentSection) {
            sections.set(currentSection.id, {
                title: currentSection.title,
                content: currentContent.join('\n')
            });
        }

        return sections;
    }

    /**
     * Extract total time estimate from content
     * コンテンツから総時間見積もり抽出
     * Trích xuất tổng thời gian ước tính từ nội dung
     */
    _extractTotalTime(content) {
        const timePattern = /\((\d+(?:\.\d+)?)\s*(?:hour|hr|h)\)/gi;
        const matches = content.match(timePattern);

        if (!matches) return 0;

        let totalTime = 0;
        for (const match of matches) {
            const time = parseFloat(match.match(/(\d+(?:\.\d+)?)/)[1]);
            totalTime += time;
        }

        return totalTime;
    }

    /**
     * Count lines in text
     * テキストの行数カウント
     * Đếm số dòng trong văn bản
     */
    _countLines(text) {
        return text.split('\n').length;
    }

    /**
     * Truncate string to max length
     * 最大長まで文字列切り詰め
     * Cắt ngắn chuỗi đến độ dài tối đa
     */
    _truncate(str, maxLength) {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    }
}

module.exports = { VersionComparator };
