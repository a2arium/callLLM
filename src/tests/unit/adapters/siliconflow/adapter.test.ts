import { SiliconFlowAdapter } from '@/adapters/siliconflow/adapter.ts';
import { SiliconFlowAdapterError } from '@/adapters/siliconflow/errors.ts';
import { adapterRegistry, getRegisteredProviders } from '@/adapters/index.ts';
import { ModelManager } from '@/core/models/ModelManager.ts';

describe('SiliconFlowAdapter registration and configuration', () => {
    const originalKey = process.env.SILICONFLOW_API_KEY;

    afterEach(() => {
        if (originalKey === undefined) delete process.env.SILICONFLOW_API_KEY;
        else process.env.SILICONFLOW_API_KEY = originalKey;
    });

    it('is registered and exposes its model catalog', () => {
        expect(getRegisteredProviders()).toContain('siliconflow');
        expect(adapterRegistry.get('siliconflow')).toBe(SiliconFlowAdapter);
        expect(new ModelManager('siliconflow').getAvailableModels()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'deepseek-ai/DeepSeek-V3.2' })
            ])
        );
    });

    it('reads SILICONFLOW_API_KEY', () => {
        process.env.SILICONFLOW_API_KEY = 'test-key';
        expect(() => new SiliconFlowAdapter()).not.toThrow();
    });

    it('fails clearly when no API key is available', () => {
        delete process.env.SILICONFLOW_API_KEY;
        expect(() => new SiliconFlowAdapter()).toThrow(SiliconFlowAdapterError);
        expect(() => new SiliconFlowAdapter()).toThrow('SILICONFLOW_API_KEY');
    });
});
