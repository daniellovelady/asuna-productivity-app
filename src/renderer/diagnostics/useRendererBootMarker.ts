import { useEffect } from 'react';
import { rendererBootLog } from './rendererBoot';

export function useRendererBootMarker(stage: string): void {
  useEffect(() => {
    rendererBootLog(stage);
  }, [stage]);
}