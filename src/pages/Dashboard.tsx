import { Link } from 'react-router';
import { Page } from '../components/Page';
import { useI18n } from '../i18n/useI18n';

const CARDS = [
  { to: '/transactions', key: 'nav.transactions' },
  { to: '/budgets', key: 'nav.budgets' },
  { to: '/recurring', key: 'nav.recurring' },
  { to: '/accounts', key: 'nav.accounts' },
  { to: '/categories', key: 'nav.categories' },
  { to: '/reports', key: 'nav.reports' },
] as const;

export function Dashboard() {
  const { t } = useI18n();
  return (
    <Page title={t('dashboard.title')} body={t('dashboard.welcome')}>
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            {t(c.key)}
          </Link>
        ))}
      </div>
    </Page>
  );
}
