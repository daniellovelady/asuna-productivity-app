import { createFocusSessionButton } from './components/FocusSessionButton';

export function mountApp(root: HTMLElement): void {
  root.appendChild(createFocusSessionButton());
}
