#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find all test files recursively
async function findTestFiles(dir) {
  console.log(`Searching in directory: ${dir}`);
  const files = await fs.readdir(dir, { withFileTypes: true });
  const testFiles = [];
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      testFiles.push(...await findTestFiles(fullPath));
    } else if (file.name.endsWith('.test.ts') || file.name.endsWith('.test.tsx')) {
      testFiles.push(fullPath);
    }
  }
  
  return testFiles;
}

async function fixMissingSemicolonsInFile(filePath) {
  console.log(`Processing: ${filePath}`);
  let content = await fs.readFile(filePath, 'utf8');
  const originalContent = content;
  
  try {
    // Fix patterns like: jest.fn()const ... or jest.fn()jest.fn()
    // This finds mock function declarations without semicolons between them
    content = content.replace(
      /(\bjest\.fn\(\))(\s*)(const|\bjest\.fn)/g,
      '$1;$2$3'
    );
    
    // Fix patterns where there might be corrupt/mixed declarations
    content = content.replace(
      /(const\s+\w+\s*=\s*j)(const\s+\w+\s*=\s*jest\.fn)/g,
      '$1est.fn(); $2'
    );
    
    // Fix other common patterns of missing semicolons
    content = content.replace(
      /(\}\))(\s*)(const|\bjest\.fn)/g,
      '$1;$2$3'
    );

    // Fix missing semicolons at line ends followed by a variable declaration
    content = content.replace(
      /(\))(\s*\n\s*)(const\s+\w+)/g,
      '$1;$2$3'
    );

    // If content has changed, write it back
    if (content !== originalContent) {
      // Create backup of the original file
      await fs.writeFile(`${filePath}.bak`, originalContent, 'utf8');
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed missing semicolons in: ${filePath}`);
      return 1; // Success
    }
    
    console.log(`No semicolon issues found in: ${filePath}`);
    return 0; // No changes
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return 0; // Failed
  }
}

// Main execution
async function main() {
  try {
    console.log('Starting to fix missing semicolons in test files...');
    
    const testDir = path.resolve(process.cwd(), 'src/tests');
    const testFiles = await findTestFiles(testDir);
    console.log(`Found ${testFiles.length} test files to process`);
    
    let successCount = 0;
    for (const file of testFiles) {
      successCount += await fixMissingSemicolonsInFile(file);
    }
    
    console.log(`\nFix complete! Successfully updated ${successCount} of ${testFiles.length} test files.`);
    console.log('To run the tests, use: NODE_OPTIONS="--experimental-vm-modules" yarn test');
    
    // Check if there are backup files
    if (successCount > 0) {
      console.log('\nBackup files have been created with .bak extension.');
      console.log('If everything works correctly, you can remove them with:');
      console.log('find src/tests -name "*.bak" -delete');
    }
  } catch (error) {
    console.error('Error processing files:', error);
    process.exit(1);
  }
}

main(); 