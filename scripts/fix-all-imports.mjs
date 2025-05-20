// Enhanced ESM Update Script - Adds .js extensions to all internal imports
// Fixes edge cases missed by the previous script
// Run with: node scripts/fix-all-imports.mjs

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return files.flat();
}

// Enhanced patterns to catch more import variations
const IMPORT_REGEX = /import\s+(?:(?:type\s+)?(?:{[^}]+})|(?:[^{}\s]+))\s+from\s+['"]([^'"]+)['"]/g;
const ADAPTERS_REGEX = /from\s+['"](.*?)adapters(?:\.js)?['"]/g;
const DYNAMIC_IMPORT_REGEX = /(?:await\s+)?import\(\s*['"]([^'"]+)['"]\s*\)/g;

// Checks if a path is an internal relative import
function isInternalRelativePath(path) {
  return (path.startsWith('./') || path.startsWith('../')) && 
         !path.endsWith('.js') && 
         !path.endsWith('.json') &&
         !path.endsWith('.css');
}

// Add .js extension to import path
function addJsExtension(importPath) {
  return `${importPath}.js`;
}

// Fix adapters import paths (adapters.js -> adapters/index.js)
function fixAdaptersPath(content) {
  return content.replace(ADAPTERS_REGEX, (match, prefix) => {
    return `from '${prefix}adapters/index.js'`;
  });
}

// Fix dynamic imports
function fixDynamicImports(content) {
  return content.replace(DYNAMIC_IMPORT_REGEX, (match, importPath) => {
    if (isInternalRelativePath(importPath)) {
      return match.replace(importPath, addJsExtension(importPath));
    }
    return match;
  });
}

async function processFile(file) {
  // Process all TypeScript files, including .d.ts files
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
    return false;
  }
  
  // Skip node_modules
  if (file.includes('node_modules/')) {
    return false;
  }

  console.log(`Processing ${file}...`);
  const content = await readFile(file, 'utf8');
  let modifiedContent = content;
  let changes = 0;

  // Replace internal relative imports with .js extension
  modifiedContent = modifiedContent.replace(IMPORT_REGEX, (match, importPath) => {
    if (isInternalRelativePath(importPath)) {
      changes++;
      return match.replace(importPath, addJsExtension(importPath));
    }
    return match;
  });

  // Fix adapters import paths
  const beforeAdapters = modifiedContent;
  modifiedContent = fixAdaptersPath(modifiedContent);
  if (beforeAdapters !== modifiedContent) {
    changes++;
  }

  // Fix dynamic imports
  const beforeDynamic = modifiedContent;
  modifiedContent = fixDynamicImports(modifiedContent);
  if (beforeDynamic !== modifiedContent) {
    changes++;
  }

  // Only write if changes were made
  if (changes > 0) {
    await writeFile(file, modifiedContent, 'utf8');
    console.log(`Updated ${changes} imports in ${file}`);
    return true;
  }
  
  return false;
}

async function main() {
  try {
    console.log("Finding all TypeScript files...");
    const files = await getFiles(resolve(rootDir, 'src'));
    
    // Also process example files
    const exampleFiles = await getFiles(resolve(rootDir, 'examples'));
    const allFiles = [...files, ...exampleFiles];
    
    let totalFilesChanged = 0;

    console.log(`Found ${allFiles.length} files to check.`);
    
    for (const file of allFiles) {
      const changed = await processFile(file);
      if (changed) totalFilesChanged++;
    }

    console.log(`\nUpdated ${totalFilesChanged} files with .js extensions for ESM compatibility.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 