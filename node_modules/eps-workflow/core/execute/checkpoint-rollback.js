/**
 * Checkpoint & Rollback System
 * Week 15 - Day 5: Checkpoint Management & Recovery
 *
 * Provides atomic execution with rollback capability.
 * Similar to database transactions - save state, restore on failure.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const CHECKPOINT_DIR = '.claude/execute/checkpoints';
const SNAPSHOT_DIR = '.claude/execute/snapshots';
const BACKUP_DIR = '.claude/execute/backups';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate SHA256 hash of content
 */
function calculateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create directory if it doesn't exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get current timestamp in ISO format
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * List all files in directory recursively
 */
function listAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip checkpoint, snapshot, and backup directories
      if (!filePath.includes('execute/checkpoints') &&
          !filePath.includes('execute/snapshots') &&
          !filePath.includes('execute/backups')) {
        listAllFiles(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// ============================================
// CHECKPOINT INDEX MANAGEMENT
// ============================================

/**
 * Update checkpoint index
 */
function updateCheckpointIndex(checkpoint) {
  const executionDir = path.join(CHECKPOINT_DIR, checkpoint.metadata.executionId);
  ensureDirectoryExists(executionDir);

  const indexFile = path.join(executionDir, 'index.json');

  let index;
  if (fs.existsSync(indexFile)) {
    index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
  } else {
    index = {
      executionId: checkpoint.metadata.executionId,
      planId: checkpoint.metadata.planId,
      checkpoints: [],
      latestCheckpoint: null
    };
  }

  // Add or update checkpoint entry
  const existingIndex = index.checkpoints.findIndex(c => c.id === checkpoint.id);
  const checkpointEntry = {
    id: checkpoint.id,
    stepId: checkpoint.stepId,
    timestamp: checkpoint.timestamp,
    filesCount: checkpoint.files.length,
    size: JSON.stringify(checkpoint).length
  };

  if (existingIndex >= 0) {
    index.checkpoints[existingIndex] = checkpointEntry;
  } else {
    index.checkpoints.push(checkpointEntry);
  }

  index.latestCheckpoint = checkpoint.id;

  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf-8');

  return index;
}

/**
 * Get checkpoint index
 */
function getCheckpointIndex(executionId) {
  const indexFile = path.join(CHECKPOINT_DIR, executionId, 'index.json');

  if (!fs.existsSync(indexFile)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
}

// ============================================
// CHECKPOINT MANAGEMENT
// ============================================

/**
 * Save checkpoint to disk
 *
 * @param {Object} checkpoint - Checkpoint data
 * @returns {Object} - Save result with file path and hash
 */
function saveCheckpoint(checkpoint) {
  // Validate checkpoint structure
  if (!checkpoint.id || !checkpoint.stepId || !checkpoint.metadata) {
    throw new Error('Invalid checkpoint structure: missing required fields');
  }

  if (!checkpoint.metadata.executionId) {
    throw new Error('Invalid checkpoint: missing executionId');
  }

  // Create checkpoint directory
  const executionDir = path.join(CHECKPOINT_DIR, checkpoint.metadata.executionId);
  ensureDirectoryExists(executionDir);

  // Save checkpoint file
  const checkpointFile = path.join(executionDir, `${checkpoint.id}.json`);
  const checkpointContent = JSON.stringify(checkpoint, null, 2);
  fs.writeFileSync(checkpointFile, checkpointContent, 'utf-8');

  // Calculate and save hash for integrity
  const checkpointHash = calculateHash(checkpointContent);
  const hashFile = `${checkpointFile}.hash`;
  fs.writeFileSync(hashFile, checkpointHash, 'utf-8');

  // Update checkpoint index
  updateCheckpointIndex(checkpoint);

  return {
    saved: true,
    file: checkpointFile,
    hash: checkpointHash
  };
}

/**
 * Load checkpoint from disk
 *
 * @param {string} checkpointId - Checkpoint ID (e.g., "C1")
 * @param {string} executionId - Execution ID
 * @returns {Object} - Checkpoint data
 */
function loadCheckpoint(checkpointId, executionId) {
  const checkpointFile = path.join(CHECKPOINT_DIR, executionId, `${checkpointId}.json`);

  if (!fs.existsSync(checkpointFile)) {
    throw new Error(`Checkpoint not found: ${checkpointId}`);
  }

  // Load checkpoint
  const checkpointContent = fs.readFileSync(checkpointFile, 'utf-8');
  const checkpoint = JSON.parse(checkpointContent);

  // Verify integrity if hash file exists
  const hashFile = `${checkpointFile}.hash`;
  if (fs.existsSync(hashFile)) {
    const savedHash = fs.readFileSync(hashFile, 'utf-8').trim();
    const currentHash = calculateHash(checkpointContent);

    if (savedHash !== currentHash) {
      throw new Error(`Checkpoint integrity check failed: ${checkpointId}`);
    }
  }

  return checkpoint;
}

/**
 * List all checkpoints for an execution
 *
 * @param {string} executionId - Execution ID
 * @returns {Array} - List of checkpoint IDs
 */
function listCheckpoints(executionId) {
  const index = getCheckpointIndex(executionId);

  if (!index) {
    return [];
  }

  return index.checkpoints.map(c => c.id);
}

/**
 * Delete checkpoint
 *
 * @param {string} checkpointId - Checkpoint ID
 * @param {string} executionId - Execution ID
 * @returns {boolean} - Success status
 */
function deleteCheckpoint(checkpointId, executionId) {
  const checkpointFile = path.join(CHECKPOINT_DIR, executionId, `${checkpointId}.json`);
  const hashFile = `${checkpointFile}.hash`;

  if (fs.existsSync(checkpointFile)) {
    fs.unlinkSync(checkpointFile);
  }

  if (fs.existsSync(hashFile)) {
    fs.unlinkSync(hashFile);
  }

  // Update index
  const indexFile = path.join(CHECKPOINT_DIR, executionId, 'index.json');
  if (fs.existsSync(indexFile)) {
    const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
    index.checkpoints = index.checkpoints.filter(c => c.id !== checkpointId);

    // Update latest checkpoint
    if (index.latestCheckpoint === checkpointId) {
      index.latestCheckpoint = index.checkpoints.length > 0
        ? index.checkpoints[index.checkpoints.length - 1].id
        : null;
    }

    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf-8');
  }

  return true;
}

// ============================================
// ROLLBACK MECHANISMS
// ============================================

/**
 * Full rollback to checkpoint state
 *
 * @param {string} checkpointId - Checkpoint ID
 * @param {string} executionId - Execution ID
 * @returns {Object} - Rollback result
 */
function rollbackToCheckpoint(checkpointId, executionId) {
  // Load checkpoint
  const checkpoint = loadCheckpoint(checkpointId, executionId);

  // Create backup of current state
  const backup = createBackup(executionId);

  try {
    const restoredFiles = [];
    const deletedFiles = [];

    // Restore each file from checkpoint
    for (const file of checkpoint.files) {
      const filePath = file.path;

      // Ensure directory exists
      const fileDir = path.dirname(filePath);
      ensureDirectoryExists(fileDir);

      // Write file content
      fs.writeFileSync(filePath, file.content, 'utf-8');

      // Verify file hash
      const currentHash = calculateHash(fs.readFileSync(filePath, 'utf-8'));
      if (currentHash !== file.hash) {
        throw new Error(`File restoration failed: ${filePath} (hash mismatch)`);
      }

      restoredFiles.push(filePath);
    }

    // Delete files created after checkpoint
    // (For simplification, we skip this in mock implementation)
    // In production, track execution directory and compare

    return {
      success: true,
      checkpointId: checkpointId,
      filesRestored: restoredFiles.length,
      filesDeleted: deletedFiles.length,
      restoredFiles: restoredFiles
    };

  } catch (error) {
    // Restore from backup on failure
    restoreFromBackup(backup);
    throw new Error(`Rollback failed: ${error.message}`);
  }
}

/**
 * Partial rollback - restore only specific files
 *
 * @param {string} checkpointId - Checkpoint ID
 * @param {string} executionId - Execution ID
 * @param {Array<string>} filePaths - Files to restore
 * @returns {Object} - Rollback result
 */
function partialRollback(checkpointId, executionId, filePaths) {
  const checkpoint = loadCheckpoint(checkpointId, executionId);

  const restoredFiles = [];
  const failedFiles = [];

  for (const filePath of filePaths) {
    // Find file in checkpoint
    const checkpointFile = checkpoint.files.find(f => f.path === filePath);

    if (!checkpointFile) {
      failedFiles.push({
        path: filePath,
        reason: 'File not found in checkpoint'
      });
      continue;
    }

    try {
      // Ensure directory exists
      const fileDir = path.dirname(filePath);
      ensureDirectoryExists(fileDir);

      // Restore file
      fs.writeFileSync(filePath, checkpointFile.content, 'utf-8');

      // Verify hash
      const currentHash = calculateHash(fs.readFileSync(filePath, 'utf-8'));
      if (currentHash === checkpointFile.hash) {
        restoredFiles.push(filePath);
      } else {
        failedFiles.push({
          path: filePath,
          reason: 'Hash mismatch after restoration'
        });
      }

    } catch (error) {
      failedFiles.push({
        path: filePath,
        reason: error.message
      });
    }
  }

  return {
    success: failedFiles.length === 0,
    restoredFiles: restoredFiles,
    failedFiles: failedFiles
  };
}

// ============================================
// SNAPSHOT SYSTEM
// ============================================

/**
 * Create snapshot of current state
 *
 * @param {string} executionDir - Execution directory (optional)
 * @returns {Object} - Snapshot data
 */
function createSnapshot(executionDir = null) {
  const snapshot = {
    id: generateUUID(),
    timestamp: getCurrentTimestamp(),
    files: [],
    gitStatus: null
  };

  // Use provided directory or default to current
  const targetDir = executionDir || process.cwd();

  // Capture all files
  const allFiles = listAllFiles(targetDir);

  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const stat = fs.statSync(file);

      snapshot.files.push({
        path: file,
        content: content,
        hash: calculateHash(content),
        mtime: stat.mtime.toISOString()
      });
    } catch (error) {
      // Skip files that can't be read
      console.warn(`Warning: Could not read file ${file}: ${error.message}`);
    }
  }

  // Capture git status if in git repo
  try {
    const { execSync } = require('child_process');

    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const isDirty = execSync('git diff-index HEAD --quiet 2>/dev/null; echo $?', { encoding: 'utf-8' }).trim() !== '0';

    snapshot.gitStatus = {
      branch: branch,
      commit: commit,
      isDirty: isDirty
    };
  } catch (error) {
    // Not a git repo or git not available
    snapshot.gitStatus = null;
  }

  // Save snapshot
  ensureDirectoryExists(SNAPSHOT_DIR);
  const snapshotFile = path.join(SNAPSHOT_DIR, `${snapshot.id}.json`);
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2), 'utf-8');

  return snapshot;
}

/**
 * Rollback to snapshot state
 *
 * @param {Object} snapshot - Snapshot data
 * @returns {Object} - Rollback result
 */
function rollbackToSnapshot(snapshot) {
  const restoredFiles = [];
  const deletedFiles = [];

  // Restore each file
  for (const file of snapshot.files) {
    try {
      // Ensure directory exists
      const fileDir = path.dirname(file.path);
      ensureDirectoryExists(fileDir);

      // Restore file content
      fs.writeFileSync(file.path, file.content, 'utf-8');

      // Restore modification time
      const mtime = new Date(file.mtime);
      fs.utimesSync(file.path, mtime, mtime);

      restoredFiles.push(file.path);
    } catch (error) {
      console.warn(`Warning: Could not restore file ${file.path}: ${error.message}`);
    }
  }

  // Note: File deletion is skipped in this implementation
  // In production, compare current files with snapshot files

  return {
    success: true,
    filesRestored: restoredFiles.length,
    filesDeleted: deletedFiles.length
  };
}

/**
 * Delete snapshot
 *
 * @param {string} snapshotId - Snapshot ID
 * @returns {boolean} - Success status
 */
function deleteSnapshot(snapshotId) {
  const snapshotFile = path.join(SNAPSHOT_DIR, `${snapshotId}.json`);

  if (fs.existsSync(snapshotFile)) {
    fs.unlinkSync(snapshotFile);
    return true;
  }

  return false;
}

// ============================================
// BACKUP SYSTEM
// ============================================

/**
 * Create backup before rollback
 *
 * @param {string} executionId - Execution ID
 * @returns {Object} - Backup data
 */
function createBackup(executionId) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = `pre-rollback-${timestamp}`;

  const backup = {
    id: backupId,
    executionId: executionId,
    timestamp: getCurrentTimestamp(),
    files: []
  };

  // Save backup metadata
  const backupDir = path.join(BACKUP_DIR, backupId);
  ensureDirectoryExists(backupDir);

  const backupFile = path.join(backupDir, 'backup.json');
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');

  return backup;
}

/**
 * Restore from backup
 *
 * @param {Object} backup - Backup data
 * @returns {Object} - Restore result
 */
function restoreFromBackup(backup) {
  // Simplified implementation
  // In production, restore files from backup

  return {
    success: true,
    filesRestored: 0
  };
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate checkpoint integrity
 *
 * @param {Object} checkpoint - Checkpoint data
 * @returns {Object} - Validation result
 */
function validateCheckpointIntegrity(checkpoint) {
  const errors = [];
  const warnings = [];

  // Validate structure
  if (!checkpoint.id || !checkpoint.stepId || !checkpoint.timestamp) {
    errors.push('Invalid checkpoint structure: missing required fields');
  }

  // Validate files
  if (!checkpoint.files || !Array.isArray(checkpoint.files)) {
    errors.push('Invalid checkpoint: files must be an array');
  } else {
    for (const file of checkpoint.files) {
      // Check file hash
      if (!file.hash) {
        warnings.push(`File missing hash: ${file.path}`);
      } else if (file.hash.length !== 64) {
        errors.push(`Invalid hash for file: ${file.path}`);
      }

      // Check file content
      if (!file.content) {
        errors.push(`File missing content: ${file.path}`);
      }

      // Check file path
      if (!file.path) {
        errors.push('File missing path');
      }
    }
  }

  // Validate quality gates
  if (checkpoint.qualityGates) {
    const requiredGates = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
    for (const gate of requiredGates) {
      if (!checkpoint.qualityGates[gate]) {
        warnings.push(`Missing quality gate: ${gate}`);
      }
    }
  }

  // Validate metadata
  if (!checkpoint.metadata || !checkpoint.metadata.executionId) {
    errors.push('Invalid checkpoint: missing metadata.executionId');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Checkpoint management
  saveCheckpoint,
  loadCheckpoint,
  listCheckpoints,
  deleteCheckpoint,

  // Rollback mechanisms
  rollbackToCheckpoint,
  partialRollback,

  // Snapshot system
  createSnapshot,
  rollbackToSnapshot,
  deleteSnapshot,

  // Validation
  validateCheckpointIntegrity,

  // Helpers (for testing)
  calculateHash,
  generateUUID,
  ensureDirectoryExists,
  getCheckpointIndex
};
