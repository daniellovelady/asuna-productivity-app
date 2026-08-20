## Technology Stack

- Use Electron for desktop integration.
- Use React and React DOM for renderer UI.
- Use TypeScript for Electron and renderer code.
- Use Vite and Electron Forge for development and packaging.
- Use Supabase for authentication and cloud persistence.
- Use Python and FastAPI for the AI backend.
- Use Pydantic for backend input and output validation.
- Do not replace these technologies without explicit approval.

## Folder Conventions

- Keep Electron main-process code under `src/main/`.
- Keep preload bridge code under `src/preload/`.
- Keep React renderer code under `src/renderer/`.
- Put reusable React components under `src/renderer/components/`.
- Put renderer API wrappers under `src/renderer/services/`.
- Keep protected AI and OpenAI logic inside `backend/`.
- Do not place business logic directly inside React components.
- Do not place unrestricted operating-system access in the renderer.
- Do not create new top-level folders without explaining why.

## Security Rules

- Keep `contextIsolation` enabled.
- Do not expose Node.js directly to the renderer.
- Do not expose the complete `ipcRenderer` object.
- Expose only narrow, named functions through the preload script.
- Validate all IPC input before using it.
- Never hard-code API keys, passwords, tokens, or secrets.
- Never commit `.env` files.
- Keep the OpenAI API key on the backend, never in Electron.
- Do not log authentication tokens or private user data.
- Use Supabase Row Level Security for user-owned tables.
- A user must never be able to access another user's records.
- Do not collect keystrokes, screenshots, document contents, or browser history.
- Ask before weakening a security setting.

## Scope Control

- Make only the changes necessary to satisfy the current task.
- Do not make opportunistic cleanup, renaming, styling, branding, or refactoring changes.
- Do not modify unrelated code even if the change appears beneficial.
- If you notice an unrelated improvement, mention it after completing the task instead of implementing it.

## Testing and Verification

After changing code:

- Run the TypeScript compiler or type-check command.
- Run the relevant automated tests.
- Run the lint command when available.
- Run the production build for structural changes.
- Test at least one expected success case.
- Test at least one relevant failure or edge case.
- Do not claim a feature works unless it was actually verified.
- Clearly state which checks and tests were run and their results.
- Clearly state anything that could not be tested.
- Add regression tests when fixing a bug.

## Dependency Policy

Before installing a new package, explain:

- What problem the package solves. 
- Why the existing stack cannot solve it adequately.
- Whether the package contains native code.
- Whether it affects Electron packaging.
- Whether it runs in the main, preload, renderer, or backend environment.
- Its maintenance status and license.
- The smallest reasonable alternative.
- The exact command that will be run.

Do not install a package without explicit approval.
Do not install overlapping libraries that solve the same problem.
Use existing dependencies when they are sufficient.