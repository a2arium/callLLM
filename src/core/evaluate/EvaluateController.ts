import type { BaseAdapter } from '../../adapters/base/baseAdapter.ts';
import type { LLMExecutionControl } from '../../interfaces/ExecutionInterfaces.ts';
import type {
    BooleanAnswer,
    ChoiceAnswer,
    EvaluateAnswer,
    EvaluateAnswers,
    EvaluateCallOptions,
    EvaluateParams,
    EvaluateQuestion,
    EvaluateQuestions,
    EvaluateResponse,
    ScoreAnswer
} from '../../interfaces/UniversalInterfaces.ts';
import { CapabilityError } from '../models/CapabilityError.ts';
import { normalizeEvaluateQuestions } from './questions.ts';

export class EvaluateController {
    constructor(private readonly adapter: BaseAdapter) {}

    async evaluate(
        model: string,
        options: EvaluateCallOptions,
        control?: LLMExecutionControl
    ): Promise<EvaluateResponse> {
        const params = this.normalize(options);
        if (typeof this.adapter.evaluateCall !== 'function') {
            throw new CapabilityError('Provider does not support evaluation');
        }
        const response = await this.adapter.evaluateCall(model, params, control);
        return {
            ...response,
            model: response.model || model,
            answers: this.validateAnswers(response.answers, params.questions)
        };
    }

    private normalize(options: EvaluateCallOptions): EvaluateParams {
        if (options.state === undefined || options.state === null) {
            throw new TypeError('Evaluate state is required');
        }
        if (typeof options.state === 'string' && options.state.trim().length === 0) {
            throw new TypeError('Evaluate state must be a non-empty string when provided as text');
        }

        const questions = normalizeEvaluateQuestions(options.questions);
        for (const [key, question] of Object.entries(questions)) {
            this.validateQuestion(key, question);
        }

        return {
            state: options.state,
            questions,
            providerOptions: options.settings?.providerOptions
        };
    }

    private validateQuestion(key: string, question: EvaluateQuestion): void {
        if (!question.instructions && question.instructions !== '') {
            throw new TypeError(`Evaluate question '${key}' must include instructions`);
        }
        if (question.type === 'boolean') {
            return;
        }
        if (question.type === 'choice') {
            if (!question.criteria || typeof question.criteria !== 'object' || Array.isArray(question.criteria)) {
                throw new TypeError(`Evaluate choice question '${key}' requires a criteria map`);
            }
            if (Object.keys(question.criteria).length === 0) {
                throw new TypeError(`Evaluate choice question '${key}' criteria must include at least one option`);
            }
            return;
        }
        if (question.type === 'score') {
            if (!Array.isArray(question.criteria) || question.criteria.length < 2) {
                throw new TypeError(`Evaluate score question '${key}' requires at least two criteria levels`);
            }
            return;
        }
        throw new TypeError(`Evaluate question '${key}' has unsupported type`);
    }

    private validateAnswers(
        answers: EvaluateAnswers,
        questions: EvaluateQuestions
    ): EvaluateAnswers {
        if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
            throw new TypeError('Evaluate provider response answers must be an object');
        }

        const validated: EvaluateAnswers = {};
        for (const key of Object.keys(questions)) {
            const answer = answers[key];
            if (!answer) {
                throw new TypeError(`Evaluate provider response missing answer for '${key}'`);
            }
            validated[key] = this.validateAnswer(key, questions[key], answer);
        }
        return validated;
    }

    private validateAnswer(
        key: string,
        question: EvaluateQuestion,
        answer: EvaluateAnswer
    ): EvaluateAnswer {
        if (question.type === 'boolean') {
            if (answer.type !== 'boolean' || typeof (answer as BooleanAnswer).probability !== 'number') {
                throw new TypeError(`Evaluate answer '${key}' must be a boolean probability`);
            }
            const probability = (answer as BooleanAnswer).probability;
            if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
                throw new RangeError(`Evaluate answer '${key}' probability must be between 0 and 1`);
            }
            return answer;
        }
        if (question.type === 'choice') {
            const choiceAnswer = answer as ChoiceAnswer;
            if (answer.type !== 'choice' || typeof choiceAnswer.choice !== 'string') {
                throw new TypeError(`Evaluate answer '${key}' must be a choice answer`);
            }
            if (!(choiceAnswer.choice in question.criteria)) {
                throw new RangeError(`Evaluate answer '${key}' chose unknown option '${choiceAnswer.choice}'`);
            }
            if (!choiceAnswer.probabilities || typeof choiceAnswer.probabilities !== 'object') {
                throw new TypeError(`Evaluate answer '${key}' must include probabilities`);
            }
            return answer;
        }
        if (question.type === 'score') {
            const scoreAnswer = answer as ScoreAnswer;
            if (answer.type !== 'score' || typeof scoreAnswer.score !== 'number' || !Number.isFinite(scoreAnswer.score)) {
                throw new TypeError(`Evaluate answer '${key}' must be a score answer`);
            }
            if (!scoreAnswer.probabilities || typeof scoreAnswer.probabilities !== 'object') {
                throw new TypeError(`Evaluate answer '${key}' must include probabilities`);
            }
            return answer;
        }
        throw new TypeError(`Evaluate answer '${key}' has unsupported type`);
    }
}
