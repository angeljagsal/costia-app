import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { BankIcon, BudgetIcon, RepeatIcon } from '../components/icons';
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

const POINTS = [
  { icon: BankIcon, title: 'auth.point1Title', body: 'auth.point1Body' },
  { icon: BudgetIcon, title: 'auth.point2Title', body: 'auth.point2Body' },
  { icon: RepeatIcon, title: 'auth.point3Title', body: 'auth.point3Body' },
] as const;

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
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      {/* Design panel: brand + why, flat navy, decorative flat shapes only. */}
      <aside className="relative overflow-hidden bg-[var(--hero-bg)] text-[var(--hero-text)] md:w-[44%] md:shrink-0">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-16 right-10 hidden h-24 w-24 rounded-2xl bg-white/10 md:block"
        />
        <div className="relative flex h-full flex-col gap-8 p-6 md:justify-center md:p-10">
          <div className="flex items-center gap-3">
            <span className="logo-mark logo-mark-lg" aria-hidden="true">
              C
            </span>
            <div>
              <p className="text-xl font-bold leading-tight">{t('app.name')}</p>
              <p className="text-sm text-[var(--hero-muted)]">{t('app.tagline')}</p>
            </div>
          </div>
          <div className="hidden flex-col gap-6 md:flex">
            {POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon size={22} />
                  </span>
                  <span>
                    <span className="block font-bold">{t(p.title)}</span>
                    <span className="block text-sm text-[var(--hero-muted)]">{t(p.body)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center bg-[var(--bg)] px-4 py-8">
        <div className="card w-full max-w-md p-6 md:p-8">
          <h1 className="page-title">{t('auth.title')}</h1>
          <p className="page-sub">{t('auth.subtitle')}</p>

          {!configured ? (
            <p className="mt-4 border border-[var(--warning-text)] bg-[var(--warning-bg)] p-4 text-[var(--warning-text)]">
              {t('auth.notConfigured')}
            </p>
          ) : null}

          {configured ? (
            <>
              <div className="segmented mt-4" role="tablist" aria-label={t('auth.title')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'password'}
                  onClick={() => {
                    setTab('password');
                    setStatus('idle');
                  }}
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
      </main>
    </div>
  );
}
