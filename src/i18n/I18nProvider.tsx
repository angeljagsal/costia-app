import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { I18nContext } from './useI18n';
import type { I18nCtx } from './useI18n';
import en from './locales/en.json';
import esMx from './locales/es-MX.json';

export type Locale = 'en' | 'es-MX';

const DICTS = { en, 'es-MX': esMx } as const;
const STORAGE_KEY = 'costia:locale';

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es-MX') return saved;
  } catch {
    // private mode etc. — fall through to browser default
  }
  const lang = navigator.language?.toLowerCase() ?? 'en';
  return lang.startsWith('es') ? 'es-MX' : 'en';
}

type Dict = typeof en;

function lookup(dict: Dict, key: string): string {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (typeof cur !== 'object' || cur === null) return key;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : key;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore persistence failures
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const t = useCallback(
    (key: string) => lookup(DICTS[locale], key) || lookup(DICTS.en, key),
    [locale]
  );

  const value: I18nCtx = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
