#!/usr/bin/env node
/**
 * TypeScript's rewriteRelativeImportExtensions does not rewrite specifiers in emitted .d.ts
 * (see microsoft/TypeScript#61037). NodeNext consumers expect .js in declaration imports.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esmDir = path.join(rootDir, 'dist', 'esm');

/** Relative import/export specifiers only: ./ ../ ending in .ts / .mts / .cts */
const relativeSpecifier = /(\bfrom\s+)(['"])(\.\.?\/[^'"]+?)\.(ts|mts|cts)\2/g;

async function walkTransform(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walkTransform(fullPath);
        } else if (entry.name.endsWith('.d.ts')) {
            let content = await fs.readFile(fullPath, 'utf8');
            const original = content;
            content = content.replace(relativeSpecifier, (match, prefix, quote, pathWithoutExt, ext) => {
                // Do not rewrite *.d.ts / *.d.mts / *.d.cts style specifiers
                if (pathWithoutExt.endsWith('.d')) {
                    return match;
                }
                const jsish = ext === 'mts' ? 'mjs' : ext === 'cts' ? 'cjs' : 'js';
                return `${prefix}${quote}${pathWithoutExt}.${jsish}${quote}`;
            });
            if (content !== original) {
                await fs.writeFile(fullPath, content, 'utf8');
            }
        }
    }
}

async function main() {
    try {
        await fs.access(esmDir);
    } catch {
        console.error('rewrite-esm-dts-import-extensions: dist/esm not found; run tsc first');
        process.exit(1);
    }
    await walkTransform(esmDir);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
