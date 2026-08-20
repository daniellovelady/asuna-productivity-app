export function createFocusSessionButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'focus-session-button';
  button.textContent = 'Start Focus Session';
  return button;
}
