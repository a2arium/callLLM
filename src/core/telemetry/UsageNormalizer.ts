import type { Usage } from '../../interfaces/UniversalInterfaces.ts';

export function normalizeUsage(usage: Usage): Usage {
    usage.costs.unit = usage.costs.unit ?? 'USD';

    if (usage.durations !== undefined) {
        usage.durations.unit = usage.durations.unit ?? 'seconds';

        const inputTotal = usage.durations.input
            ? (usage.durations.input.audio ?? 0) + (usage.durations.input.video ?? 0)
            : 0;
        const outputTotal = usage.durations.output
            ? (usage.durations.output.audio ?? 0) + (usage.durations.output.video ?? 0)
            : 0;

        if (usage.durations.total === undefined && inputTotal + outputTotal > 0) {
            usage.durations.total = inputTotal + outputTotal;
        }
    }

    return usage;
}
