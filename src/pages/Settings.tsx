import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { loadBaseCurrency, saveBaseCurrency } from '../lib/prefs';
import type { BaseCurrency } from '../lib/prefs';
import { useI18n } from '../i18n/useI18n';
import type { Locale } from '../i18n/I18nProvider';
import { useTheme } from '../theme/useTheme';
import type { ThemeChoice } from '../theme/ThemeProvider';

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';

function row(title: string, control: ReactNode) {
  return (
    <label className="card flex items-center justify-between gap-4">
      <span className="font-medium">{title}</span>
      {control}
    </label>
  );
}

export function Settings() {
  const { t, locale, setLocale } = useI18n();
  const { choice, setChoice } = useTheme();
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<BaseCurrency>(loadBaseCurrency);

  useEffect(() => {
    saveBaseCurrency(currency);
  }, [currency]);

  const onSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">{t('settings.title')}</h1>

      {row(
        t('settings.language'),
        <select
          aria-label={t('settings.language')}
          className="input w-auto"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          <option value="en">English</option>
          <option value="es-MX">Español (MX)</option>
        </select>
      )}

      {row(
        t('settings.theme'),
        <select
          aria-label={t('settings.theme')}
          className="input w-auto"
          value={choice}
          onChange={(e) => setChoice(e.target.value as ThemeChoice)}
        >
          <option value="system">{t('settings.themeSystem')}</option>
          <option value="light">{t('settings.themeLight')}</option>
          <option value="dark">{t('settings.themeDark')}</option>
        </select>
      )}

      <div className="flex flex-col gap-1">
        {row(
          t('settings.baseCurrency'),
          <select
            aria-label={t('settings.baseCurrency')}
            className="input w-auto"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as BaseCurrency)}
          >
            <option value="MXN">MXN — MX$</option>
            <option value="USD">USD — US$</option>
          </select>
        )}
        <p className="hint">{t('settings.baseCurrencyHint')}</p>
      </div>

      {row(
        t('settings.backend'),
        <span className="hint">
          {isSupabaseConfigured ? t('settings.backendConfigured') : t('settings.backendMissing')}
        </span>
      )}

      {row(t('settings.version'), <span className="hint">{APP_VERSION}</span>)}

      {session ? (
        <button type="button" onClick={onSignOut} className="btn btn-secondary self-start">
          {t('header.logout')}
        </button>
      ) : null}
    </div>
  );
}
