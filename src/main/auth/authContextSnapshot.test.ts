import { describe, expect, it } from 'vitest';
import {
  applyAuthContextSnapshot,
  getAuthContextSnapshot,
  registerRendererGeneration,
  resetAuthContextSnapshotForTests,
} from './authContextSnapshot';

const GENERATION = 1;

describe('authContextSnapshot', () => {
  it('accepts Account A at sequence 1', () => {
    resetAuthContextSnapshotForTests();

    expect(applyAuthContextSnapshot('user-a', 1, GENERATION, 'UTC')).toBe(true);
    expect(getAuthContextSnapshot()).toEqual({
      userId: 'user-a',
      sequence: 1,
      generation: GENERATION,
      timeZone: 'UTC',
    });
  });

  it('accepts Account B at sequence 2', () => {
    resetAuthContextSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, GENERATION, 'UTC');

    expect(applyAuthContextSnapshot('user-b', 2, GENERATION, 'UTC')).toBe(true);
    expect(getAuthContextSnapshot()).toEqual({
      userId: 'user-b',
      sequence: 2,
      generation: GENERATION,
      timeZone: 'UTC',
    });
  });

  it('rejects delayed Account A sequence 1 after Account B sequence 2', () => {
    resetAuthContextSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, GENERATION, 'UTC');
    applyAuthContextSnapshot('user-b', 2, GENERATION, 'UTC');

    expect(applyAuthContextSnapshot('user-a', 1, GENERATION, 'UTC')).toBe(false);
    expect(getAuthContextSnapshot()).toEqual({
      userId: 'user-b',
      sequence: 2,
      generation: GENERATION,
      timeZone: 'UTC',
    });
  });

  it('accepts sign-out at sequence 3', () => {
    resetAuthContextSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, GENERATION, 'UTC');
    applyAuthContextSnapshot('user-b', 2, GENERATION, 'UTC');

    expect(applyAuthContextSnapshot(null, 3, GENERATION, 'UTC')).toBe(true);
    expect(getAuthContextSnapshot()).toEqual({
      userId: null,
      sequence: 3,
      generation: GENERATION,
      timeZone: 'UTC',
    });
  });

  it('rejects delayed Account B sequence 2 after sign-out sequence 3', () => {
    resetAuthContextSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, GENERATION, 'UTC');
    applyAuthContextSnapshot('user-b', 2, GENERATION, 'UTC');
    applyAuthContextSnapshot(null, 3, GENERATION, 'UTC');

    expect(applyAuthContextSnapshot('user-b', 2, GENERATION, 'UTC')).toBe(false);
    expect(getAuthContextSnapshot()).toEqual({
      userId: null,
      sequence: 3,
      generation: GENERATION,
      timeZone: 'UTC',
    });
  });

  it('accepts new authenticated context at sequence 4 after sign-out', () => {
    resetAuthContextSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, GENERATION, 'UTC');
    applyAuthContextSnapshot('user-b', 2, GENERATION, 'UTC');
    applyAuthContextSnapshot(null, 3, GENERATION, 'UTC');

    expect(applyAuthContextSnapshot('user-c', 4, GENERATION, 'UTC')).toBe(true);
    expect(getAuthContextSnapshot()).toEqual({
      userId: 'user-c',
      sequence: 4,
      generation: GENERATION,
      timeZone: 'UTC',
    });
  });

  it('accepts sequence 1 from a new renderer generation after reload', () => {
    resetAuthContextSnapshotForTests();
    const oldGeneration = registerRendererGeneration();
    applyAuthContextSnapshot('user-a', 7, oldGeneration, 'UTC');

    const nextGeneration = registerRendererGeneration();
    expect(nextGeneration).toBe(oldGeneration + 1);

    expect(applyAuthContextSnapshot('user-a', 1, nextGeneration, 'UTC')).toBe(true);
    expect(getAuthContextSnapshot()).toEqual({
      userId: 'user-a',
      sequence: 1,
      generation: nextGeneration,
      timeZone: 'UTC',
    });
  });

  it('rejects stale messages from an old renderer generation', () => {
    resetAuthContextSnapshotForTests();
    const oldGeneration = registerRendererGeneration();
    applyAuthContextSnapshot('user-a', 5, oldGeneration, 'UTC');

    const nextGeneration = registerRendererGeneration();
    applyAuthContextSnapshot('user-a', 1, nextGeneration, 'UTC');

    expect(applyAuthContextSnapshot('user-b', 6, oldGeneration, 'UTC')).toBe(false);
    expect(getAuthContextSnapshot()).toEqual({
      userId: 'user-a',
      sequence: 1,
      generation: nextGeneration,
      timeZone: 'UTC',
    });
  });
});
