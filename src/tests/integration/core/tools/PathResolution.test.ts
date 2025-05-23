/**
 * Integration tests for path resolution in tool loading
 * These tests use real file system operations and path resolution
 * to catch issues that mocked unit tests might miss.
 * 
 * This test demonstrates the exact bug that caused toolFunctionFolder.ts to fail.
 */

import * as path from 'path';
import * as fs from 'fs';
import { getDirname } from '../../../../utils/paths.ts';

describe('Path Resolution Integration Tests', () => {
    describe('getDirname context sensitivity - The Core Bug', () => {
        it('should return different directories when called from different contexts', () => {
            // This test verifies that getDirname() without import.meta.url 
            // returns the directory of the paths.ts file, not the calling file
            const dirnameWithoutUrl = getDirname();

            // Should be the src/utils directory (where paths.ts is located)
            expect(dirnameWithoutUrl).toContain('src/utils');
            expect(dirnameWithoutUrl).not.toContain('tests');
        });

        it('should return correct directory when called with import.meta.url', () => {
            // This test verifies that getDirname(import.meta.url) 
            // returns the directory of the calling file
            const dirnameWithUrl = getDirname(import.meta.url);

            // Should be this test file's directory
            expect(dirnameWithUrl).toContain('tests/integration/core/tools');
            expect(dirnameWithUrl).not.toContain('src/utils');
        });

        it('should demonstrate the path resolution bug scenario', () => {
            // Simulate what the original toolFunctionFolder.ts was doing
            const currentFileDir = getDirname(); // BUG: This gets src/utils/
            const attemptedToolsPath = path.resolve(currentFileDir, './functions');

            // This would have looked for tools in src/utils/functions (wrong)
            expect(attemptedToolsPath).toContain('src/utils/functions');
            expect(fs.existsSync(attemptedToolsPath)).toBe(false);
        });

        it('should verify that getDirname behavior varies by calling location', () => {
            // This test demonstrates the core issue that caused the bug
            const utilsResult = getDirname(); // Called without import.meta.url - gets src/utils
            const testResult = getDirname(import.meta.url); // Called with import.meta.url - gets test directory

            expect(utilsResult).not.toEqual(testResult);
            expect(utilsResult).toContain('src/utils');
            expect(testResult).toContain('tests/integration');

            // This is the exact issue: same function call, different results based on context
            console.log('getDirname() without import.meta.url:', utilsResult);
            console.log('getDirname(import.meta.url) from test:', testResult);
        });

        it('should verify examples/functions directory exists for reference', () => {
            // This confirms the target directory exists (sanity check)
            const projectRoot = process.cwd();
            const examplesFunctionsDir = path.join(projectRoot, 'examples', 'functions');

            expect(fs.existsSync(examplesFunctionsDir)).toBe(true);

            // Verify it contains the expected tool files
            const files = fs.readdirSync(examplesFunctionsDir);
            expect(files).toContain('getWeather.ts');
            expect(files).toContain('getTime.ts');
            expect(files).toContain('getFact.ts');
        });
    });

    describe('Bug Demonstration - Why toolFunctionFolder.ts Failed', () => {
        it('should show exactly why the original example failed', () => {
            // ORIGINAL BUGGY CODE: What toolFunctionFolder.ts was doing
            const simulateOriginalBuggyCode = () => {
                const __dirname = getDirname(); // BUG: No import.meta.url parameter
                return path.resolve(__dirname, './functions');
            };

            const buggyPath = simulateOriginalBuggyCode();

            // The bug: path resolves to wrong location
            expect(buggyPath).toMatch(/src[\/\\]utils[\/\\]functions/);
            expect(fs.existsSync(buggyPath)).toBe(false);

            console.log('Buggy path that caused the error:', buggyPath);
            console.log('This directory does not exist, hence the "Tools directory not found" error');
        });

        it('should show how the fix works', () => {
            // FIXED CODE: What toolFunctionFolder.ts does now
            const simulateFixedCode = () => {
                const __dirname = getDirname(import.meta.url); // FIXED: Pass import.meta.url
                // This simulates being called from examples/ directory by adjusting the relative path
                return __dirname; // Just show what directory we get
            };

            const fixedBaseDir = simulateFixedCode();

            // The fix: getDirname with import.meta.url returns the correct calling file's directory
            expect(fixedBaseDir).toContain('tests/integration/core/tools');

            console.log('Fixed approach gets correct directory:', fixedBaseDir);
            console.log('From here, relative paths like "./functions" work as expected');
        });
    });

    describe('Integration Test Value', () => {
        it('should explain why unit tests missed this issue', () => {
            // This test documents why mocked unit tests didn't catch the bug
            const utilsDir = getDirname();
            const testDir = getDirname(import.meta.url);

            // Unit tests mock getDirname to return fixed values like '/mock/path/to'
            // They never test the actual path resolution from different calling contexts
            // This integration test shows the real behavior that mocks hide

            expect(utilsDir).toMatch(/src[\/\\]utils$/);
            expect(testDir).toMatch(/tests[\/\\]integration[\/\\]core[\/\\]tools$/);

            console.log('\nWhy unit tests missed this:');
            console.log('1. Unit tests mock getDirname() to return hardcoded paths');
            console.log('2. Mocks bypass the real import.meta.url resolution logic');
            console.log('3. Tests never exercise cross-directory calling contexts');
            console.log('4. Integration tests with real path resolution are needed to catch this');
        });
    });
}); 