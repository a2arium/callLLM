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

async function fixCorruptedDeclarationsInFile(filePath) {
  console.log(`Processing: ${filePath}`);
  let content = await fs.readFile(filePath, 'utf8');
  const originalContent = content;
  
  try {
    // Fix common patterns of corrupted variable declarations
    
    // Pattern: const mockWriteFile = jconst mockStatSync_4 = jest.fn();= jest.fn();
    content = content.replace(
      /(const\s+\w+\s*=\s*j)(const\s+\w+\s*=\s*jest\.fn\(\)[^;]*);(=\s*jest\.fn\(\)[^;]*);/g,
      '$1est.fn(); $2'
    );
    
    // Pattern: .OpenAI().images.generate; - broken method chains
    content = content.replace(
      /(\.\w+\(\)\.\w+)\.(\w+);(?!\s*\()/g,
      '$1.$2();'
    );
    
    // Fix duplicate declarations of identifiers
    // Pattern: Identifier 'logger' has already been declared
    content = content.replace(
      /(import\s*{\s*[^}]*logger[^}]*}\s*from\s*['"][^'"]+['"][^;]*;)([^]*?)(import\s*{\s*[^}]*logger[^}]*}\s*from)/g,
      (match, firstImport, between, secondImport) => {
        // If there are two imports with logger, keep only the first one
        // and remove logger from the second import
        const modifiedSecondImport = secondImport.replace(/logger,?\s*/, '');
        return `${firstImport}${between}${modifiedSecondImport}`;
      }
    );
    
    // Fix declarations that have become nested or mixed
    content = content.replace(
      /(await\s+adapte)(const\s+\w+\s*=\s*{[^}]*}\s*;)([^;]*);/g,
      '$1r$3;\n$2'
    );
    
    // Fix corrupted object property assignments
    content = content.replace(
      /(\(adapter\s+as)(\s*const\s+\w+\s*=\s*{[^}]*}\s*;)([^\)]*)\)/g,
      '$1 any);\n$2'
    );
    
    // Fix broken mock declarations
    content = content.replace(
      /(const\s+mockStreamableHTTPClientTransport)(\s*const\s+\w+\s*=\s*jest\.fn\(\)[^;]*;)([^;]*=\s*jest\.fn\(\);)/g,
      '$1 = jest.fn();\n$2'
    );
    
    // Fix broken string literals in error messages
    content = content.replace(
      /(new\s+Error\(['"])([^'"]*)const\s+\w+\s*=\s*{[^}]*}\s*;([^'"]*['"]\))/g,
      (match, start, middle, end) => {
        // Extract the mock declaration
        const mockDecl = middle.match(/const\s+\w+\s*=\s*{[^}]*}\s*;/);
        if (mockDecl) {
          const errorMsg = middle.replace(mockDecl[0], '');
          return `${start}${errorMsg}${end}\n${mockDecl[0]}`;
        }
        return match;
      }
    );
    
    // Fix broken it() test declarations
    content = content.replace(
      /(it\(['"])([^'"]*)const\s+\w+\s*=\s*{[^}]*}\s*;([^'"]*['"]\))/g,
      (match, start, middle, end) => {
        // Extract the mock declaration
        const mockDecl = middle.match(/const\s+\w+\s*=\s*{[^}]*}\s*;/);
        if (mockDecl) {
          const testName = middle.replace(mockDecl[0], '');
          return `${start}${testName}${end}\n${mockDecl[0]}`;
        }
        return match;
      }
    );

    // Fix 'je' errors specifically
    content = content.replace(
      /\bje\b/g,
      'jest.fn()'
    );
    
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
    
    // Fix missing closing braces and closing parentheses
    let braceCount = 0;
    let parenCount = 0;
    
    for (const char of content) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
    }
    
    // Add any missing closing braces or parentheses
    if (braceCount > 0) {
      content += '\\n' + '}'.repeat(braceCount);
    }
    
    if (parenCount > 0) {
      content += '\\n' + ')'.repeat(parenCount);
    }
    
    // If content has changed, write it back
    if (content !== originalContent) {
      // Create backup of the original file
      await fs.writeFile(`${filePath}.bak`, originalContent, 'utf8');
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed corrupted declarations in: ${filePath}`);
      return 1; // Success
    }
    
    console.log(`No corrupted declarations found in: ${filePath}`);
    return 0; // No changes
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return 0; // Failed
  }
}

// Main execution
async function main() {
  try {
    console.log('Starting to fix corrupted declarations in test files...');
    
    const testDir = path.resolve(process.cwd(), 'src/tests');
    const testFiles = await findTestFiles(testDir);
    console.log(`Found ${testFiles.length} test files to process`);
    
    let successCount = 0;
    for (const file of testFiles) {
      successCount += await fixCorruptedDeclarationsInFile(file);
    }
    
    console.log(`\\nFix complete! Successfully updated ${successCount} of ${testFiles.length} test files.`);
    console.log('To run the tests, use: NODE_OPTIONS="--experimental-vm-modules" yarn test');
    
    // Check if there are backup files
    if (successCount > 0) {
      console.log('\\nBackup files have been created with .bak extension.');
      console.log('If everything works correctly, you can remove them with:');
      console.log('find src/tests -name "*.bak" -delete');
    }
  } catch (error) {
    console.error('Error processing files:', error);
    process.exit(1);
  }
}

main(); 