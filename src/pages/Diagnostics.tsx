import { useState } from 'react';
import { useQuery, useStatus } from '@powersync/react';
import { Page } from '../components/Page';
import { useAuth } from '../auth/useAuth';
import { useHouseholdId } from '../data/household';
import { useI18n } from '../i18n/useI18n';
import { useSync } from '../sync/useSync';
import { APP_VERSION } from '../lib/version';

function useCount(table: string): number | null {
  const { data } = useQuery<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return data[0]?.n ?? null;
}

/**
 * Troubleshooting screen: everything support needs in one screenshot.
 * Plain technical labels (table/field names) stay in English in both locales;
 * only the title, subtitle, and copy confirmation are translated.
 */
export function Diagnostics() {
  const { t } = useI18n();
  const { session } = useAuth();
  const { online, engine, connected, hasSynced, syncError } = useSync();
  const status = useStatus();
  const householdId = useHouseholdId();
  const [copied, setCopied] = useState(false);

  const counts: Record<string, number | null> = {
    users: useCount('users'),
    households: useCount('households'),
    categories: useCount('categories'),
    accounts: useCount('accounts'),
    transactions: useCount('transactions'),
    budgets: useCount('budgets'),
    recurring_rules: useCount('recurring_rules'),
  };

  const report = {
    appVersion: APP_VERSION,
    online,
    engine,
    connected,
    hasSynced,
    lastSyncedAt: status.lastSyncedAt?.toISOString() ?? null,
    syncError,
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
    householdId,
    counts,
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const row = (label: string, value: string) => (
    <p key={label} className="flex justify-between gap-3 text-sm">
      <span className="hint shrink-0">{label}</span>
      <span className="truncate font-mono text-right">{value}</span>
    </p>
  );

  return (
    <Page title={t('diagnostics.title')} body={t('diagnostics.subtitle')}>
      <div className="card flex flex-col gap-1">
        {row('app', APP_VERSION)}
        {row('online', String(online))}
        {row('engine', engine)}
        {row('connected', String(connected))}
        {row('hasSynced', String(hasSynced))}
        {row('lastSyncedAt', status.lastSyncedAt?.toLocaleString() ?? '—')}
        {row('syncError', syncError ?? '—')}
        {row('userId', session?.user?.id ?? '—')}
        {row('email', session?.user?.email ?? '—')}
        {row('householdId', householdId ?? 'MISSING')}
      </div>
      <div className="card flex flex-col gap-1">
        {Object.entries(counts).map(([table, n]) => row(table, n == null ? '…' : String(n)))}
      </div>
      <button type="button" className="btn btn-secondary self-start" onClick={onCopy}>
        {copied ? t('diagnostics.copied') : t('diagnostics.copy')}
      </button>
    </Page>
  );
}
