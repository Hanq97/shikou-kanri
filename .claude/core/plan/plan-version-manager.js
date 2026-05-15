/**
 * Plan Version Manager - Semantic versioning for implementation plans
 * プランバージョンマネージャー - 実装プランのセマンティックバージョニング
 * Quản Lý Phiên Bản Plan - Semantic versioning cho kế hoạch triển khai
 *
 * Purpose: Complete plan version control with save, list, compare, rollback
 * Version: 1.0.0
 * Created: 2025-12-24
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class PlanVersionManager {
    constructor(config = {}) {
        this.config = {
            storageRoot: config.storageRoot || '.claude/memory-bank/plan-versions',
            author: config.author || 'Claude Code',
            createBackup: config.createBackup !== false,
            reviewBefore: config.reviewBefore !== false,
            ...config
        };
        this._reviewEngine = null;
    }

    /**
     * Lazy load review engine to avoid circular dependencies
     * レビューエンジンの遅延読み込み
     * Tải review engine trễ để tránh phụ thuộc vòng
     */
    get reviewEngine() {
        if (!this._reviewEngine) {
            const { PlanReviewEngine } = require('./plan-review-engine');
            this._reviewEngine = new PlanReviewEngine();
        }
        return this._reviewEngine;
    }

    /**
     * Save new plan version with auto-increment and quality validation
     * 新規プランバージョン保存
     * Lưu phiên bản plan mới
     */
    async save(planPath, options = {}) {
        const {
            versionType = 'auto',  // 'major' | 'minor' | 'patch' | 'auto'
            rationale = '',
            reviewBefore = this.config.reviewBefore,
            author = this.config.author
        } = options;

        try {
            // Step 1: Load current plan
            const currentPlan = await fs.readFile(planPath, 'utf-8');
            const planInfo = this._parsePlanInfo(planPath);

            // Step 2: Load metadata
            const metadata = await this._loadMetadata(planInfo.feature, planInfo.subFeature);

            // Step 3: Run review if requested
            let reviewResult = null;
            if (reviewBefore) {
                reviewResult = await this.reviewEngine.review(planPath);
                if (reviewResult.overall < 90) {
                    return {
                        success: false,
                        error: 'LowQualityScore',
                        message: `Plan quality (${reviewResult.overall}%) below threshold (90%)`,
                        suggestion: 'Use /plan-optimize to improve plan before saving',
                        reviewResult
                    };
                }
            }

            // Step 4: Determine new version
            const previousVersion = metadata.currentVersion || '0.0.0';
            const previousContent = await this._getVersionContent(planInfo, previousVersion);
            const newVersion = this._calculateNewVersion(
                previousVersion,
                versionType,
                previousContent,
                currentPlan
            );

            // Step 5: Create version metadata
            const versionMetadata = this._createVersionMetadata(
                newVersion,
                previousVersion,
                currentPlan,
                previousContent,
                reviewResult,
                rationale,
                author
            );

            // Step 6: Save version file
            const versionPath = this._getVersionPath(planInfo, newVersion);
            await this._ensureDirectory(path.dirname(versionPath));
            await fs.writeFile(versionPath, JSON.stringify({
                metadata: versionMetadata,
                content: currentPlan
            }, null, 2), 'utf-8');

            // Step 7: Update metadata
            await this._updateMetadata(planInfo, newVersion, versionMetadata);

            // Step 8: Update global registry
            await this._updateGlobalRegistry();

            return {
                success: true,
                version: newVersion,
                previousVersion,
                versionPath,
                metadata: versionMetadata,
                message: `Successfully saved plan version ${newVersion}`
            };

        } catch (error) {
            return {
                success: false,
                error: error.name,
                message: error.message
            };
        }
    }

    /**
     * List all versions of a plan
     * プランの全バージョン一覧
     * Liệt kê tất cả phiên bản của plan
     */
    async list(planPath, options = {}) {
        const {
            format = 'cli',
            limit = 10,
            sortBy = 'timestamp'
        } = options;

        try {
            const planInfo = this._parsePlanInfo(planPath);
            const metadata = await this._loadMetadata(planInfo.feature, planInfo.subFeature);

            if (!metadata || !metadata.versionHistory || metadata.versionHistory.length === 0) {
                return {
                    success: false,
                    message: 'No version history found for this plan'
                };
            }

            // Sort version history
            const sorted = this._sortVersionHistory(metadata.versionHistory, sortBy);

            // Apply limit
            const limited = sorted.slice(0, limit);

            // Format output
            let output;
            switch (format) {
                case 'cli':
                    output = this._formatVersionListCLI(planInfo.planName, limited, metadata);
                    break;
                case 'json':
                    output = { planName: planInfo.planName, versions: limited, metadata };
                    break;
                case 'markdown':
                    output = this._formatVersionListMarkdown(planInfo.planName, limited, metadata);
                    break;
                default:
                    throw new Error(`Invalid format: ${format}`);
            }

            return {
                success: true,
                output,
                totalVersions: metadata.versionHistory.length
            };

        } catch (error) {
            return {
                success: false,
                error: error.name,
                message: error.message
            };
        }
    }

    /**
     * Load specific version of a plan
     * 特定バージョン読み込み
     * Đọc phiên bản cụ thể
     */
    async get(planPath, version) {
        try {
            const planInfo = this._parsePlanInfo(planPath);
            const versionPath = this._getVersionPath(planInfo, version);

            const content = await fs.readFile(versionPath, 'utf-8');
            const versionData = JSON.parse(content);

            return {
                success: true,
                version,
                metadata: versionData.metadata,
                content: versionData.content
            };

        } catch (error) {
            return {
                success: false,
                error: error.name,
                message: error.message
            };
        }
    }

    /**
     * Rollback to a previous version with validation and backup
     * 前バージョンへロールバック
     * Rollback về phiên bản trước
     */
    async rollback(planPath, targetVersion, options = {}) {
        const {
            force = false,
            reason = 'User requested rollback',
            createBackup = this.config.createBackup
        } = options;

        try {
            // Step 1: Validate rollback
            const validation = await this._validateRollback(planPath, targetVersion, { force });

            if (!validation.canRollback) {
                return {
                    success: false,
                    error: 'RollbackBlocked',
                    message: 'Rollback validation failed',
                    validation
                };
            }

            const planInfo = this._parsePlanInfo(planPath);
            const metadata = await this._loadMetadata(planInfo.feature, planInfo.subFeature);
            const currentVersion = metadata.currentVersion;

            // Step 2: Create backup if requested
            let backup = null;
            if (createBackup) {
                backup = await this._createRollbackBackup(planInfo, currentVersion);
            }

            // Step 3: Load target version
            const target = await this.get(planPath, targetVersion);
            if (!target.success) {
                return target;
            }

            // Step 4: Update current plan file
            await fs.writeFile(planPath, target.content, 'utf-8');

            // Step 5: Update metadata
            metadata.currentVersion = targetVersion;
            metadata.rollbackHistory = metadata.rollbackHistory || [];
            metadata.rollbackHistory.push({
                timestamp: new Date().toISOString(),
                fromVersion: currentVersion,
                toVersion: targetVersion,
                reason,
                successful: true,
                backupPath: backup?.backupPath
            });

            await this._writeMetadata(planInfo, metadata);

            // Step 6: Update global registry
            await this._updateGlobalRegistry();

            return {
                success: true,
                fromVersion: currentVersion,
                toVersion: targetVersion,
                backup,
                validation,
                message: `Successfully rolled back from v${currentVersion} to v${targetVersion}`
            };

        } catch (error) {
            return {
                success: false,
                error: error.name,
                message: error.message
            };
        }
    }

    /**
     * Calculate new version number
     * 新バージョン番号計算
     * Tính số phiên bản mới
     */
    _calculateNewVersion(previousVersion, versionType, previousContent, currentContent) {
        const [major, minor, patch] = previousVersion.split('.').map(Number);

        // Auto-detect if type is 'auto'
        if (versionType === 'auto') {
            versionType = this._determineVersionIncrement(previousContent, currentContent);
        }

        switch (versionType) {
            case 'major':
                return `${major + 1}.0.0`;
            case 'minor':
                return `${major}.${minor + 1}.0`;
            case 'patch':
                return `${major}.${minor}.${patch + 1}`;
            default:
                throw new Error(`Invalid version type: ${versionType}`);
        }
    }

    /**
     * Determine version increment automatically based on changes
     * 変更に基づいてバージョン増分を自動決定
     * Tự động xác định tăng phiên bản dựa trên thay đổi
     */
    _determineVersionIncrement(previousContent, currentContent) {
        if (!previousContent) return 'major';

        const prevLines = previousContent.split('\n');
        const currLines = currentContent.split('\n');

        // Major: Complete rewrite or architecture change
        const sectionChanges = this._countSectionChanges(prevLines, currLines);
        if (sectionChanges.deleted > 3 || sectionChanges.added > 5) {
            return 'major';
        }

        // Minor: New sections added
        if (sectionChanges.added > 0) {
            return 'minor';
        }

        // Patch: Small edits
        return 'patch';
    }

    /**
     * Count section-level changes
     * セクションレベルの変更カウント
     * Đếm thay đổi ở cấp section
     */
    _countSectionChanges(prevLines, currLines) {
        const prevSections = prevLines.filter(line => line.startsWith('##'));
        const currSections = currLines.filter(line => line.startsWith('##'));

        return {
            added: Math.max(0, currSections.length - prevSections.length),
            deleted: Math.max(0, prevSections.length - currSections.length)
        };
    }

    /**
     * Create version metadata
     * バージョンメタデータ作成
     * Tạo metadata phiên bản
     */
    _createVersionMetadata(newVersion, previousVersion, currentContent, previousContent, reviewResult, rationale, author) {
        const timestamp = new Date().toISOString();
        const changes = this._detectChanges(previousContent, currentContent);

        return {
            version: newVersion,
            previousVersion,
            timestamp,
            author,
            rationale: rationale || 'Version update',
            changeType: this._getChangeType(previousVersion, newVersion),
            changes,
            quality_score: reviewResult?.overall || 0,
            review_summary: reviewResult?.dimensions || {},
            contentHash: this._hashContent(currentContent)
        };
    }

    /**
     * Detect changes between two versions
     * 2つのバージョン間の変更検出
     * Phát hiện thay đổi giữa hai phiên bản
     */
    _detectChanges(previousContent, currentContent) {
        if (!previousContent) {
            return [{
                type: 'initial',
                description: 'Initial version created'
            }];
        }

        const prevLines = previousContent.split('\n');
        const currLines = currentContent.split('\n');

        return [{
            type: 'modified',
            linesAdded: Math.max(0, currLines.length - prevLines.length),
            linesDeleted: Math.max(0, prevLines.length - currLines.length)
        }];
    }

    /**
     * Get change type from version numbers
     * バージョン番号から変更タイプ取得
     * Lấy loại thay đổi từ số phiên bản
     */
    _getChangeType(prevVersion, newVersion) {
        const [prevMajor, prevMinor] = prevVersion.split('.').map(Number);
        const [newMajor, newMinor] = newVersion.split('.').map(Number);

        if (newMajor > prevMajor) return 'major';
        if (newMinor > prevMinor) return 'minor';
        return 'patch';
    }

    /**
     * Hash content for integrity validation
     * 整合性検証のためコンテンツハッシュ化
     * Hash nội dung để kiểm tra tính toàn vẹn
     */
    _hashContent(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Validate rollback safety
     * ロールバック安全性検証
     * Kiểm tra an toàn rollback
     */
    async _validateRollback(planPath, targetVersion, options = {}) {
        const { force = false } = options;

        const validation = {
            canRollback: true,
            riskLevel: 'low',
            warnings: [],
            blockers: []
        };

        try {
            // Check target version exists
            const target = await this.get(planPath, targetVersion);
            if (!target.success) {
                validation.canRollback = false;
                validation.blockers.push({
                    type: 'version_not_found',
                    severity: 'critical',
                    message: `Target version ${targetVersion} not found`
                });
                return validation;
            }

            // Check quality score
            if (target.metadata.quality_score < 90) {
                validation.warnings.push({
                    type: 'low_quality',
                    severity: 'medium',
                    message: `Target version has low quality score (${target.metadata.quality_score}%)`
                });
                validation.riskLevel = 'medium';
            }

        } catch (error) {
            validation.canRollback = false;
            validation.blockers.push({
                type: 'validation_error',
                severity: 'critical',
                message: error.message
            });
        }

        return validation;
    }

    /**
     * Create backup before rollback
     * ロールバック前バックアップ作成
     * Tạo backup trước rollback
     */
    async _createRollbackBackup(planInfo, currentVersion) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.config.storageRoot, planInfo.feature, planInfo.subFeature, 'backups');
        await this._ensureDirectory(backupDir);

        const backupPath = path.join(backupDir, `pre-rollback-${timestamp}.json`);
        const current = await this.get(path.join(planInfo.feature, planInfo.subFeature, planInfo.planName), currentVersion);

        await fs.writeFile(backupPath, JSON.stringify({
            metadata: {
                ...current.metadata,
                backupType: 'pre_rollback',
                backupTimestamp: timestamp,
                originalVersion: currentVersion
            },
            content: current.content
        }, null, 2), 'utf-8');

        return { backupPath, timestamp, version: currentVersion };
    }

    /**
     * Parse plan information from path
     * パスからプラン情報解析
     * Phân tích thông tin plan từ đường dẫn
     */
    _parsePlanInfo(planPath) {
        const parts = planPath.split('/');
        const fileName = parts[parts.length - 1];
        const planName = fileName.replace(/\.md$/, '');

        return {
            planName,
            feature: parts[parts.length - 3] || 'unknown',
            subFeature: parts[parts.length - 2] || 'unknown',
            fullPath: planPath
        };
    }

    /**
     * Get version file path
     * バージョンファイルパス取得
     * Lấy đường dẫn file phiên bản
     */
    _getVersionPath(planInfo, version) {
        return path.join(
            this.config.storageRoot,
            planInfo.feature,
            planInfo.subFeature,
            `${planInfo.planName}-v${version}.json`
        );
    }

    /**
     * Load metadata for a plan
     * プランのメタデータ読み込み
     * Đọc metadata cho plan
     */
    async _loadMetadata(feature, subFeature) {
        const metadataPath = path.join(this.config.storageRoot, feature, subFeature, 'metadata.json');

        try {
            const content = await fs.readFile(metadataPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            // Return default metadata if file doesn't exist
            return {
                feature,
                subFeature,
                currentVersion: '0.0.0',
                versionHistory: [],
                rollbackHistory: []
            };
        }
    }

    /**
     * Update metadata with new version
     * 新バージョンでメタデータ更新
     * Cập nhật metadata với phiên bản mới
     */
    async _updateMetadata(planInfo, newVersion, versionMetadata) {
        const metadata = await this._loadMetadata(planInfo.feature, planInfo.subFeature);

        metadata.currentVersion = newVersion;
        metadata.versionHistory = metadata.versionHistory || [];
        metadata.versionHistory.push({
            version: newVersion,
            timestamp: versionMetadata.timestamp,
            author: versionMetadata.author,
            changeType: versionMetadata.changeType,
            rationale: versionMetadata.rationale,
            quality_score: versionMetadata.quality_score,
            filePath: `${planInfo.planName}-v${newVersion}.json`
        });

        await this._writeMetadata(planInfo, metadata);
    }

    /**
     * Write metadata to file
     * メタデータをファイルに書き込み
     * Ghi metadata vào file
     */
    async _writeMetadata(planInfo, metadata) {
        const metadataPath = path.join(this.config.storageRoot, planInfo.feature, planInfo.subFeature, 'metadata.json');
        await this._ensureDirectory(path.dirname(metadataPath));
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    }

    /**
     * Update global version registry
     * グローバルバージョンレジストリ更新
     * Cập nhật registry phiên bản toàn cục
     */
    async _updateGlobalRegistry() {
        const globalPath = path.join(this.config.storageRoot, 'metadata.json');

        try {
            const content = await fs.readFile(globalPath, 'utf-8');
            const registry = JSON.parse(content);
            registry.lastUpdated = new Date().toISOString();
            await fs.writeFile(globalPath, JSON.stringify(registry, null, 2), 'utf-8');
        } catch (error) {
            // Create new registry if doesn't exist
            const registry = {
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                totalPlans: 0,
                totalVersions: 0
            };
            await this._ensureDirectory(path.dirname(globalPath));
            await fs.writeFile(globalPath, JSON.stringify(registry, null, 2), 'utf-8');
        }
    }

    /**
     * Get version content
     * バージョンコンテンツ取得
     * Lấy nội dung phiên bản
     */
    async _getVersionContent(planInfo, version) {
        if (version === '0.0.0') return null;

        try {
            const result = await this.get(path.join(planInfo.feature, planInfo.subFeature, planInfo.planName), version);
            return result.success ? result.content : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Ensure directory exists
     * ディレクトリ存在確認
     * Đảm bảo thư mục tồn tại
     */
    async _ensureDirectory(dirPath) {
        await fs.mkdir(dirPath, { recursive: true });
    }

    /**
     * Sort version history
     * バージョン履歴ソート
     * Sắp xếp lịch sử phiên bản
     */
    _sortVersionHistory(history, sortBy) {
        const sorted = [...history];

        switch (sortBy) {
            case 'timestamp':
                sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                break;
            case 'quality':
                sorted.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));
                break;
            case 'version':
                sorted.sort((a, b) => this._compareVersions(b.version, a.version));
                break;
        }

        return sorted;
    }

    /**
     * Compare version numbers
     * バージョン番号比較
     * So sánh số phiên bản
     */
    _compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }

        return 0;
    }

    /**
     * Format version list for CLI display
     * CLI表示用バージョン一覧フォーマット
     * Định dạng danh sách phiên bản cho CLI
     */
    _formatVersionListCLI(planName, history, metadata) {
        let output = `📋 VERSION HISTORY: ${planName}\n\n`;

        for (const version of history) {
            const isCurrent = version.version === metadata.currentVersion;
            output += `v${version.version}${isCurrent ? ' (current)' : ''} - ${version.timestamp}\n`;
            output += `   ${version.rationale || 'Initial version'}\n`;
            output += `   Quality: ${version.quality_score || 0}%\n`;
            output += `\n`;
        }

        return output;
    }

    /**
     * Format version list for markdown
     * マークダウン用バージョン一覧フォーマット
     * Định dạng danh sách phiên bản cho markdown
     */
    _formatVersionListMarkdown(planName, history, metadata) {
        let output = `# Version History: ${planName}\n\n`;
        output += `| Version | Date | Quality | Rationale |\n`;
        output += `|---------|------|---------|----------|\n`;

        for (const version of history) {
            const isCurrent = version.version === metadata.currentVersion ? ' ⭐' : '';
            output += `| v${version.version}${isCurrent} | ${version.timestamp} | ${version.quality_score || 0}% | ${version.rationale || 'Initial version'} |\n`;
        }

        return output;
    }
}

module.exports = { PlanVersionManager };
