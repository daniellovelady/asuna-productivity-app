import { safeStorage } from 'electron';

export class SafeStorageUnavailableError extends Error {
  constructor() {
    super('OS-backed encryption is unavailable. Calendar data cannot be stored safely.');
    this.name = 'SafeStorageUnavailableError';
  }
}

export function encryptJsonPayload(payload: unknown): Buffer {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new SafeStorageUnavailableError();
  }

  const json = JSON.stringify(payload);
  return safeStorage.encryptString(json);
}

export function decryptJsonPayload<T>(buffer: Buffer): T {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new SafeStorageUnavailableError();
  }

  const json = safeStorage.decryptString(buffer);
  return JSON.parse(json) as T;
}
