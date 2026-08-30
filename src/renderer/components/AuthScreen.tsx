import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

export function AuthScreen(): JSX.Element {
  const { signIn, signUp, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);
    clearError();
    setIsSubmitting(true);

    await signIn({ email, password });

    setIsSubmitting(false);
  };

  const handleSignUp = async () => {
    setSuccessMessage(null);
    clearError();
    setIsSubmitting(true);

    const result = await signUp({ email, password });

    if (!result.error && result.needsEmailConfirmation) {
      setSuccessMessage('Account created. Check your email to confirm before signing in.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">A.S.U.N.A.</h1>
        <p className="auth-subtitle">Sign in to continue</p>

        <form
          className="auth-form"
          onSubmit={handleSignIn}
        >
          <label className="auth-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />

          <label className="auth-label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            className="auth-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            required
          />

          {error && (
            <p className="auth-message auth-message--error" role="alert">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="auth-message auth-message--success" role="status">
              {successMessage}
            </p>
          )}

          <div className="auth-actions">
            <button
              className="auth-button auth-button--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
            <button
              className="auth-button auth-button--secondary"
              type="button"
              disabled={isSubmitting}
              onClick={handleSignUp}
            >
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
