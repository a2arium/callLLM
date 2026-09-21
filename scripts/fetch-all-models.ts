import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

type Fetcher = {
    name: string;
    script: string;
    env?: string;
};

const FETCHERS: Fetcher[] = [
    { name: 'openrouter', script: 'scripts/fetch-openrouter-models.ts', env: 'OPENROUTER_API_KEY' },
    { name: 'venice', script: 'scripts/fetch-venice-models.ts', env: 'VENICE_API_KEY' },
    { name: 'vercel', script: 'scripts/fetch-vercel-models.ts' }
];

type FetcherResult = {
    name: string;
    status: 'success' | 'skipped' | 'failed';
    detail?: string;
};

function runScript(scriptRelativePath: string): Promise<{ code: number; stderr: string }> {
    return new Promise(resolve => {
        const child = spawn(
            'yarn',
            ['tsx', scriptRelativePath],
            {
                cwd: repoRoot,
                env: process.env,
                stdio: ['ignore', 'inherit', 'pipe']
            }
        );

        let stderr = '';
        child.stderr?.on('data', (chunk: Buffer | string) => {
            const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
            stderr += text;
            process.stderr.write(text);
        });

        child.on('close', code => {
            resolve({ code: code ?? 1, stderr: stderr.trim() });
        });
    });
}

async function runFetchers(): Promise<void> {
    const results: FetcherResult[] = [];

    for (const fetcher of FETCHERS) {
        if (fetcher.env && !process.env[fetcher.env]) {
            const detail = `missing ${fetcher.env}`;
            console.warn(`[skip] ${fetcher.name}: ${detail}`);
            results.push({ name: fetcher.name, status: 'skipped', detail });
            continue;
        }

        console.log(`\n=== Fetching ${fetcher.name} models ===`);
        const { code, stderr } = await runScript(fetcher.script);
        if (code === 0) {
            results.push({ name: fetcher.name, status: 'success' });
        } else {
            results.push({
                name: fetcher.name,
                status: 'failed',
                detail: stderr || `exit code ${code}`
            });
        }
    }

    console.log('\n=== Model fetch summary ===');
    for (const result of results) {
        const suffix = result.detail ? ` (${result.detail})` : '';
        console.log(`- ${result.name}: ${result.status}${suffix}`);
    }

    const failed = results.filter(result => result.status === 'failed');
    if (failed.length > 0) {
        process.exit(1);
    }
}

runFetchers().catch(error => {
    console.error('Failed to run model fetchers:', error);
    process.exit(1);
});
