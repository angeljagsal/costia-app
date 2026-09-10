import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useSync } from '../sync/useSync';

const NAV = [
  { to: '/', key: 'nav.dashboard', end: true },
  { to: '/transactions', key: 'nav.transactions', end: false },
  { to: '/accounts', key: 'nav.accounts', end: false },
  { to: '/categories', key: 'nav.categories', end: false },
  { to: '/budgets', key: 'nav.budgets', end: false },
  { to: '/recurring', key: 'nav.recurring', end: false },
  { to: '/reports', key: 'nav.reports', end: false },
  { to: '/settings', key: 'nav.settings', end: false },
] as const;

function linkClass({ isActive }: { isActive: boolean }) {
  const base = 'rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors';
  return isActive
    ? `${base} bg-[var(--surface-2)] text-[var(--text)]`
    : `${base} text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]`;
}

export function Layout() {
  const { t } = useI18n();
  const { online } = useSync();
  const { session, bypassed, signOut } = useAuth();
  const navigate = useNavigate();

  const onSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--text)] md:flex-row">
      {/* Top header */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-tight">{t('app.name')}</p>
            <p className="hidden truncate text-xs text-[var(--text-muted)] sm:block">
              {t('app.tagline')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]"
              title={t('header.localOnly')}
            >
              <span
                aria-hidden="true"
                className={`mr-1.5 inline-block h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-amber-500'}`}
              />
              {online ? t('header.online') : t('header.offline')}
            </span>
            {bypassed ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                dev
              </span>
            ) : null}
            {session ? (
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {t('header.logout')}
              </button>
            ) : null}
          </div>
        </div>
        {bypassed ? (
          <p className="border-t border-[var(--border)] bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {t('header.devNoBackend')}
          </p>
        ) : null}
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4">
        {/* Sidebar (desktop) */}
        <nav aria-label="primary" className="hidden w-52 shrink-0 flex-col gap-1 py-6 md:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        {/* Content */}
        <main className="app-main min-w-0 flex-1 px-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile), horizontally scrollable so every section is one tap away */}
      <nav
        aria-label="primary"
        className="bottom-nav fixed inset-x-0 bottom-0 z-10 border-t border-[var(--border)] bg-[var(--bg)] md:hidden"
      >
        <div className="flex gap-1 overflow-x-auto px-2 py-2">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
