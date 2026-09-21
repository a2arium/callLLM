import { VercelAdapter } from '@/adapters/vercel/adapter.ts';
import { VercelAdapterError } from '@/adapters/vercel/errors.ts';
import { adapterRegistry, getRegisteredProviders } from '@/adapters/index.ts';
import { ModelManager } from '@/core/models/ModelManager.ts';

describe('VercelAdapter registration and configuration', () => {
    const originalKey = process.env.AI_GATEWAY_API_KEY;
    const originalOidc = process.env.VERCEL_OIDC_TOKEN;

    afterEach(() => {
        if (originalKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
        else process.env.AI_GATEWAY_API_KEY = originalKey;
        if (originalOidc === undefined) delete process.env.VERCEL_OIDC_TOKEN;
        else process.env.VERCEL_OIDC_TOKEN = originalOidc;
    });

    it('is registered and exposes its model catalog', () => {
        expect(getRegisteredProviders()).toContain('vercel');
        expect(adapterRegistry.get('vercel')).toBe(VercelAdapter);
        expect(new ModelManager('vercel').getAvailableModels()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'alibaba/qwen-3-14b' })
            ])
        );
    });

    it('reads AI_GATEWAY_API_KEY', () => {
        delete process.env.VERCEL_OIDC_TOKEN;
        process.env.AI_GATEWAY_API_KEY = 'test-key';
        expect(() => new VercelAdapter()).not.toThrow();
    });

    it('falls back to VERCEL_OIDC_TOKEN', () => {
        delete process.env.AI_GATEWAY_API_KEY;
        process.env.VERCEL_OIDC_TOKEN = 'oidc-token';
        expect(() => new VercelAdapter()).not.toThrow();
    });

    it('fails clearly when no API key is available', () => {
        delete process.env.AI_GATEWAY_API_KEY;
        delete process.env.VERCEL_OIDC_TOKEN;
        expect(() => new VercelAdapter()).toThrow(VercelAdapterError);
        expect(() => new VercelAdapter()).toThrow('AI_GATEWAY_API_KEY');
    });
});
