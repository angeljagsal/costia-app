import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { loadBaseCurrency, saveBaseCurrency } from '../lib/prefs';
import type { BaseCurrency } from '../lib/prefs';
import { useI18n } from '../i18n/useI18n';
import type { Locale } from '../i18n/I18nProvider';
import { useTheme } from '../theme/useTheme';
import type { ThemeChoice } from '../theme/ThemeProvider';

function row(title: string, control: ReactNode) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <span className="text-sm font-medium">{title}</span>
      {control}
    </label>
  );
}

const selectClass =
  'rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]';

export function Settings() {
  const { t, locale, setLocale } = useI18n();
  const { choice, setChoice } = useTheme();
  const [currency, setCurrency] = useState<BaseCurrency>(loadBaseCurrency);

  useEffect(() => {
    saveBaseCurrency(currency);
  }, [currency]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>

      {row(
        t('settings.language'),
        <select
          aria-label={t('settings.language')}
          className={selectClass}
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
          className={selectClass}
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
            className={selectClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as BaseCurrency)}
          >
            <option value="MXN">MXN — MX$</option>
            <option value="USD">USD — US$</option>
          </select>
        )}
        <p className="text-xs text-[var(--text-muted)]">{t('settings.baseCurrencyHint')}</p>
      </div>

      {row(
        t('settings.backend'),
        <span className="text-sm text-[var(--text-muted)]">
          {isSupabaseConfigured ? t('settings.backendConfigured') : t('settings.backendMissing')}
        </span>
      )}
    </div>
  );
}
