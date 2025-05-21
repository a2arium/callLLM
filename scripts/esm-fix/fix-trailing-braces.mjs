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

async function fixTrailingBracesInFile(filePath) {
  console.log(`Processing: ${filePath}`);
  let content = await fs.readFile(filePath, 'utf8');
  const originalContent = content;
  
  try {
    // Remove trailing unbalanced braces and parentheses (}}}, )))
    content = content.replace(/\n\s*[})\]]{2,}\s*$/g, '\n}');
    
    // Check for the import modules that have double semicolons (let Module;;)
    content = content.replace(/let\s+\w+\s*;;/g, match => match.replace(';;', ';'));
    
    // Remove any standalone 'st.fn()' occurrences which appear to be fragments of corrupted mocks
    content = content.replace(/st\.fn\(\);/g, '');
    
    // Fix missing semicolons between function declarations
    content = content.replace(/\)\s*const\s+/g, ');\nconst ');
    
    // If content has changed, write it back
    if (content !== originalContent) {
      // Create backup of the original file
      await fs.writeFile(`${filePath}.bak`, originalContent, 'utf8');
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed trailing braces/parentheses in: ${filePath}`);
      return 1; // Success
    }
    
    console.log(`No issues found in: ${filePath}`);
    return 0; // No changes
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return 0; // Failed
  }
}

// Main execution
async function main() {
  try {
    console.log('Starting to fix trailing braces/parentheses in test files...');
    
    const testDir = path.resolve(process.cwd(), 'src/tests');
    const testFiles = await findTestFiles(testDir);
    console.log(`Found ${testFiles.length} test files to process`);
    
    let successCount = 0;
    for (const file of testFiles) {
      successCount += await fixTrailingBracesInFile(file);
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