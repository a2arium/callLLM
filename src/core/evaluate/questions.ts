import { z } from 'zod';
import type {
    BooleanAnswer,
    BooleanQuestion,
    ChoiceAnswer,
    ChoiceQuestion,
    EvaluateInstructions,
    EvaluateQuestion,
    EvaluateQuestions,
    ScoreAnswer,
    ScoreQuestion
} from '../../interfaces/UniversalInterfaces.ts';

export const EVALUATE_QUESTION_BRAND = Symbol.for('callllm.evaluateQuestion');

export type EvaluateQuestionHelper<Q extends EvaluateQuestion = EvaluateQuestion> =
    z.ZodTypeAny & { readonly [EVALUATE_QUESTION_BRAND]: Q };

function brandQuestionHelper<Q extends EvaluateQuestion>(
    question: Q,
    answerSchema: z.ZodTypeAny
): EvaluateQuestionHelper<Q> {
    const schema = answerSchema as EvaluateQuestionHelper<Q>;
    Object.defineProperty(schema, EVALUATE_QUESTION_BRAND, {
        value: question,
        enumerable: false,
        configurable: false,
        writable: false
    });
    return schema;
}

export function isEvaluateQuestionHelper(
    value: unknown
): value is EvaluateQuestionHelper {
    return Boolean(
        value &&
        typeof value === 'object' &&
        EVALUATE_QUESTION_BRAND in value
    );
}

export function getQuestionFromHelper(
    value: EvaluateQuestionHelper
): EvaluateQuestion {
    return value[EVALUATE_QUESTION_BRAND];
}

export function booleanQuestion(
    instructions: EvaluateInstructions,
    criteria?: BooleanQuestion['criteria']
): EvaluateQuestionHelper<BooleanQuestion> {
    const question: BooleanQuestion = {
        type: 'boolean',
        instructions,
        ...(criteria ? { criteria } : {})
    };
    return brandQuestionHelper(
        question,
        z.object({
            type: z.literal('boolean'),
            probability: z.number()
        }) satisfies z.ZodType<BooleanAnswer>
    );
}

export function choiceQuestion<const TOptions extends string>(
    instructions: EvaluateInstructions,
    criteria: Record<TOptions, string | null>
): EvaluateQuestionHelper<ChoiceQuestion<TOptions>> {
    const keys = Object.keys(criteria) as TOptions[];
    if (keys.length === 0) {
        throw new TypeError('Choice question criteria must include at least one option');
    }
    const question: ChoiceQuestion<TOptions> = {
        type: 'choice',
        instructions,
        criteria
    };
    const optionSchema = z.enum(keys as [TOptions, ...TOptions[]]);
    return brandQuestionHelper(
        question,
        z.object({
            type: z.literal('choice'),
            choice: optionSchema,
            probabilities: z.record(z.string(), z.number()),
            confidence: z.number().optional()
        }) satisfies z.ZodType<ChoiceAnswer<TOptions>>
    );
}

export function scoreQuestion(
    instructions: EvaluateInstructions,
    criteria: readonly [string, string, ...string[]]
): EvaluateQuestionHelper<ScoreQuestion> {
    if (criteria.length < 2) {
        throw new TypeError('Score question criteria must include at least two levels');
    }
    const question: ScoreQuestion = {
        type: 'score',
        instructions,
        criteria
    };
    return brandQuestionHelper(
        question,
        z.object({
            type: z.literal('score'),
            score: z.number(),
            probabilities: z.record(z.string(), z.number()),
            legend: z.record(z.string(), z.string()).optional(),
            confidence: z.number().optional()
        }) satisfies z.ZodType<ScoreAnswer>
    );
}

function isPlainEvaluateQuestion(value: unknown): value is EvaluateQuestion {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    if (record.type === 'boolean' && 'instructions' in record) return true;
    if (record.type === 'choice' && 'instructions' in record && isRecord(record.criteria)) return true;
    if (
        record.type === 'score' &&
        'instructions' in record &&
        Array.isArray(record.criteria)
    ) {
        return true;
    }
    return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Compile a Zod object of branded evaluate helpers into a plain questions map.
 * Rejects generic Zod fields that are not evaluate helpers.
 */
export function compileEvaluateQuestions(schema: z.ZodTypeAny): EvaluateQuestions {
    const objectSchema = unwrapZodObject(schema);
    if (!objectSchema) {
        throw new TypeError(
            'Evaluate questions Zod schema must be a z.object() of booleanQuestion/choiceQuestion/scoreQuestion helpers'
        );
    }

    const shape = objectSchema.shape;
    const questions: EvaluateQuestions = {};
    for (const [key, field] of Object.entries(shape)) {
        if (!isEvaluateQuestionHelper(field)) {
            throw new TypeError(
                `Evaluate questions field '${key}' must be booleanQuestion(), choiceQuestion(), or scoreQuestion() — arbitrary Zod schemas are not supported`
            );
        }
        questions[key] = getQuestionFromHelper(field);
    }
    if (Object.keys(questions).length === 0) {
        throw new TypeError('Evaluate questions must contain at least one question');
    }
    return questions;
}

function unwrapZodObject(schema: z.ZodTypeAny): z.ZodObject<z.ZodRawShape> | undefined {
    let current: z.ZodTypeAny = schema;
    // Unwrap common wrappers without accepting non-object roots.
    for (let i = 0; i < 5; i++) {
        if (current instanceof z.ZodObject) return current;
        const def = (current as { _def?: { typeName?: string; innerType?: z.ZodTypeAny; schema?: z.ZodTypeAny } })._def;
        if (!def) break;
        if (def.innerType) {
            current = def.innerType;
            continue;
        }
        if (def.schema) {
            current = def.schema;
            continue;
        }
        break;
    }
    return undefined;
}

/**
 * Normalize evaluate call options: plain question maps or Zod helper objects.
 */
export function normalizeEvaluateQuestions(
    questions: EvaluateQuestions | z.ZodTypeAny
): EvaluateQuestions {
    if (questions instanceof z.ZodType || isZodType(questions)) {
        return compileEvaluateQuestions(questions as z.ZodTypeAny);
    }
    if (!isRecord(questions)) {
        throw new TypeError('Evaluate questions must be a record or a Zod object of helpers');
    }

    const normalized: EvaluateQuestions = {};
    for (const [key, value] of Object.entries(questions)) {
        if (isEvaluateQuestionHelper(value)) {
            normalized[key] = getQuestionFromHelper(value);
            continue;
        }
        if (isPlainEvaluateQuestion(value)) {
            normalized[key] = value;
            continue;
        }
        throw new TypeError(
            `Evaluate question '${key}' must be a boolean/choice/score question or a question helper`
        );
    }
    if (Object.keys(normalized).length === 0) {
        throw new TypeError('Evaluate questions must contain at least one question');
    }
    return normalized;
}

function isZodType(value: unknown): value is z.ZodTypeAny {
    return Boolean(
        value &&
        typeof value === 'object' &&
        typeof (value as { safeParse?: unknown }).safeParse === 'function' &&
        '_def' in value
    );
}
