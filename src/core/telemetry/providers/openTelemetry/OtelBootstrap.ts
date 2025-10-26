// Physically moved implementation into provider directory to fully encapsulate OTel specifics
import { logger } from '../../../../utils/logger.ts';
import type { EmbeddingConfig } from './OtelService.ts';

// Lazy-loaded to avoid hard dependency on @opentelemetry/api
let OtelService: any;

let initialized = false;
let otelServiceInstance: any | undefined;
let shutdownFn: (() => Promise<void>) | undefined;
let sdkReadyResolve: (() => void) | undefined;
// Resolves once the SDK is started (or immediately if disabled / on failure)
const sdkReadyPromise: Promise<void> = new Promise<void>((resolve) => {
    sdkReadyResolve = resolve;
});

/**
 * Auto-initialize OpenTelemetry (Node SDK + OTLP HTTP exporter) from env, if enabled.
 * Safe to call multiple times; initializes once.
 */
export function getAutoOtelService(): any | undefined {
    if (initialized) return otelServiceInstance;
    initialized = true;

    const log = logger.createLogger({ prefix: 'OtelBootstrap' });
    const enabled = /^(1|true)$/i.test(String(process.env.CALLLLM_OTEL_ENABLED || ''));
    if (!enabled) {
        log.debug('Telemetry disabled by env (CALLLLM_OTEL_ENABLED not true)');
        // Resolve readiness immediately so callers awaiting readiness don't block
        try { sdkReadyResolve?.(); } catch { /* ignore */ }
        return undefined;
    }

    const tracesEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const headersEnv = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
    const serviceName = process.env.OTEL_SERVICE_NAME || 'callllm';
    const wantConsole = /^(1|true)$/i.test(String(process.env.OTEL_EXPORTER_CONSOLE || '')) ||
        /^(debug|trace)$/i.test(String(process.env.OTEL_LOG_LEVEL || ''));

    if (!tracesEndpoint && !wantConsole) {
        log.warn('CALLLLM_OTEL_ENABLED is set, but no OTEL_EXPORTER_OTLP_(TRACES_)ENDPOINT provided; telemetry will use console only if enabled');
    }
    log.debug('OTel env', {
        serviceName,
        tracesEndpoint: tracesEndpoint ? '[set]' : '[unset]',
        headersProvided: Boolean(headersEnv),
        wantConsole
    });

    const headers: Record<string, string> = {};
    if (headersEnv) {
        headersEnv.split(',').forEach(pair => {
            const [k, v] = pair.split('=');
            if (k && v) headers[k.trim()] = v.trim();
        });
    }

    // Dynamically import SDK; if unavailable, continue without telemetry
    (async () => {
        try {
            // Lazy load OtelService to avoid triggering @opentelemetry/api import at module level
            const otelServiceModule = await import('./OtelService.ts');
            OtelService = otelServiceModule.OtelService;

            const opentelemetry = await import('@opentelemetry/sdk-node');
            const exporters = await import('@opentelemetry/exporter-trace-otlp-http');
            const traceBase = await import('@opentelemetry/sdk-trace-base');
            const NodeSDK: any = (opentelemetry as any).NodeSDK;
            const OTLPTraceExporter: any = (exporters as any).OTLPTraceExporter;
            const ConsoleSpanExporter: any = (traceBase as any).ConsoleSpanExporter;
            const SimpleSpanProcessor: any = (traceBase as any).SimpleSpanProcessor;

            const processors: any[] = [];
            if (tracesEndpoint) {
                processors.push(new SimpleSpanProcessor(new OTLPTraceExporter({ url: tracesEndpoint, headers })));
            }
            if (wantConsole) {
                processors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
                log.debug('ConsoleSpanExporter enabled (OTEL_LOG_LEVEL=debug/trace or OTEL_EXPORTER_CONSOLE=true)');
            }

            const sdk = new NodeSDK({
                serviceName,
                spanProcessor: processors.length === 1 ? processors[0] : undefined,
                spanProcessors: processors.length > 1 ? processors : undefined
            });
            await sdk.start();
            shutdownFn = async () => { try { await sdk.shutdown(); } catch { /* ignore */ } };
            otelServiceInstance = new OtelService();
            log.info('OpenTelemetry started from env configuration');
            log.debug('OTel exporters configured', { exporters: processors.length, console: wantConsole, tracesEndpoint: Boolean(tracesEndpoint) });
            try { sdkReadyResolve?.(); } catch { /* ignore */ }
        } catch (err) {
            log.warn('Failed to auto-start OpenTelemetry SDK; proceeding without telemetry', err as Error);
            otelServiceInstance = undefined;
            try { sdkReadyResolve?.(); } catch { /* ignore */ }
        }
    })().catch(() => { /* noop */ });

    // Return undefined immediately; service will be available once SDK starts
    return otelServiceInstance;
}

export async function shutdownAutoOtel(): Promise<void> {
    if (shutdownFn) {
        try { await shutdownFn(); } catch { /* ignore */ }
    }
}

/**
 * Await until the OpenTelemetry SDK is ready. If telemetry is disabled or startup failed,
 * this resolves immediately.
 */
export async function awaitOtelReady(): Promise<void> {
    return sdkReadyPromise;
}

/**
 * Create an embedded OtelService for use in higher-order projects
 * This allows parent projects to provide their own context and configuration
 */
export async function createEmbeddedOtelService(config: EmbeddingConfig): Promise<any> {
    const log = logger.createLogger({ prefix: 'OtelBootstrap.createEmbeddedOtelService' });

    log.debug('Creating embedded OtelService', {
        serviceName: config.serviceName,
        hasParentContext: Boolean(config.parentContext),
        hasCustomAttributes: Boolean(config.customAttributes),
        hasRedactionPolicy: Boolean(config.redactionPolicy)
    });

    // Lazy load OtelService
    if (!OtelService) {
        const otelServiceModule = await import('./OtelService.ts');
        OtelService = otelServiceModule.OtelService;
    }

    return new OtelService(config);
}

/**
 * Get or create OtelService with enhanced configuration support
 * This is a more flexible version of getAutoOtelService
 */
export async function getOtelService(config?: EmbeddingConfig): Promise<any | undefined> {
    if (config) {
        // If specific configuration is provided, create a new instance
        return await createEmbeddedOtelService(config);
    }

    // Otherwise, use the auto-initialized instance
    return getAutoOtelService();
}

/**
 * Check if OpenTelemetry is enabled and ready
 */
export function isOtelEnabled(): boolean {
    const enabled = /^(1|true)$/i.test(String(process.env.CALLLLM_OTEL_ENABLED || ''));
    return enabled;
}

/**
 * Get current OtelService instance without auto-initialization
 */
export function getCurrentOtelService(): any | undefined {
    return otelServiceInstance;
}


