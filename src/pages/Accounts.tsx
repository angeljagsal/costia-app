import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePowerSync } from '@powersync/react';
import { Page } from '../components/Page';
import {
  createAccount,
  deleteAccount,
  accountTypeLabel,
  useAccountBalances,
  useAccounts,
} from '../data/accounts';
import { useHouseholdId } from '../data/household';
import type { AccountType } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { loadBaseCurrency } from '../lib/prefs';

const TYPES: AccountType[] = ['bank', 'cash', 'credit', 'digital_wallet', 'investment'];

function money(locale: string, amount: number, currency: string): string {
  const tag = locale === 'es-MX' ? 'es-MX' : 'en-US';
  try {
    return new Intl.NumberFormat(tag, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function Accounts() {
  const { t, locale } = useI18n();
  const db = usePowerSync();
  const householdId = useHouseholdId();
  const accounts = useAccounts(householdId);
  const baseCurrency = loadBaseCurrency();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const balances = useAccountBalances(householdId);
  const balanceOf = (id: string) => balances.find((b) => b.account_id === id)?.balance ?? 0;
  const total = balances.reduce((sum, b) => sum + (b.balance ?? 0), 0);

  const showError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg.startsWith('accounts.') ? t(msg) : msg);
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!householdId) return;
    setError(null);
    setSaving(true);
    try {
      await createAccount(db, householdId, name, type);
      setName('');
      setType('bank');
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    setError(null);
    try {
      await deleteAccount(db, id);
    } catch (err) {
      showError(err);
    }
  };

  return (
    <Page title={t('accounts.title')} body={t('accounts.subtitle')} placeholder={false}>
      {!householdId ? (
        <p className="hint">{t('tx.waitSync')}</p>
      ) : (
        <>
          <div className="card">
            <p className="hint">{t('accounts.totalBalance')}</p>
            <p className="text-2xl font-bold">{money(locale, total, baseCurrency)}</p>
          </div>

          <form onSubmit={onCreate} className="card flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('accounts.new')}</h2>
            <label className="label">
              {t('accounts.name')}
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('accounts.namePlaceholder')}
                maxLength={80}
              />
            </label>
            <label className="label">
              {t('accounts.type')}
              <select
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
              >
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {accountTypeLabel(t, ty)}
                  </option>
                ))}
              </select>
            </label>
            {error ? (
              <p className="error-text" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={saving} className="btn btn-primary self-start">
              {saving ? t('common.saving') : t('accounts.create')}
            </button>
          </form>

          {accounts.length === 0 ? (
            <p className="hint">{t('accounts.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {accounts.map((a) => (
                <li key={a.id} className="card flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{a.name}</p>
                    <p className="hint">{accountTypeLabel(t, a.type)}</p>
                  </div>
                  <p className="shrink-0 text-lg font-bold">
                    {money(locale, balanceOf(a.id), baseCurrency)}
                  </p>
                  <button
                    type="button"
                    className="btn btn-danger shrink-0"
                    onClick={() => onDelete(a.id)}
                    aria-label={`${t('common.delete')}: ${a.name}`}
                  >
                    {t('common.delete')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Page>
  );
}
