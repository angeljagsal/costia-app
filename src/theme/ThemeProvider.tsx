import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './useTheme';
import type { ThemeCtx } from './useTheme';

export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'costia:theme';

function load(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return 'system';
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(load);
  const [dark, setDark] = useState<boolean>(() =>
    load() === 'dark' ? true : load() === 'light' ? false : prefersDark()
  );

  useEffect(() => {
    const apply = () => {
      const isDark = choice === 'dark' || (choice === 'system' && prefersDark());
      setDark(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    };
    apply();
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // ignore
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (choice === 'system') apply();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  const setChoice = useCallback((c: ThemeChoice) => setChoiceState(c), []);
  const value: ThemeCtx = useMemo(() => ({ choice, dark, setChoice }), [choice, dark, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
