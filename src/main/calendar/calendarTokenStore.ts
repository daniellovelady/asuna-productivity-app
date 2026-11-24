import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { decryptJsonPayload, encryptJsonPayload } from './safeStorageBlob';

export interface StoredGoogleTokens {
  refreshToken: string;
  accessToken: string | null;
  expiryDateMs: number | null;
  scopes: string[];
  connectedAt: string;
}

function tokenPathForUser(userId: string): string {
  return path.join(app.getPath('userData'), 'calendar-auth', `${userId}.bin`);
}

export function loadTokens(userId: string): StoredGoogleTokens | null {
  const filePath = tokenPathForUser(userId);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const buffer = fs.readFileSync(filePath);
    return decryptJsonPayload<StoredGoogleTokens>(buffer);
  } catch {
    return null;
  }
}

export function saveTokens(userId: string, tokens: StoredGoogleTokens): void {
  const dir = path.join(app.getPath('userData'), 'calendar-auth');
  fs.mkdirSync(dir, { recursive: true });
  const buffer = encryptJsonPayload(tokens);
  fs.writeFileSync(tokenPathForUser(userId), buffer);
}

export function deleteTokens(userId: string): void {
  const filePath = tokenPathForUser(userId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
