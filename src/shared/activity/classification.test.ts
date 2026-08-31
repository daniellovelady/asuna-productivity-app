import { describe, expect, it } from 'vitest';
import { classifyActivity } from './classification';

describe('classifyActivity', () => {
  it('classifies productive identities', () => {
    expect(classifyActivity('vscode')).toBe('productive');
    expect(classifyActivity('github')).toBe('productive');
  });

  it('classifies distracting identities', () => {
    expect(classifyActivity('youtube')).toBe('distracting');
    expect(classifyActivity('league_of_legends')).toBe('distracting');
  });

  it('defaults unknown identities to neutral', () => {
    expect(classifyActivity('unknown')).toBe('neutral');
    expect(classifyActivity('discord')).toBe('neutral');
  });
});
