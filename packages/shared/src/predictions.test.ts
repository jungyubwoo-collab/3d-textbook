import { describe, expect, it } from 'vitest';
import { contentIdSchema, createPredictionSchema } from './predictions.ts';

describe('contentIdSchema', () => {
  it.each(['lever', 'balance-1', 'a'])('accepts %s', (id) => {
    expect(contentIdSchema.safeParse(id).success).toBe(true);
  });

  it.each(['', 'Lever', 'two words', '-lever', 'lever-', 'a'.repeat(65)])('rejects %j', (id) => {
    expect(contentIdSchema.safeParse(id).success).toBe(false);
  });
});

describe('createPredictionSchema', () => {
  const valid = {
    learnerId: '0195f4b2-7c1e-7a3b-9c2d-3e4f5a6b7c8d',
    lessonId: 'lever',
    questionId: 'balance',
    choiceId: 'one',
    isCorrect: true,
  };

  it('accepts a complete prediction', () => {
    expect(createPredictionSchema.parse(valid)).toEqual(valid);
  });

  it('requires a UUID learner id', () => {
    expect(createPredictionSchema.safeParse({ ...valid, learnerId: 'abc' }).success).toBe(false);
  });

  it('requires isCorrect to be a boolean', () => {
    expect(createPredictionSchema.safeParse({ ...valid, isCorrect: 'yes' }).success).toBe(false);
  });
});
