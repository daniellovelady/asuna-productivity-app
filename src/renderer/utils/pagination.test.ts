import { describe, expect, it } from 'vitest';
import {
  clampPage,
  getPageCount,
  getPageSlice,
  ITEMS_PER_PAGE,
} from './pagination';

describe('getPageCount', () => {
  it('returns 1 page for 0 items', () => {
    expect(getPageCount(0)).toBe(1);
  });

  it('returns 1 page for 1 through 5 items', () => {
    expect(getPageCount(1)).toBe(1);
    expect(getPageCount(5)).toBe(1);
  });

  it('returns 2 pages for 6 items', () => {
    expect(getPageCount(6)).toBe(2);
  });

  it('returns 3 pages for 11 items', () => {
    expect(getPageCount(11)).toBe(3);
  });
});

describe('clampPage', () => {
  it('clamps invalid high page to the highest valid page', () => {
    expect(clampPage(3, 2)).toBe(2);
  });

  it('clamps invalid low page to 1', () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(-1, 3)).toBe(1);
  });

  it('keeps valid page unchanged', () => {
    expect(clampPage(2, 3)).toBe(2);
  });
});

describe('getPageSlice', () => {
  const items = Array.from({ length: 11 }, (_, index) => `item-${index + 1}`);

  it('returns an empty slice for 0 items', () => {
    expect(getPageSlice([], 1)).toEqual([]);
  });

  it('returns all items on page 1 when there are 5 or fewer', () => {
    const shortList = ['a', 'b', 'c'];
    expect(getPageSlice(shortList, 1)).toEqual(['a', 'b', 'c']);
  });

  it('returns the first page slice for page 1', () => {
    expect(getPageSlice(items, 1)).toEqual([
      'item-1',
      'item-2',
      'item-3',
      'item-4',
      'item-5',
    ]);
  });

  it('returns the second page slice for page 2', () => {
    expect(getPageSlice(items, 2)).toEqual([
      'item-6',
      'item-7',
      'item-8',
      'item-9',
      'item-10',
    ]);
  });

  it('returns the remainder on the final page', () => {
    expect(getPageSlice(items, 3)).toEqual(['item-11']);
  });

  it('clamps out-of-range page before slicing', () => {
    expect(getPageSlice(items, 99)).toEqual(['item-11']);
  });

  it('uses ITEMS_PER_PAGE by default', () => {
    expect(ITEMS_PER_PAGE).toBe(5);
    expect(getPageSlice(items, 1).length).toBe(5);
  });
});
