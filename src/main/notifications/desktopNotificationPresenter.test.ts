import { describe, expect, it, vi } from 'vitest';

import { DesktopNotificationPresenter } from './desktopNotificationPresenter';

import type { DesktopNotificationWindow } from './desktopNotificationWindow';

import type { NotificationViewModel } from '../../shared/notifications/types';



function createMockWindow(): DesktopNotificationWindow {

  return {

    ensureCreated: vi.fn(),

    positionWindow: vi.fn(() => ({ x: 100, y: 200, width: 380, height: 140 })),

    showInactive: vi.fn(),

    hide: vi.fn(),

    destroy: vi.fn(),

    send: vi.fn(),

    getWebContents: vi.fn(() => ({ isDestroyed: () => false, id: 42 })),

  } as unknown as DesktopNotificationWindow;

}



const payload: NotificationViewModel = {

  id: 'n-1',

  title: 'Test',

  message: 'Hello',

  avatarStyle: 'default',

  avatarState: 'encouraging',

  actions: ['dismiss'],

};



const payload2: NotificationViewModel = {

  ...payload,

  id: 'n-2',

  message: 'Updated',

};



describe('DesktopNotificationPresenter', () => {

  it('buffers display until ready and keeps window hidden', () => {

    const window = createMockWindow();

    const presenter = new DesktopNotificationPresenter(window);



    const displayed = presenter.present(payload);

    expect(displayed).toBe(false);

    expect(window.send).not.toHaveBeenCalled();

    expect(window.showInactive).not.toHaveBeenCalled();

  });



  it('sends display after ready but waits for rendered acknowledgement before show', () => {

    const window = createMockWindow();

    const presenter = new DesktopNotificationPresenter(window);



    presenter.markReady();

    presenter.present(payload);



    expect(window.positionWindow).toHaveBeenCalled();

    expect(window.send).toHaveBeenCalledWith('notification:display', payload);

    expect(window.showInactive).not.toHaveBeenCalled();

    expect(presenter.getAwaitingRenderedId()).toBe('n-1');

  });



  it('shows window once after matching rendered acknowledgement', () => {

    const window = createMockWindow();

    const presenter = new DesktopNotificationPresenter(window);



    presenter.markReady();

    presenter.present(payload);



    expect(presenter.acknowledgeRendered('n-1')).toBe(true);

    expect(window.showInactive).toHaveBeenCalledTimes(1);

    expect(presenter.getAwaitingRenderedId()).toBeNull();

  });



  it('ignores stale rendered acknowledgement', () => {

    const window = createMockWindow();

    const presenter = new DesktopNotificationPresenter(window);



    presenter.markReady();

    presenter.present(payload);

    presenter.present(payload2);



    expect(presenter.acknowledgeRendered('n-1')).toBe(false);

    expect(window.showInactive).not.toHaveBeenCalled();



    expect(presenter.acknowledgeRendered('n-2')).toBe(true);

    expect(window.showInactive).toHaveBeenCalledTimes(1);

  });



  it('updateOnly sends display without awaiting rendered acknowledgement', () => {

    const window = createMockWindow();

    const presenter = new DesktopNotificationPresenter(window);



    presenter.markReady();

    presenter.present(payload, { updateOnly: true });



    expect(window.send).toHaveBeenCalledWith('notification:display', payload);

    expect(window.positionWindow).not.toHaveBeenCalled();

    expect(presenter.getAwaitingRenderedId()).toBeNull();

    expect(window.showInactive).not.toHaveBeenCalled();

  });



  it('clears renderer state when hidden between notifications', () => {
    const window = createMockWindow();
    const presenter = new DesktopNotificationPresenter(window);

    presenter.markReady();
    presenter.present(payload);
    presenter.hide();

    expect(window.send).toHaveBeenCalledWith('notification:clear');
    expect(presenter.getAwaitingRenderedId()).toBeNull();
  });

  it('presents a second notification after the first is hidden', () => {
    const window = createMockWindow();
    const presenter = new DesktopNotificationPresenter(window);

    presenter.markReady();
    presenter.present(payload);
    presenter.acknowledgeRendered('n-1');
    presenter.hide();

    presenter.present(payload2);
    expect(presenter.getAwaitingRenderedId()).toBe('n-2');
    expect(presenter.acknowledgeRendered('n-2')).toBe(true);
    expect(window.showInactive).toHaveBeenCalledTimes(2);
  });

  it('re-sends current notification after reload ready without duplicating queue state', () => {

    const window = createMockWindow();

    const presenter = new DesktopNotificationPresenter(window);



    presenter.markReady();

    presenter.present(payload);

    presenter.markNotReady();

    presenter.present(payload);

    presenter.markReady();



    expect(window.send).toHaveBeenCalledTimes(2);

    expect(window.showInactive).not.toHaveBeenCalled();

  });

});


