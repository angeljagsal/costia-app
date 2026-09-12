import { Link } from 'react-router';
import { Page } from '../components/Page';
import {
  BankIcon,
  ChevronRightIcon,
  GearIcon,
  RepeatIcon,
  SearchIcon,
  TagIcon,
} from '../components/icons';
import { useI18n } from '../i18n/useI18n';

const LINKS = [
  { to: '/accounts', key: 'nav.accounts', body: 'more.accountsBody', icon: BankIcon },
  { to: '/categories', key: 'nav.categories', body: 'more.categoriesBody', icon: TagIcon },
  { to: '/recurring', key: 'nav.recurring', body: 'more.recurringBody', icon: RepeatIcon },
  { to: '/settings', key: 'nav.settings', body: 'more.settingsBody', icon: GearIcon },
  { to: '/diagnostics', key: 'diagnostics.title', body: 'diagnostics.subtitle', icon: SearchIcon },
] as const;

/** Second-level sections live here so the main nav stays at four items. */
export function More() {
  const { t } = useI18n();
  return (
    <Page title={t('more.title')} body={t('more.subtitle')}>
      <div className="flex flex-col gap-2">
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              className="card flex items-center gap-3 hover:bg-[var(--surface-2)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <Icon size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">{t(l.key)}</span>
                <span className="hint block">{t(l.body)}</span>
              </span>
              <ChevronRightIcon size={20} />
            </Link>
          );
        })}
      </div>
    </Page>
  );
}
