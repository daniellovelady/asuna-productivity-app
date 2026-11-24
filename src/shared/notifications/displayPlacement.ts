export interface DisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PopupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_MARGIN = 20;

export function positionPopupInWorkArea(
  workArea: DisplayWorkArea,
  popupWidth: number,
  popupHeight: number,
  margin = DEFAULT_MARGIN,
): PopupBounds {
  const x = workArea.x + workArea.width - popupWidth - margin;
  const y = workArea.y + workArea.height - popupHeight - margin;

  return {
    x: Math.max(workArea.x + margin, x),
    y: Math.max(workArea.y + margin, y),
    width: popupWidth,
    height: popupHeight,
  };
}
