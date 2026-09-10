import { Page } from '../components/Page';
import { useI18n } from '../i18n/useI18n';

export function Budgets() {
  const { t } = useI18n();
  return <Page title={t('pages.budgets.title')} body={t('pages.budgets.body')} />;
}

export function Recurring() {
  const { t } = useI18n();
  return <Page title={t('pages.recurring.title')} body={t('pages.recurring.body')} />;
}

export function Reports() {
  const { t } = useI18n();
  return <Page title={t('pages.reports.title')} body={t('pages.reports.body')} />;
}
