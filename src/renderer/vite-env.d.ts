/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_COACH_DIAGNOSTICS?: string;
  /** Dev only: enable FullCalendar Phase 0A spike instead of the normal app shell. */
  readonly VITE_FULLCALENDAR_SPIKE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
