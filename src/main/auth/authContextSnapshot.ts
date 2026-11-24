export interface AuthContextSnapshot {
  userId: string | null;
  sequence: number;
  generation: number;
  timeZone: string;
}

let rendererGeneration = 0;

let snapshot: AuthContextSnapshot = {
  userId: null,
  sequence: 0,
  generation: 0,
  timeZone: 'UTC',
};

export function getAuthContextSnapshot(): Readonly<AuthContextSnapshot> {
  return snapshot;
}

export function registerRendererGeneration(): number {
  rendererGeneration += 1;
  return rendererGeneration;
}

export function resetAuthContextSnapshotForTests(): void {
  rendererGeneration = 0;
  snapshot = {
    userId: null,
    sequence: 0,
    generation: 0,
    timeZone: 'UTC',
  };
}

export function applyAuthContextSnapshot(
  userId: string | null,
  sequence: number,
  generation: number,
  timeZone: string,
): boolean {
  if (generation < snapshot.generation) {
    return false;
  }

  if (generation === snapshot.generation && sequence < snapshot.sequence) {
    return false;
  }

  snapshot = {
    userId,
    sequence,
    generation,
    timeZone,
  };
  return true;
}