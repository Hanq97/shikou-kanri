#!/usr/bin/env node

/**
 * Helper script for /recall command
 *
 * Cross-platform (Windows, Linux, macOS) memory recall utility
 * Lists available memories for the current git branch
 *
 * Usage:
 *   node recall-helper.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error('❌ Not a git repository');
    process.exit(1);
  }
}

function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error('❌ Failed to get current branch');
    process.exit(1);
  }
}

function formatFileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const size = stats.size;
    const modified = stats.mtime.toISOString().split('T')[0];

    // Format size
    let sizeStr;
    if (size < 1024) {
      sizeStr = `${size}B`;
    } else if (size < 1024 * 1024) {
      sizeStr = `${(size / 1024).toFixed(1)}KB`;
    } else {
      sizeStr = `${(size / (1024 * 1024)).toFixed(1)}MB`;
    }

    return `${modified}  ${sizeStr.padEnd(8)}  ${fileName}`;
  } catch (error) {
    return `Error reading file: ${path.basename(filePath)}`;
  }
}

function listMemories(memoryPath) {
  if (!fs.existsSync(memoryPath)) {
    console.log('❌ No memories found for current branch');
    return;
  }

  try {
    const entries = fs.readdirSync(memoryPath, { withFileTypes: true });

    if (entries.length === 0) {
      console.log('📭 Memory bank is empty');
      return;
    }

    // Separate directories and files
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    const files = entries.filter(e => e.isFile()).map(e => e.name);

    // List directories first
    if (dirs.length > 0) {
      console.log('📁 Directories:');
      dirs.sort().forEach(dir => {
        const dirPath = path.join(memoryPath, dir);
        const fileCount = fs.readdirSync(dirPath).length;
        console.log(`   ${dir}/ (${fileCount} items)`);
      });
      console.log('');
    }

    // List files
    if (files.length > 0) {
      console.log('📄 Files:');
      files.sort().forEach(file => {
        const filePath = path.join(memoryPath, file);
        console.log(`   ${formatFileInfo(filePath)}`);
      });
    }
  } catch (error) {
    console.error('❌ Error reading memory bank:', error.message);
  }
}

function main() {
  const root = getGitRoot();
  const branch = getCurrentBranch();
  const memoryPath = path.join(root, '.claude', 'memory-bank', branch);

  console.log(`📍 Branch: ${branch}`);
  console.log(`📁 Memory Path: ${memoryPath}`);
  console.log('');
  console.log('📚 Available memories:');
  console.log('');

  listMemories(memoryPath);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { getGitRoot, getCurrentBranch, listMemories };
