#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixSharpMock() {
  const filePath = path.resolve(process.cwd(), 'src/tests/unit/core/file-data/fileData.test.ts');
  console.log(`Processing: ${filePath}`);
  
  try {
    // Read the file content
    const content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;
    
    // Create a backup of the original file
    await fs.writeFile(`${filePath}.bak`, originalContent, 'utf8');
    
    // Fix the sharp mock
    const fixedContent = content.replace(
      /sharpInstance\.metadata\.mockResolvedValue/g,
      'jest.spyOn(sharpInstance, "metadata").mockResolvedValue'
    );
    
    // Write the fixed content back to the file
    await fs.writeFile(filePath, fixedContent, 'utf8');
    
    console.log(`✅ Fixed Sharp mock in: ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

// Main execution
async function main() {
  try {
    console.log('Starting to fix Sharp mock in fileData.test.ts...');
    await fixSharpMock();
    console.log('\nFix complete! Now run the tests with:');
    console.log('NODE_OPTIONS="--experimental-vm-modules" yarn test');
  } catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
  }
}

main(); 