import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';

type Tab = 'password' | 'magic';
type Status =
  | 'idle'
  | 'working'
  | 'sent'
  | 'error'
  | 'invalid'
  | 'weak'
  | 'badCredentials'
  | 'emailInUse'
  | 'confirmEmail'
  | 'rateLimited';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Login() {
  const { t } = useI18n();
  const { configured, bypassed, session, sendMagicLink, signInWithPassword, signUpWithPassword } =
    useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  if (session) {
    navigate('/', { replace: true });
    return null;
  }

  const validEmail = EMAIL_RE.test(email.trim());

  const onMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail) {
      setStatus('invalid');
      return;
    }
    setStatus('working');
    const res = await sendMagicLink(email.trim());
    if (res.ok) setStatus('sent');
    else if (res.message === 'rateLimited') setStatus('rateLimited');
    else setStatus('error');
  };

  const runPassword = async (signup: boolean) => {
    if (!validEmail) {
      setStatus('invalid');
      return;
    }
    if (password.length < 6) {
      setStatus('weak');
      return;
    }
    setStatus('working');
    const res = signup
      ? await signUpWithPassword(email.trim(), password)
      : await signInWithPassword(email.trim(), password);
    if (res.ok) {
      // Signed in (session restores via onAuthStateChange) or waiting on confirmation.
      if (res.message === 'confirmEmail') setStatus('confirmEmail');
      return;
    }
    if (res.message === 'invalidCredentials') setStatus('badCredentials');
    else if (res.message === 'emailInUse') setStatus('emailInUse');
    else if (res.message === 'weakPassword') setStatus('weak');
    else if (res.message === 'confirmEmail') setStatus('confirmEmail');
    else setStatus('error');
  };

  const statusMessage =
    status === 'sent' ? (
      <p>{t('auth.checkEmail')}</p>
    ) : status === 'confirmEmail' ? (
      <p>{t('auth.confirmEmail')}</p>
    ) : status === 'error' ? (
      <p className="error-text">{t('auth.error')}</p>
    ) : status === 'rateLimited' ? (
      <p className="error-text">{t('auth.rateLimited')}</p>
    ) : status === 'invalid' ? (
      <p className="error-text">{t('auth.invalidEmail')}</p>
    ) : status === 'weak' ? (
      <p className="error-text">{t('auth.weakPassword')}</p>
    ) : status === 'badCredentials' ? (
      <p className="error-text">{t('auth.invalidCredentials')}</p>
    ) : status === 'emailInUse' ? (
      <p className="error-text">{t('auth.emailInUse')}</p>
    ) : null;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4">
      <h1 className="page-title">{t('auth.title')}</h1>
      <p className="page-sub">{t('auth.subtitle')}</p>

      {!configured ? (
        <p className="card mt-4 border-[var(--warning-text)] bg-[var(--warning-bg)] text-[var(--warning-text)]">
          {t('auth.notConfigured')}
        </p>
      ) : null}

      {configured ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2" role="tablist" aria-label={t('auth.title')}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'password'}
              onClick={() => {
                setTab('password');
                setStatus('idle');
              }}
              className={`btn ${tab === 'password' ? 'btn-primary' : 'btn-secondary'}`}
            >
              {t('auth.tabPassword')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'magic'}
              onClick={() => {
                setTab('magic');
                setStatus('idle');
              }}
              className={`btn ${tab === 'magic' ? 'btn-primary' : 'btn-secondary'}`}
            >
              {t('auth.tabMagicLink')}
            </button>
          </div>

          {tab === 'password' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runPassword(false);
              }}
              className="mt-4 flex flex-col gap-4"
            >
              <label className="label">
                {t('auth.emailLabel')}
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="input"
                />
              </label>
              <label className="label">
                {t('auth.passwordLabel')}
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="input"
                />
              </label>
              <button type="submit" disabled={status === 'working'} className="btn btn-primary">
                {status === 'working' ? t('auth.sending') : t('auth.signIn')}
              </button>
              <button
                type="button"
                disabled={status === 'working'}
                onClick={() => void runPassword(true)}
                className="btn btn-secondary"
              >
                {t('auth.createAccount')}
              </button>
              {statusMessage}
            </form>
          ) : (
            <form onSubmit={onMagicLink} className="mt-4 flex flex-col gap-4">
              <label className="label">
                {t('auth.emailLabel')}
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="input"
                />
              </label>
              <button type="submit" disabled={status === 'working'} className="btn btn-primary">
                {status === 'working' ? t('auth.sending') : t('auth.sendLink')}
              </button>
              {statusMessage}
            </form>
          )}
        </>
      ) : null}

      {bypassed ? (
        <Link to="/" className="btn btn-secondary mt-4">
          {t('common.backToDashboard')} (dev)
        </Link>
      ) : null}
    </div>
  );
}
