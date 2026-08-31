import { describe, expect, it } from 'vitest';
import { normalizeActivity } from './activityNormalizer';

describe('normalizeActivity', () => {
  it('maps browser titles to known services', () => {
    expect(normalizeActivity('Google Chrome', 'YouTube - Google Chrome')).toBe('youtube');
    expect(normalizeActivity('msedge', 'Stack Overflow - Search Results')).toBe('stackoverflow');
    expect(normalizeActivity('firefox', 'Google Calendar - Week')).toBe('google_calendar');
    expect(normalizeActivity('chrome', 'GitHub · Dashboard')).toBe('github');
  });

  it('falls back to generic browser identities', () => {
    expect(normalizeActivity('Google Chrome', 'Example Page')).toBe('chrome');
    expect(normalizeActivity('msedge', 'Example Page')).toBe('edge');
    expect(normalizeActivity('firefox', 'Example Page')).toBe('firefox');
  });

  it('maps native applications', () => {
    expect(normalizeActivity('Code.exe', 'file.ts')).toBe('vscode');
    expect(normalizeActivity('RiotClientServices', 'League of Legends')).toBe('league_of_legends');
  });

  it('returns unknown for unmatched native apps', () => {
    expect(normalizeActivity('SomeApp', 'Window')).toBe('someapp');
  });
});
