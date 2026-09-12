import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useSync } from '../sync/useSync';
import { ActivityIcon, BudgetIcon, HomeIcon, MoreIcon } from './icons';

const NAV = [
  { to: '/', key: 'nav.dashboard', end: true, icon: HomeIcon },
  { to: '/transactions', key: 'nav.transactions', end: false, icon: ActivityIcon },
  { to: '/budgets', key: 'nav.budgets', end: false, icon: BudgetIcon },
  { to: '/more', key: 'nav.more', end: false, icon: MoreIcon },
] as const;

/** GitLab-style light sidebar link: blue pill when active. */
function sidebarLinkClass({ isActive }: { isActive: boolean }) {
  const base =
    'flex min-h-[44px] items-center gap-2.5 rounded-md px-3 py-2.5 text-[0.9375rem] whitespace-nowrap transition-colors';
  return isActive
    ? `${base} bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]`
    : `${base} font-medium text-[var(--sidebar-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--sidebar-text)]`;
}

function topLinkClass({ isActive }: { isActive: boolean }) {
  const base =
    'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-xs font-medium whitespace-nowrap transition-colors';
  return isActive
    ? `${base} bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]`
    : `${base} text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]`;
}

export function Layout() {
  const { t } = useI18n();
  const { online, engine, connected, hasSynced, syncError } = useSync();
  const { bypassed } = useAuth();

  const syncState = (() => {
    if (engine === 'local-only') return online ? 'online' : 'offline';
    if (!online) return 'offline';
    if (syncError) return 'error';
    if (connected && hasSynced) return 'synced';
    return 'syncing';
  })();

  const syncLabel = (() => {
    switch (syncState) {
      case 'online':
        return t('header.online');
      case 'offline':
        return t('header.offline');
      case 'error':
        return t('header.syncError');
      case 'synced':
        return t('header.synced');
      case 'syncing':
        return t('header.syncing');
    }
  })();

  const dotClass = (() => {
    switch (syncState) {
      case 'synced':
      case 'online':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-amber-500';
    }
  })();

  const statusPill = (
    <span
      className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium text-[var(--text-muted)]"
      title={syncError ?? t('header.localOnly')}
    >
      <span
        aria-hidden="true"
        className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${dotClass}`}
      />
      {syncLabel}
    </span>
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--text)] md:flex-row">
      {/* Sidebar (desktop): light GitLab style, fixed while content scrolls. */}
      <aside className="sidebar-fixed hidden w-64 shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] md:flex">
        <div className="flex items-center gap-2.5 px-4 pb-2 pt-5">
          <span className="logo-mark" aria-hidden="true">
            C
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-tight">{t('app.name')}</p>
            <p className="truncate text-xs text-[var(--sidebar-muted)]">{t('app.tagline')}</p>
          </div>
        </div>
        <nav aria-label="primary" className="flex flex-col gap-0.5 px-3 py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={sidebarLinkClass}>
                <Icon size={20} />
                {t(item.key)}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col items-start gap-3 border-t border-[var(--sidebar-border)] p-4">
          {statusPill}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header (mobile): brand + status */}
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] md:hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="logo-mark" aria-hidden="true">
                C
              </span>
              <p className="truncate text-base font-bold leading-tight">{t('app.name')}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">{statusPill}</div>
          </div>
          {bypassed ? (
            <p className="border-t border-[var(--border)] bg-[var(--warning-bg)] px-4 py-2 text-center text-sm text-[var(--warning-text)]">
              {t('header.devNoBackend')}
            </p>
          ) : null}
        </header>

        {/* Dev banner (desktop) */}
        {bypassed ? (
          <p className="hidden border-b border-[var(--border)] bg-[var(--warning-bg)] px-4 py-2 text-center text-sm text-[var(--warning-text)] md:block">
            {t('header.devNoBackend')}
          </p>
        ) : null}

        {/* Content */}
        <main className="app-main min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile): four equal taps */}
      <nav
        aria-label="primary"
        className="bottom-nav fixed inset-x-0 bottom-0 z-10 border-t border-[var(--border)] bg-[var(--surface)] md:hidden"
      >
        <div className="flex gap-1 px-2 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={topLinkClass}>
                <Icon size={22} />
                {t(item.key)}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
