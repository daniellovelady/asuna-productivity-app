import { ipcMain } from 'electron';
import {
  analyzeCoach,
  fetchWeeklyReport,
  varyAssistantMessage,
} from '../coach/backendClient';
import type { CoachAnalyzeRequest } from '../../renderer/types/coachApi';
import type { VaryMessageRequest } from '../../renderer/types/weeklyInsight';

const COACH_BACKEND_URL = process.env.COACH_BACKEND_URL ?? 'http://127.0.0.1:8000';
const COACH_REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.COACH_REQUEST_TIMEOUT_MS ?? '60000',
  10,
);
const ASSISTANT_VARIATION_TIMEOUT_MS = Number.parseInt(
  process.env.ASSISTANT_VARIATION_TIMEOUT_MS ?? '5000',
  10,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCoachAnalyzePayload(value: unknown): value is CoachAnalyzeRequest {
  if (!isRecord(value)) {
    return false;
  }

  if (Object.keys(value).some((key) => !['accessToken', 'question', 'conversationId'].includes(key))) {
    return false;
  }

  return typeof value.accessToken === 'string'
    && value.accessToken.length > 0
    && value.accessToken.length <= 8192
    && typeof value.question === 'string'
    && value.question.length > 0
    && value.question.length <= 2000
    && (value.conversationId === undefined || typeof value.conversationId === 'string');
}

export function registerCoachHandlers(): void {
  ipcMain.handle('coach:analyze', async (_event, payload: unknown) => {
    if (!isCoachAnalyzePayload(payload)) {
      throw new Error('Invalid coach analyze payload.');
    }

    return analyzeCoach(COACH_BACKEND_URL, COACH_REQUEST_TIMEOUT_MS, payload);
  });

  ipcMain.handle('coach:weeklyReport', async (_event, payload: unknown) => {
    if (
      typeof payload !== 'object'
      || payload === null
      || !('accessToken' in payload)
      || typeof (payload as { accessToken: unknown }).accessToken !== 'string'
    ) {
      throw new Error('Invalid weekly report payload.');
    }

    return fetchWeeklyReport(
      COACH_BACKEND_URL,
      COACH_REQUEST_TIMEOUT_MS,
      (payload as { accessToken: string }).accessToken,
    );
  });

  ipcMain.handle('coach:varyMessage', async (_event, payload: unknown) => {
    if (!isVaryMessagePayload(payload)) {
      throw new Error('Invalid vary message payload.');
    }

    return varyAssistantMessage(
      COACH_BACKEND_URL,
      ASSISTANT_VARIATION_TIMEOUT_MS,
      payload,
    );
  });
}

function isVaryMessagePayload(value: unknown): value is VaryMessageRequest {
  if (!isRecord(value)) {
    return false;
  }

  const allowedKeys = new Set(['accessToken', 'triggerKey', 'tone', 'template']);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return false;
  }

  return typeof value.accessToken === 'string'
    && value.accessToken.length > 0
    && typeof value.triggerKey === 'string'
    && typeof value.tone === 'string'
    && typeof value.template === 'string';
}
