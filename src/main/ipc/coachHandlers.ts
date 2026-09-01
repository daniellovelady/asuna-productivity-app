import { ipcMain } from 'electron';
import { analyzeCoach } from '../coach/backendClient';
import type { CoachAnalyzeRequest } from '../../renderer/types/coachApi';

const COACH_BACKEND_URL = process.env.COACH_BACKEND_URL ?? 'http://127.0.0.1:8000';
const COACH_REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.COACH_REQUEST_TIMEOUT_MS ?? '60000',
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
}
