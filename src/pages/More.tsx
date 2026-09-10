import { Link } from 'react-router';
import { Page } from '../components/Page';
import { useI18n } from '../i18n/useI18n';

const LINKS = [
  { to: '/accounts', key: 'nav.accounts', body: 'more.accountsBody' },
  { to: '/categories', key: 'nav.categories', body: 'more.categoriesBody' },
  { to: '/recurring', key: 'nav.recurring', body: 'more.recurringBody' },
  { to: '/settings', key: 'nav.settings', body: 'more.settingsBody' }
] as const;

/** Second-level sections live here so the main nav stays at four items. */
export function More() {
  const { t } = useI18n();
  return (
    <Page title={t('more.title')} body={t('more.subtitle')} placeholder={false}>
      <div className="flex flex-col gap-2">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="card hover:bg-[var(--surface-2)]">
            <p className="text-lg font-semibold">{t(l.key)}</p>
            <p className="hint">{t(l.body)}</p>
          </Link>
        ))}
      </div>
    </Page>
  );
}
