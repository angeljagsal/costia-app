import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useSync } from '../sync/useSync';

const NAV = [
  { to: '/', key: 'nav.dashboard', end: true },
  { to: '/transactions', key: 'nav.transactions', end: false },
  { to: '/budgets', key: 'nav.budgets', end: false },
  { to: '/more', key: 'nav.more', end: false },
] as const;

function sidebarLinkClass({ isActive }: { isActive: boolean }) {
  const base =
    'flex min-h-[44px] items-center rounded-md px-3 py-2.5 text-[0.9375rem] font-medium whitespace-nowrap transition-colors';
  return isActive
    ? `${base} bg-[var(--sidebar-active)] text-[var(--sidebar-text)]`
    : `${base} text-[var(--sidebar-muted)] hover:bg-white/10 hover:text-[var(--sidebar-text)]`;
}

function topLinkClass({ isActive }: { isActive: boolean }) {
  const base =
    'flex min-h-[48px] items-center rounded-md px-4 py-3 text-[0.9375rem] font-medium whitespace-nowrap transition-colors';
  return isActive
    ? `${base} bg-[var(--surface-2)] text-[var(--text)]`
    : `${base} text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]`;
}

export function Layout() {
  const { t } = useI18n();
  const { online, engine, connected, hasSynced, syncError } = useSync();
  const { session, bypassed, signOut } = useAuth();
  const navigate = useNavigate();

  const onSignOut = async () => {
    await signOut();
    navigate('/login');
  };

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

  const signOutButton = session ? (
    <button type="button" onClick={onSignOut} className="btn btn-secondary">
      {t('header.logout')}
    </button>
  ) : null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--text)] md:flex-row">
      {/* Sidebar (desktop): dark, GitLab-style */}
      <aside className="hidden w-60 shrink-0 flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] md:flex">
        <div className="px-4 pb-2 pt-6">
          <p className="truncate text-lg font-bold leading-tight">{t('app.name')}</p>
          <p className="truncate text-sm text-[var(--sidebar-muted)]">{t('app.tagline')}</p>
        </div>
        <nav aria-label="primary" className="flex flex-col gap-1 px-3 py-4">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={sidebarLinkClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 p-4">
          {statusPill}
          {signOutButton}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header (mobile): name + status */}
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] md:hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <p className="truncate text-lg font-bold leading-tight">{t('app.name')}</p>
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

      {/* Bottom nav (mobile): every section one tap away */}
      <nav
        aria-label="primary"
        className="bottom-nav fixed inset-x-0 bottom-0 z-10 border-t border-[var(--border)] bg-[var(--surface)] md:hidden"
      >
        <div className="flex gap-1 overflow-x-auto px-2 py-2">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={topLinkClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
