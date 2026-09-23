import { describe, expect, it } from '@jest/globals';
import {
  extractProviderCode,
  extractProviderProvenance,
  extractProviderRequestIds,
  extractProviderStatus
} from '../../../../core/retry/providerErrorProvenance.ts';
import { ProviderHttpError } from '../../../../core/retry/ProviderHttpError.ts';

describe('providerErrorProvenance', () => {
  it('reads status and requestId from common shapes', () => {
    const err = Object.assign(new Error('x'), {
      status: 400,
      code: 'policy',
      requestId: 'r1'
    });
    expect(extractProviderStatus(err)).toBe(400);
    expect(extractProviderCode(err)).toBe('policy');
    expect(extractProviderRequestIds(err)).toEqual({ requestId: 'r1', responseId: undefined });
  });

  it('prefers requestId but accepts SDK request_id', () => {
    expect(
      extractProviderRequestIds(
        Object.assign(new Error('x'), { request_id: 'snake' })
      ).requestId
    ).toBe('snake');
    expect(
      extractProviderRequestIds(
        Object.assign(new Error('x'), { requestId: 'camel', request_id: 'snake' })
      ).requestId
    ).toBe('camel');
  });

  it('tolerates absent optional metadata', () => {
    expect(extractProviderProvenance(new Error('bare'))).toEqual({
      status: undefined,
      providerCode: undefined,
      requestId: undefined,
      responseId: undefined
    });
  });

  it('reads ProviderHttpError fields without treating discriminant as providerCode', () => {
    const err = new ProviderHttpError({
      message: 'wrapped',
      status: 401,
      providerCode: 'auth',
      requestId: 'id'
    });
    expect(extractProviderProvenance(err)).toEqual({
      status: 401,
      providerCode: 'auth',
      requestId: 'id',
      responseId: undefined
    });
    expect(extractProviderCode(err)).toBe('auth');
  });
});
