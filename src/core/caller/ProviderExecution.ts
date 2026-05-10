import type { RegisteredProviders } from '../../adapters/index.ts';
import type { LLMProvider } from '../../interfaces/LLMProvider.ts';
import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

export type ProviderExecutionContext = {
    providerName: RegisteredProviders;
    provider: LLMProvider;
    modelInfo?: ModelInfo;
};

const EXECUTION_CONTEXT_KEY = '__callllmProviderExecution';

export function attachProviderExecutionContext<T extends object>(
    target: T,
    execution?: ProviderExecutionContext
): T {
    if (execution) {
        Object.defineProperty(target, EXECUTION_CONTEXT_KEY, {
            value: execution,
            enumerable: true,
            configurable: true,
            writable: true
        });
    }
    return target;
}

export function getProviderExecutionContext(target: object): ProviderExecutionContext | undefined {
    return (target as Record<string, unknown>)[EXECUTION_CONTEXT_KEY] as ProviderExecutionContext | undefined;
}
