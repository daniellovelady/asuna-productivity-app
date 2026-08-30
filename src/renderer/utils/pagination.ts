export const ITEMS_PER_PAGE = 5;

export function getPageCount(itemCount: number, itemsPerPage = ITEMS_PER_PAGE): number {
  if (itemCount <= 0) {
    return 1;
  }

  return Math.ceil(itemCount / itemsPerPage);
}

export function clampPage(page: number, pageCount: number): number {
  const safePageCount = Math.max(1, pageCount);
  return Math.min(Math.max(1, page), safePageCount);
}

export function getPageSlice<T>(
  items: T[],
  page: number,
  itemsPerPage = ITEMS_PER_PAGE,
): T[] {
  const pageCount = getPageCount(items.length, itemsPerPage);
  const clampedPage = clampPage(page, pageCount);
  const start = (clampedPage - 1) * itemsPerPage;

  return items.slice(start, start + itemsPerPage);
}
