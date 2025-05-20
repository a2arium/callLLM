// ESM Update Script - Adds .js extensions to all internal TypeScript imports
// Run with: node scripts/update-imports.js

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

// Matches: import { X } from 'path'; or import X from 'path';
// But only captures internal paths (not node_modules)
const IMPORT_REGEX = /import\s+(?:(?:{[^}]+})|(?:[^{}\s]+))\s+from\s+['"]([^'"]+)['"]/g;

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

async function processFile(file) {
  // Only process TypeScript files in src directory
  if (!file.endsWith('.ts') || !file.includes('/src/')) {
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
    const files = await getFiles(resolve(rootDir, 'src'));
    let totalChanges = 0;
    let totalFilesChanged = 0;

    for (const file of files) {
      const changed = await processFile(file);
      if (changed) totalFilesChanged++;
    }

    console.log(`\nUpdated ${totalFilesChanged} files with .js extensions for ESM compatibility.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 