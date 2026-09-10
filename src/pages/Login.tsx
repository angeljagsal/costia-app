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
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error' | 'invalid' | 'rateLimited'
  >('idle');

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
    if (res.ok) setStatus('sent');
    else if (res.message === 'rateLimited') setStatus('rateLimited');
    else setStatus('error');
  };

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
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
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
          <button type="submit" disabled={status === 'sending'} className="btn btn-primary">
            {status === 'sending' ? t('auth.sending') : t('auth.sendLink')}
          </button>
          {status === 'sent' ? <p>{t('auth.checkEmail')}</p> : null}
          {status === 'error' ? <p className="error-text">{t('auth.error')}</p> : null}
          {status === 'rateLimited' ? <p className="error-text">{t('auth.rateLimited')}</p> : null}
          {status === 'invalid' ? <p className="error-text">{t('auth.invalidEmail')}</p> : null}
        </form>
      ) : null}

      {bypassed ? (
        <Link to="/" className="btn btn-secondary mt-4">
          {t('common.backToDashboard')} (dev)
        </Link>
      ) : null}
    </div>
  );
}
