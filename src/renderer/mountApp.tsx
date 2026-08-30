import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthProvider';

export function mountApp(root: HTMLElement): void {
  createRoot(root).render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  );
}
