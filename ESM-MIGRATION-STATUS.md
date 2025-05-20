# ESM Migration Status

This document tracks the ESM compatibility status of all dependencies in the `callllm` project.

## Core Dependencies

| Package | Version | ESM Compatible | Dual Module | Notes |
|---------|---------|---------------|-------------|-------|
| @dqbd/tiktoken | 1.0.21 | ✅ | ✅ | Provides both CJS and ESM exports |
| @modelcontextprotocol/sdk | 1.11.4 | ✅ | ✅ | Native ESM with CJS fallback |
| jsonrepair | 3.12.0 | ✅ | ✅ | Native ESM with CJS fallback |
| openai | 4.100.0 | ❌ | ❌ | Uses CommonJS format |
| sharp | 0.34.1 | ❌ | ❌ | Uses CommonJS format |
| zod | 3.25.7 | ✅ | ✅ | Native ESM with CJS fallback |

## Dev Dependencies

| Package | Version | ESM Compatible | Dual Module | Notes |
|---------|---------|---------------|-------------|-------|
| ts-node | 10.9.2 | ✅ | ✅ | Supports ESM via esm.mjs loader |
| typescript | 5.7.2 | ✅ | ✅ | Full support for ESM |
| jest | 29.7.0 | ✅ | ✅ | Supports ESM via configuration |
| ts-jest | 29.2.5 | ✅ | ✅ | Supports ESM via configuration |

## Migration Plan

1. Update `tsconfig.json` to target ESM output
2. Add `"type": "module"` to package.json 
3. Adjust import/export syntax in source files
4. Update Jest configuration for ESM support
5. Update the module resolution strategy in build process 