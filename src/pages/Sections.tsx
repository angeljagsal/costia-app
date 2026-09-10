import { Page } from '../components/Page';
import { useI18n } from '../i18n/useI18n';

export function Reports() {
  const { t } = useI18n();
  return <Page title={t('pages.reports.title')} body={t('pages.reports.body')} />;
}
