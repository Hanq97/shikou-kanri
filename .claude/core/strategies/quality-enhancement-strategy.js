/**
 * Quality Enhancement Strategy - Improve clarity and completeness
 * 品質向上戦略 - 明確性と完全性を向上
 * Chiến Lược Cải Thiện Chất Lượng - Cải thiện độ rõ ràng và đầy đủ
 *
 * Purpose: Add missing sections, enhance validation, improve bilingual content
 * Version: 1.0.0
 * Created: 2025-12-24
 */

class QualityEnhancementStrategy {
    constructor() {
        this.targetImprovement = 0.15; // 15-20%
    }

    /**
     * Apply quality enhancement
     * 品質向上を適用
     * Áp dụng cải thiện chất lượng
     */
    async apply(content, baseline) {
        const changes = [];
        let optimizedContent = content;

        // 1. Check for Context Engineering (Day 1 plans)
        if (this._isDayOnePlan(content) && !this._hasContextEngineering(content)) {
            changes.push({
                type: 'missing_context_engineering',
                severity: 'critical',
                suggestion: 'Add Step 1.0: Context Engineering (1 hour) for Day 1 plans',
                impact: '+10% completeness',
                description: 'Day 1 plans should start with Context Engineering step'
            });
        }

        // 2. Check for validation checklists
        const stepsWithoutValidation = this._findStepsWithoutValidation(content);
        if (stepsWithoutValidation.length > 0) {
            changes.push({
                type: 'missing_validation',
                count: stepsWithoutValidation.length,
                steps: stepsWithoutValidation,
                suggestion: 'Add validation checklists for each step',
                impact: '+5% per step',
                description: `${stepsWithoutValidation.length} steps lack validation checklists`
            });
        }

        // 3. Bilingual content ratio — SKIPPED for plans (English-only)
        // Plans and pseudo-code only need English. Bilingual check applies to design docs (SRS/BD/DD) only.
        const bilingualRatio = 100; // Skip bilingual check for plans

        // 4. Check for success criteria
        if (!this._hasSuccessCriteria(content)) {
            changes.push({
                type: 'missing_success_criteria',
                severity: 'high',
                suggestion: 'Add measurable success criteria section',
                impact: '+8% completeness',
                description: 'Plan lacks explicit success criteria'
            });
        }

        // 5. Check for required reading section
        if (!this._hasRequiredReading(content)) {
            changes.push({
                type: 'missing_required_reading',
                severity: 'medium',
                suggestion: 'Add Required Reading section with file paths and token estimates',
                impact: '+5% completeness',
                description: 'Plan lacks Required Reading section'
            });
        }

        return {
            optimizedContent,
            changes,
            metrics: {
                contextEngineeringAdded: false,
                validationEnhancements: stepsWithoutValidation.length,
                bilingualImprovements: bilingualRatio < 60 ? 1 : 0,
                criteriaStrengthened: !this._hasSuccessCriteria(content) ? 1 : 0,
                currentBilingualRatio: bilingualRatio
            }
        };
    }

    /**
     * Check if this is a Day 1 plan
     * これがDay 1計画かチェック
     * Kiểm tra đây có phải kế hoạch Day 1 không
     */
    _isDayOnePlan(content) {
        return /Day\s+1[:\s]/i.test(content);
    }

    /**
     * Check if plan has Context Engineering step
     * 計画にContext Engineeringステップがあるかチェック
     * Kiểm tra kế hoạch có bước Context Engineering không
     */
    _hasContextEngineering(content) {
        return /Step\s+1\.0[:\s]+Context\s+Engineering/i.test(content) ||
               /Context\s+Engineering/i.test(content);
    }

    /**
     * Find steps without validation checklists
     * 検証チェックリストのないステップを見つける
     * Tìm các bước không có danh sách kiểm tra xác thực
     */
    _findStepsWithoutValidation(content) {
        const stepsWithoutValidation = [];
        const stepPattern = /###?\s+Step\s+(\d+(?:\.\d+)?)[:\s]+([^\n]+)/gi;

        let match;
        while ((match = stepPattern.exec(content)) !== null) {
            const stepId = match[1];
            const stepTitle = match[2];

            // Check if this step has validation section after it
            const stepPos = match.index;
            const nextStepMatch = stepPattern.exec(content);
            const endPos = nextStepMatch ? nextStepMatch.index : content.length;
            stepPattern.lastIndex = stepPos + match[0].length; // Reset regex position

            const stepContent = content.substring(stepPos, endPos);

            if (!/\*\*Validation\*\*/i.test(stepContent) && !/Validation:/i.test(stepContent)) {
                stepsWithoutValidation.push(`Step ${stepId}: ${stepTitle.trim()}`);
            }
        }

        return stepsWithoutValidation;
    }

    /**
     * Calculate bilingual content ratio
     * バイリンガルコンテンツ比率を計算
     * Tính tỷ lệ nội dung song ngữ
     */
    _calculateBilingualRatio(content) {
        // Vietnamese characters
        const vietnamesePattern = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi;
        const vietnameseMatches = content.match(vietnamesePattern) || [];

        // Japanese characters (Hiragana + Katakana + Kanji)
        const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g;
        const japaneseMatches = content.match(japanesePattern) || [];

        // Total characters (excluding whitespace)
        const totalChars = content.replace(/\s/g, '').length;

        if (totalChars === 0) return 0;

        const bilingualChars = vietnameseMatches.length + japaneseMatches.length;
        return Math.round((bilingualChars / totalChars) * 1000) / 10; // Round to 1 decimal
    }

    /**
     * Check if plan has success criteria
     * 計画に成功基準があるかチェック
     * Kiểm tra kế hoạch có tiêu chí thành công không
     */
    _hasSuccessCriteria(content) {
        return /##\s+SUCCESS\s+CRITERIA/i.test(content) ||
               /##\s+✅\s+SUCCESS\s+CRITERIA/i.test(content);
    }

    /**
     * Check if plan has required reading section
     * 計画に必須読書セクションがあるかチェック
     * Kiểm tra kế hoạch có phần bắt buộc đọc không
     */
    _hasRequiredReading(content) {
        return /##\s+REQUIRED\s+READING/i.test(content) ||
               /##\s+📋\s+REQUIRED\s+READING/i.test(content);
    }
}

module.exports = QualityEnhancementStrategy;
