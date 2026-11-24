import { describe, expect, it } from 'vitest';
import {
  extractPlaceholders,
  interpolateTemplate,
} from '../../shared/assistant/messageTemplates';

describe('messageTemplates', () => {
  it('interpolates deterministic facts after template variation', () => {
    const template = "You've been on {app} for {minutes} minutes.";
    const varied = 'Looks like {app} has held you for {minutes} minutes.';
    expect(extractPlaceholders(template).join()).toBe(extractPlaceholders(varied).join());
    expect(interpolateTemplate(varied, { app: 'Browser', minutes: 15 })).toBe(
      'Looks like Browser has held you for 15 minutes.',
    );
  });

  it('extracts unique placeholders', () => {
    expect(extractPlaceholders('{app} {minutes} {app}')).toEqual(['{app}', '{minutes}']);
  });
});
