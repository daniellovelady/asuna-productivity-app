import { describe, expect, it } from 'vitest';
import { mapGoogleEvent, readMirrorScheduleBlockId } from './mapGoogleEvent';

describe('mapGoogleEvent mirror marker', () => {
  it('reads asuna_schedule_block_id from extended properties', () => {
    expect(
      readMirrorScheduleBlockId({
        extendedProperties: { private: { asuna_schedule_block_id: 'block-1' } },
      }),
    ).toBe('block-1');
  });

  it('maps mirrorScheduleBlockId onto CalendarEvent', () => {
    const event = mapGoogleEvent(
      {
        id: 'evt',
        summary: 'Test',
        start: { dateTime: '2026-03-10T10:00:00Z' },
        end: { dateTime: '2026-03-10T11:00:00Z' },
        extendedProperties: { private: { asuna_schedule_block_id: 'block-9' } },
      },
      { id: 'cal', provider: 'google', name: 'Work', primary: true },
      '2026-03-10T00:00:00.000Z',
    );

    expect(event?.mirrorScheduleBlockId).toBe('block-9');
  });
});