import { useState } from 'react';
import { AVATAR_CATALOG } from '../../shared/assistant/avatars';
import {
  BREAK_DURATION_OPTIONS,
  FOCUS_DURATION_OPTIONS,
} from '../../shared/preferences/validation';
import type { EncouragementLevel, ReminderTone } from '../../shared/preferences/types';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { useAuth } from '../hooks/useAuth';
import { usePreferences } from '../context/PreferencesProvider';
import { useAgenda } from '../hooks/useAgenda';

export function SettingsView(): JSX.Element {
  const { user } = useAuth();
  const { preferences, updatePreferences, error } = usePreferences();
  const activityTracking = useActivityTracking(user !== null, user?.id ?? null);
  const agenda = useAgenda();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = async (update: Parameters<typeof updatePreferences>[0]) => {
    setSaveMessage(null);
    try {
      await updatePreferences(update);
      setSaveMessage('Saved.');
    } catch {
      setSaveMessage('Save failed.');
    }
  };

  return (
    <section className="settings-view" aria-label="Settings">
      <h2 className="settings-title">Settings</h2>

      {error ? <p className="settings-error" role="alert">{error}</p> : null}
      {saveMessage ? <p className="settings-save-message">{saveMessage}</p> : null}

      <section className="settings-section">
        <h3>Assistant</h3>

        <fieldset className="settings-fieldset">
          <legend>Avatar</legend>
          <div className="settings-avatar-grid">
            {AVATAR_CATALOG.map((avatar) => (
              <label key={avatar.id} className="settings-avatar-option">
                <input
                  type="radio"
                  name="avatar-style"
                  value={avatar.id}
                  checked={preferences.avatarStyle === avatar.id}
                  onChange={() => {
                    void handleSave({ avatarStyle: avatar.id });
                  }}
                />
                <span className={`assistant-avatar assistant-avatar--${avatar.id}`} aria-hidden="true" />
                <span>{avatar.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="settings-label" htmlFor="encouragement-level">
          Encouragement frequency
        </label>
        <select
          id="encouragement-level"
          className="settings-select"
          value={preferences.encouragementLevel}
          onChange={(event) => {
            void handleSave({ encouragementLevel: event.target.value as EncouragementLevel });
          }}
        >
          <option value="low">Low (20 min)</option>
          <option value="medium">Normal (10 min)</option>
          <option value="high">High (5 min)</option>
        </select>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={preferences.quietMode}
            onChange={(event) => {
              void handleSave({ quietMode: event.target.checked });
            }}
          />
          Quiet mode
        </label>
        <p className="settings-help">
          Quiet mode hides proactive coaching such as focus encouragement and distraction
          reminders. Focus session completion notifications still appear. Tracking and
          analytics continue normally.
        </p>

        <label className="settings-label" htmlFor="reminder-tone">
          Reminder tone
        </label>
        <select
          id="reminder-tone"
          className="settings-select"
          value={preferences.reminderTone}
          onChange={(event) => {
            void handleSave({ reminderTone: event.target.value as ReminderTone });
          }}
        >
          <option value="gentle">Gentle</option>
          <option value="neutral">Neutral</option>
          <option value="direct">Direct</option>
        </select>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={preferences.aiMessageVariationEnabled}
            onChange={(event) => {
              void handleSave({ aiMessageVariationEnabled: event.target.checked });
            }}
          />
          AI message variation
        </label>
        <p className="settings-help">
          Rewrites reminder wording using AI. May use API credits. Reminders always appear instantly with default wording.
        </p>
      </section>

      <section className="settings-section">
        <h3>Focus</h3>

        <label className="settings-label" htmlFor="focus-minutes">
          Default focus duration (minutes)
        </label>
        <select
          id="focus-minutes"
          className="settings-select"
          value={preferences.focusMinutes}
          onChange={(event) => {
            void handleSave({ focusMinutes: Number.parseInt(event.target.value, 10) });
          }}
        >
          {FOCUS_DURATION_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>{minutes}</option>
          ))}
        </select>

        <label className="settings-label" htmlFor="break-minutes">
          Break duration (minutes)
        </label>
        <select
          id="break-minutes"
          className="settings-select"
          value={preferences.breakMinutes}
          onChange={(event) => {
            void handleSave({ breakMinutes: Number.parseInt(event.target.value, 10) });
          }}
        >
          {BREAK_DURATION_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>{minutes}</option>
          ))}
        </select>
      </section>

      <section className="settings-section">
        <h3>Integrations</h3>
        <p className="settings-help">
          Google Calendar provides your Agenda schedule. Signing out of A.S.U.N.A. keeps your Google connection
          on this device; use Disconnect to revoke access.
        </p>
        <p className="settings-help">
          Status:
          {' '}
          {agenda.state?.account.status === 'connected'
            ? 'Google Calendar connected'
            : agenda.state?.account.status === 'reauth_required'
              ? 'Google Calendar connection expired — reconnect required'
              : 'Not connected'}
        </p>
        <div className="settings-actions">
          {agenda.state?.account.status === 'connected' ? (
            <button
              type="button"
              className="settings-button"
              onClick={() => {
                void agenda.disconnect();
              }}
            >
              Disconnect Google Calendar
            </button>
          ) : agenda.state?.account.status === 'reauth_required' ? (
            <button
              type="button"
              className="settings-button"
              onClick={() => {
                void agenda.connect();
              }}
            >
              Reconnect Google Calendar
            </button>
          ) : (
            <button
              type="button"
              className="settings-button"
              onClick={() => {
                void agenda.connect();
              }}
            >
              Connect Google Calendar
            </button>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h3>Privacy</h3>
        <p className="settings-help">
          Activity tracking is opt-in and starts disabled on each app launch, even if you previously enabled it.
        </p>
        <p className="settings-help">
          Status:
          {' '}
          {activityTracking.statusLabel}
        </p>
        <div className="settings-actions">
          <button
            type="button"
            className="settings-button"
            disabled={activityTracking.isLoading || activityTracking.state?.status === 'running'}
            onClick={() => {
              void activityTracking.enable();
            }}
          >
            Enable tracking
          </button>
          <button
            type="button"
            className="settings-button"
            disabled={activityTracking.isLoading || activityTracking.state?.status === 'disabled'}
            onClick={() => {
              void activityTracking.disable();
            }}
          >
            Disable tracking
          </button>
          <button
            type="button"
            className="settings-button"
            disabled={activityTracking.isLoading || activityTracking.state?.status !== 'running'}
            onClick={() => {
              void activityTracking.pause();
            }}
          >
            Pause
          </button>
          <button
            type="button"
            className="settings-button"
            disabled={activityTracking.isLoading || activityTracking.state?.status !== 'paused'}
            onClick={() => {
              void activityTracking.resume();
            }}
          >
            Resume
          </button>
        </div>
      </section>
    </section>
  );
}
