import type { ActivityIdentity } from '../../shared/activity/types';

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.exe$/i, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function containsIgnoreCase(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function isBrowserOwner(ownerName: string): 'chrome' | 'edge' | 'firefox' | null {
  const normalized = ownerName.toLowerCase();

  if (normalized.includes('chrome') || normalized.includes('chromium')) {
    return 'chrome';
  }

  if (normalized.includes('msedge') || normalized.includes('edge')) {
    return 'edge';
  }

  if (normalized.includes('firefox')) {
    return 'firefox';
  }

  return null;
}

function classifyBrowserTitle(title: string, browser: 'chrome' | 'edge' | 'firefox'): ActivityIdentity {
  if (containsIgnoreCase(title, 'YouTube')) {
    return 'youtube';
  }

  if (containsIgnoreCase(title, 'Stack Overflow')) {
    return 'stackoverflow';
  }

  if (containsIgnoreCase(title, 'Google Calendar')) {
    return 'google_calendar';
  }

  if (containsIgnoreCase(title, 'GitHub')) {
    return 'github';
  }

  return browser;
}

function classifyNativeOwner(ownerName: string): ActivityIdentity {
  const normalized = ownerName.toLowerCase();

  if (normalized.includes('code') || normalized.includes('vscode')) {
    return 'vscode';
  }

  if (normalized.includes('devenv')) {
    return 'visual_studio';
  }

  if (
    normalized.includes('windowsterminal')
    || normalized.includes('powershell')
    || normalized.includes('pwsh')
    || normalized.includes('cmd')
  ) {
    return normalized.includes('powershell') || normalized.includes('pwsh')
      ? 'powershell'
      : 'terminal';
  }

  if (normalized.includes('league of legends') || normalized.includes('riotclient')) {
    return 'league_of_legends';
  }

  if (normalized.includes('spotify')) {
    return 'spotify';
  }

  if (normalized.includes('discord')) {
    return 'discord';
  }

  if (normalized.includes('explorer')) {
    return 'file_explorer';
  }

  if (normalized.includes('netflix')) {
    return 'netflix';
  }

  const token = normalizeToken(ownerName);
  return token.length > 0 ? token : 'unknown';
}

export function normalizeActivity(ownerName: string, title: string): ActivityIdentity {
  const browser = isBrowserOwner(ownerName);

  if (browser !== null) {
    return classifyBrowserTitle(title, browser);
  }

  return classifyNativeOwner(ownerName);
}
