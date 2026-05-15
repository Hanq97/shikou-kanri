/**
 * Token Optimization Strategy - Reduce token usage by ≥15%
 * トークン最適化戦略 - トークン使用量を15%以上削減
 * Chiến Lược Tối Ưu Token - Giảm token sử dụng ≥15%
 *
 * Purpose: Optimize plan token usage while preserving quality
 * Version: 1.0.0
 * Created: 2025-12-24
 */

class TokenOptimizationStrategy {
    constructor() {
        this.targetReduction = 0.15; // 15%
    }

    /**
     * Apply token optimization
     * トークン最適化を適用
     * Áp dụng tối ưu token
     */
    async apply(content, baseline) {
        const changes = [];
        let optimizedContent = content;

        // Calculate original tokens
        const originalTokens = this._estimateTokens(content);

        // 1. Remove excessive whitespace
        const whitespaceResult = this._removeExcessiveWhitespace(optimizedContent);
        if (whitespaceResult.saved > 0) {
            changes.push({
                type: 'whitespace_removal',
                tokensSaved: whitespaceResult.saved,
                description: 'Removed excessive blank lines and whitespace'
            });
            optimizedContent = whitespaceResult.content;
        }

        // 2. Compress verbose descriptions
        const compressionResult = this._compressVerboseContent(optimizedContent);
        if (compressionResult.changes > 0) {
            changes.push({
                type: 'compression',
                tokensSaved: compressionResult.saved,
                description: `Compressed ${compressionResult.changes} verbose sections`
            });
            optimizedContent = compressionResult.content;
        }

        // Calculate final tokens
        const optimizedTokens = this._estimateTokens(optimizedContent);
        const tokensSaved = originalTokens - optimizedTokens;
        const reductionPercentage = (tokensSaved / originalTokens) * 100;

        return {
            optimizedContent,
            changes,
            metrics: {
                originalTokens,
                optimizedTokens,
                tokensSaved,
                reductionPercentage: Math.round(reductionPercentage * 10) / 10,
                targetMet: reductionPercentage >= this.targetReduction * 100
            }
        };
    }

    /**
     * Remove excessive whitespace
     * 過剰な空白を削除
     * Loại bỏ khoảng trắng thừa
     */
    _removeExcessiveWhitespace(content) {
        const originalTokens = this._estimateTokens(content);

        // Remove more than 2 consecutive blank lines
        let result = content.replace(/\n\n\n+/g, '\n\n');

        // Remove trailing whitespace on lines
        result = result.replace(/[ \t]+$/gm, '');

        const saved = originalTokens - this._estimateTokens(result);

        return {
            content: result,
            saved: Math.max(0, saved)
        };
    }

    /**
     * Compress verbose content
     * 冗長なコンテンツを圧縮
     * Nén nội dung dài dòng
     */
    _compressVerboseContent(content) {
        const originalTokens = this._estimateTokens(content);
        let result = content;
        let changes = 0;

        // Find overly verbose patterns and compress them
        // Pattern: Repeated phrases like "and then", "in order to", etc.
        const verbosePatterns = [
            { pattern: /in order to /gi, replacement: 'to ', saved: 2 },
            { pattern: /due to the fact that /gi, replacement: 'because ', saved: 3 },
            { pattern: /at this point in time/gi, replacement: 'now', saved: 3 },
            { pattern: /for the purpose of /gi, replacement: 'to ', saved: 3 }
        ];

        for (const { pattern, replacement } of verbosePatterns) {
            const matches = (result.match(pattern) || []).length;
            if (matches > 0) {
                result = result.replace(pattern, replacement);
                changes += matches;
            }
        }

        const saved = originalTokens - this._estimateTokens(result);

        return {
            content: result,
            changes,
            saved: Math.max(0, saved)
        };
    }

    /**
     * Estimate token count (~1.3 tokens per word)
     * トークン数を推定（単語あたり約1.3トークン）
     * Ước tính số token (~1.3 token mỗi từ)
     */
    _estimateTokens(text) {
        const wordCount = this._countWords(text);
        return Math.round(wordCount * 1.3);
    }

    /**
     * Count words in text
     * テキスト内の単語数をカウント
     * Đếm số từ trong văn bản
     */
    _countWords(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }
}

module.exports = TokenOptimizationStrategy;
