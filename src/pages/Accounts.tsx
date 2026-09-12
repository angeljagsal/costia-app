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
import type { Account, AccountType, Currency } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { parseAmount } from '../lib/format';
import { loadBaseCurrency } from '../lib/prefs';

function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

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
  const [opening, setOpening] = useState('');
  const [openingCurrency, setOpeningCurrency] = useState<Currency>('MXN');
  const [openingDate, setOpeningDate] = useState(todayLocal);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const balances = useAccountBalances(householdId);
  const balanceOf = (id: string) => balances.find((b) => b.account_id === id)?.balance ?? 0;
  const isDebt = (a: Account) => a.type === 'credit';
  const assets = accounts.filter((a) => !isDebt(a));
  const debts = accounts.filter(isDebt);
  const assetsTotal = assets.reduce((sum, a) => sum + balanceOf(a.id), 0);
  const debtsTotal = debts.reduce((sum, a) => sum + Math.abs(Math.min(balanceOf(a.id), 0)), 0);
  const netWorth = balances.reduce((sum, b) => sum + (b.balance ?? 0), 0);

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
      await createAccount(db, householdId, name, type, baseCurrency, {
        amount: opening.trim() ? parseAmount(opening) : 0,
        currency: openingCurrency,
        date: openingDate,
      });
      setName('');
      setType('bank');
      setOpening('');
      setOpeningCurrency('MXN');
      setOpeningDate(todayLocal());
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
    <Page title={t('accounts.title')} body={t('accounts.subtitle')}>
      {!householdId ? (
        <p className="hint">{t('tx.waitSync')}</p>
      ) : (
        <>
          <div className="card">
            <p className="hint">{t('accounts.netWorth')}</p>
            <p className="amount text-2xl">{money(locale, netWorth, baseCurrency)}</p>
            <p className="hint">
              {t('accounts.assets')} {money(locale, assetsTotal, baseCurrency)} ·{' '}
              {t('accounts.liabilities')} {money(locale, debtsTotal, baseCurrency)}
            </p>
          </div>

          <form onSubmit={onCreate} className="card flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('accounts.new')}</h2>
            <p className="hint">{t('common.requiredNote')}</p>
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
            <div className="grid grid-cols-2 gap-3">
              <label className="label">
                {type === 'credit' ? t('accounts.openingDebt') : t('accounts.opening')}
                <input
                  className="input"
                  inputMode="decimal"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="label">
                  {t('tx.currency')}
                  <select
                    className="input"
                    value={openingCurrency}
                    onChange={(e) => setOpeningCurrency(e.target.value as Currency)}
                  >
                    <option value="MXN">MX$</option>
                    <option value="USD">US$</option>
                  </select>
                </label>
                <label className="label">
                  {t('tx.date')}
                  <input
                    type="date"
                    className="input"
                    value={openingDate}
                    onChange={(e) => setOpeningDate(e.target.value)}
                  />
                </label>
              </div>
            </div>
            <p className="hint">
              {type === 'credit' ? t('accounts.openingDebtHint') : t('accounts.openingHint')}
            </p>
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
            <>
              {[
                { title: t('accounts.assets'), list: assets, debt: false },
                { title: t('accounts.liabilities'), list: debts, debt: true },
              ].map((group) =>
                group.list.length === 0 ? null : (
                  <section
                    key={group.title}
                    aria-label={group.title}
                    className="flex flex-col gap-2"
                  >
                    <p className="form-section-title">{group.title}</p>
                    <ul className="flex flex-col gap-2">
                      {group.list.map((a) => {
                        const bal = balanceOf(a.id);
                        const shown = group.debt ? Math.abs(Math.min(bal, 0)) : bal;
                        return (
                          <li key={a.id} className="card flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">{a.name}</p>
                              <p className="hint">{accountTypeLabel(t, a.type)}</p>
                            </div>
                            <p
                              className="amount shrink-0 text-lg"
                              style={group.debt ? { color: 'var(--danger)' } : undefined}
                            >
                              {money(locale, shown, baseCurrency)}
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
                        );
                      })}
                    </ul>
                  </section>
                )
              )}
            </>
          )}
        </>
      )}
    </Page>
  );
}
