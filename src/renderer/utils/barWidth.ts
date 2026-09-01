export function computeBarWidthPercent(maxValue: number, value: number): number {
  if (maxValue <= 0) {
    return 0;
  }

  return (value / maxValue) * 100;
}
