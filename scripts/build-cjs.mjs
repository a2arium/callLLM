#!/usr/bin/env node

/**
 * This script processes the CJS build output after TypeScript compilation
 * to ensure proper handling of ESM-specific features in a CommonJS environment
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Source and target directories
const SRC_DIR = path.join(rootDir, 'src');
const CJS_DIR = path.join(rootDir, 'dist', 'cjs');

/**
 * Main function to build the CJS version
 */
async function buildCJS() {
  try {
    console.log('Building CJS version...');

    // Temporary replace ESM-specific files with CJS-compatible versions
    // This is primarily for importMetaUrl.ts to have a benign placeholder 
    // during the initial tsc pass, ensuring the .cjs.ts version is distinctly handled.
    await createTemporaryFiles();

    try {
      // Run TypeScript compiler with CJS configuration
      // This will compile all .ts files, including the .cjs.ts files.
      await runTSC();
    } finally {
      // Restore the original files
      await restoreOriginalFiles();
    }

    // Post-process the CJS build
    await processCJSBuild();

    console.log('CJS build completed successfully!');
  } catch (error) {
    console.error('Error in CJS build:', error);
    process.exit(1);
  }
}

/**
 * Run TypeScript compiler with CJS configuration
 */
async function runTSC() {
  return new Promise((resolve, reject) => {
    const tscCommand = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
    const tsc = spawn(tscCommand, ['--project', 'tsconfig.cjs.json'], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    tsc.on('close', (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`TypeScript compiler failed with code ${code}`));
      }
    });
  });
}

/**
 * Create temporary files that are compatible with CJS
 */
async function createTemporaryFiles() {
  console.log('Creating temporary CJS-compatible files...');

  const files = [
    {
      path: path.join(SRC_DIR, 'utils', 'importMetaUrl.ts'),
      backup: path.join(SRC_DIR, 'utils', 'importMetaUrl.ts.bak'),
      content: `
/**
 * Utility for getting import.meta.url in a way that works with both ESM and CJS builds
 * This is a temporary CJS-compatible version for the build
 */

/**
 * Get import.meta.url for the current module
 * In ESM, this returns the actual import.meta.url
 * In CJS, this is a compatibility function that returns a file:// URL
 */
export function getImportMetaUrl(){
  return ''; // Placeholder during compilation
}`
    }
  ];

  for (const file of files) {
    if (await fileExists(file.path)) {
      await fs.copyFile(file.path, file.backup);
      console.log(`Backed up ${file.path} to ${file.backup}`);
      await fs.writeFile(file.path, file.content);
      console.log(`Created temporary version of ${file.path}`);
    }
  }
}

/**
 * Restore original files after compilation
 */
async function restoreOriginalFiles() {
  console.log('Restoring original files...');

  const files = [
    {
      path: path.join(SRC_DIR, 'utils', 'importMetaUrl.ts'),
      backup: path.join(SRC_DIR, 'utils', 'importMetaUrl.ts.bak')
    }
  ];

  for (const file of files) {
    if (await fileExists(file.backup)) {
      await fs.copyFile(file.backup, file.path);
      await fs.unlink(file.backup);
      console.log(`Restored original ${file.path}`);
    }
  }
}

/**
 * Main post-processing function for CJS build
 */
async function processCJSBuild() {
  try {
    console.log('Post-processing CJS build output...');

    await renameJsToCjs(CJS_DIR);
    await renameCompiledCJSTSFiles(path.join(CJS_DIR, 'utils'));
    await updateRequirePaths(CJS_DIR);
    await fixOpenAIDirnameConflict();

    console.log('CJS build post-processing completed successfully!');
  } catch (error) {
    console.error('Error in CJS build post-processing:', error);
    process.exit(1);
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rename all .js files to .cjs in the CJS build directory
 * This also handles files compiled from .cjs.ts, renaming them temporarily to .cjs.cjs
 */
async function renameJsToCjs(dir) {
  console.log(`Renaming .js files to .cjs in ${dir}...`);
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await renameJsToCjs(fullPath);
    } else if (entry.name.endsWith('.cjs.js')) { // Files compiled from .cjs.ts (e.g., importMetaUrl.cjs.js)
      const newPath = fullPath.replace(/\.cjs\.js$/, '.cjs.cjs'); // Rename to .cjs.cjs (e.g., importMetaUrl.cjs.cjs)
      await fs.rename(fullPath, newPath);
      console.log(`Renamed ${fullPath} to ${newPath} (intermediate for .cjs.ts file)`);
    } else if (entry.name.endsWith('.js')) { // All other .js files
      const newPath = fullPath.replace(/\.js$/, '.cjs');
      await fs.rename(fullPath, newPath);
      console.log(`Renamed ${fullPath} to ${newPath}`);
    }
  }
}

/**
 * Rename compiled .cjs.ts files (which are now .cjs.cjs) to their final .cjs names
 */
async function renameCompiledCJSTSFiles(dir) {
  console.log(`Renaming *.cjs.cjs files to *.cjs in ${dir}...`);
  if (!await fileExists(dir)) {
    console.log(`Directory ${dir} does not exist, skipping renameCompiledCJSTSFiles.`);
    return;
  }
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await renameCompiledCJSTSFiles(fullPath);
    } else if (entry.name.endsWith('.cjs.cjs')) {
      const finalName = entry.name.replace(/\.cjs\.cjs$/, '.cjs');
      const newPath = path.join(dir, finalName);
      await fs.rename(fullPath, newPath);
      console.log(`Renamed ${fullPath} to ${newPath}`);
    }
  }
}

/**
 * Update require paths once files are renamed to .cjs
 */
async function updateRequirePaths(dir) {
  console.log(`Updating require paths in ${dir} to use .cjs extension...`);
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await updateRequirePaths(fullPath);
    } else if (entry.name.endsWith('.cjs')) {
      if (entry.name === 'index.cjs') {
        console.log(`Processing for require path updates: ${fullPath}`);
      }
      try {
        let content = await fs.readFile(fullPath, 'utf8');
        let originalContent = content; // For logging changes

        content = content.replace(/\.js\.cjs/g, '.cjs'); // Clean up any .js.cjs occurrences

        const requireRegex = /require\((['"])((?:\.{1,2}\/)?(?:[^\'"\n\r]+\/)*[^\'"\n\r]+?)(\.js)?(\1)\)/g;
        let matchFound = false;

        content = content.replace(requireRegex, (match, quote, capturedModulePath, capturedJsExtension) => {
          matchFound = true;
          if (entry.name === 'index.cjs') {
            console.log(`  Match in index.cjs: ${match}, modulePath: ${capturedModulePath}, jsExtension: ${capturedJsExtension}`);
          }
          if (!capturedModulePath.startsWith('.') || capturedModulePath.endsWith('.cjs')) {
            if (entry.name === 'index.cjs') console.log(`    Skipping (not relative or already .cjs): ${capturedModulePath}`);
            return match;
          }
          // capturedModulePath is the path part, capturedJsExtension is either '.ts' or undefined.
          // We always want to transform to .cjs.
          const newModulePath = `${capturedModulePath}.cjs`;
          if (entry.name === 'index.cjs') {
            console.log(`    Replacing with: require(${quote}${newModulePath}${quote}) (original jsExtension: ${capturedJsExtension})`);
          }
          return `require(${quote}${newModulePath}${quote})`;
        });

        if (entry.name === 'index.cjs' && !matchFound) {
          console.log(`  No require paths matched regex in ${fullPath}`);
        }
        if (entry.name === 'index.cjs' && content !== originalContent) {
          console.log(`  Content of index.cjs was modified.`);
        }

        await fs.writeFile(fullPath, content, 'utf8');
      } catch (error) {
        console.error(`Error updating require paths in ${fullPath}:`, error);
      }
    }
  }
}

/**
 * Fix __dirname conflict in OpenAI adapter
 */
async function fixOpenAIDirnameConflict() {
  console.log('Checking/Fixing __dirname conflict in OpenAI adapter...');
  const adapterPath = path.join(CJS_DIR, 'adapters', 'openai', 'adapter.cjs');
  if (await fileExists(adapterPath)) {
    let content = await fs.readFile(adapterPath, 'utf8');
    let originalContent = content;
    let modified = false;

    // Pattern to find: const __dirname = (0, some_alias.getDirname)();
    const dirnameDeclarationPattern = /const __dirname = \(0, ([a-zA-Z0-9_]+)\.getDirname\)\(\);/;
    const match = content.match(dirnameDeclarationPattern);

    if (match) {
      const importAlias = match[1]; // e.g., paths_js_1
      console.log(`Found conflicting __dirname declaration in OpenAI adapter using alias: ${importAlias}`);

      // Replace the declaration
      content = content.replace(dirnameDeclarationPattern, `const customDirname = (0, ${importAlias}.getDirname)();`);

      // Replace usages of __dirname that were intended to use this new customDirname
      // This regex specifically targets path.resolve(__dirname, '../../../.env')
      // It assumes __dirname in this specific context was the one we just replaced.
      const usagePattern = /path\.resolve\(__dirname, ('|\")\.\.\/\.\.\/\.\.\/\.env('|\")\)/g;
      content = content.replace(usagePattern, (usageMatch, quote1, quote2) => {
        console.log(`Replacing dotenv path usage of __dirname with customDirname.`);
        return `path.resolve(customDirname, ${quote1}../../../.env${quote2})`;
      });

      modified = true;
    } else {
      console.log('Conflicting __dirname declaration pattern not found in OpenAI adapter.');
    }

    if (modified) {
      if (content === originalContent) {
        console.warn('OpenAI adapter: __dirname fix was attempted, but content did not change. Check patterns.');
      } else {
        console.log('Successfully applied __dirname fix to OpenAI adapter.');
        await fs.writeFile(adapterPath, content, 'utf8');
      }
    } else {
      console.log('No modifications made to OpenAI adapter for __dirname conflict.');
    }
  } else {
    console.log(`OpenAI adapter not found at ${adapterPath}, skipping __dirname fix.`);
  }
}

// Run the build
buildCJS().catch(console.error); 