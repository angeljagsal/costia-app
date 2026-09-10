import { Link, useParams } from 'react-router';
import { Page } from '../components/Page';
import { useI18n } from '../i18n/useI18n';

export function Transactions() {
  const { t } = useI18n();
  return (
    <Page title={t('pages.transactions.title')} body={t('pages.transactions.body')}>
      <Link
        to="/transactions/new"
        className="inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)]"
      >
        {t('pages.transactionNew.title')}
      </Link>
    </Page>
  );
}

export function TransactionEditor({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useI18n();
  const { id } = useParams();
  return (
    <Page
      title={t(mode === 'new' ? 'pages.transactionNew.title' : 'pages.transactionEdit.title')}
      body={t(mode === 'new' ? 'pages.transactionNew.body' : 'pages.transactionEdit.body')}
    >
      {mode === 'edit' && id ? (
        <p className="font-mono text-xs text-[var(--text-muted)]">id: {id}</p>
      ) : null}
      <Link to="/transactions" className="text-sm underline">
        {t('common.backToDashboard')}
      </Link>
    </Page>
  );
}
