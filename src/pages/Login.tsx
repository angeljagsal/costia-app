import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';

export function Login() {
  const { t } = useI18n();
  const { configured, bypassed, session, sendMagicLink } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'invalid'>('idle');

  if (session) {
    navigate('/', { replace: true });
    return null;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus('invalid');
      return;
    }
    setStatus('sending');
    const res = await sendMagicLink(value);
    setStatus(res.ok ? 'sent' : 'error');
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('auth.title')}</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{t('auth.subtitle')}</p>

      {!configured ? (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {t('auth.notConfigured')}
        </p>
      ) : null}

      {configured ? (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t('auth.emailLabel')}
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-base text-[var(--text)]"
            />
          </label>
          <button
            type="submit"
            disabled={status === 'sending'}
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-text)] disabled:opacity-60"
          >
            {status === 'sending' ? t('auth.sending') : t('auth.sendLink')}
          </button>
          {status === 'sent' ? <p className="text-sm">{t('auth.checkEmail')}</p> : null}
          {status === 'error' ? (
            <p className="text-sm text-[var(--danger)]">{t('auth.error')}</p>
          ) : null}
          {status === 'invalid' ? (
            <p className="text-sm text-[var(--danger)]">{t('auth.invalidEmail')}</p>
          ) : null}
        </form>
      ) : null}

      {bypassed ? (
        <Link
          to="/"
          className="mt-4 rounded-lg border border-[var(--border)] px-4 py-2.5 text-center text-sm font-medium"
        >
          {t('common.backToDashboard')} (dev)
        </Link>
      ) : null}
    </div>
  );
}
