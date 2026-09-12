import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePowerSync } from '@powersync/react';
import { Page } from '../components/Page';
import { UpcomingBills } from '../components/UpcomingBills';
import { useAccounts } from '../data/accounts';
import { categoryName, useCategories } from '../data/categories';
import { useHouseholdId } from '../data/household';
import { todayLocal } from '../data/periods';
import {
  createRecurring,
  deleteRecurring,
  setRecurringActive,
  updateRecurring,
  useRecurring,
} from '../data/recurring';
import type { RecurringInput, RecurringView } from '../data/recurring';
import type { BudgetPeriod, Currency } from '../data/types';
import { useI18n } from '../i18n/useI18n';

const CADENCES: BudgetPeriod[] = ['weekly', 'monthly', 'yearly'];

function money(locale: string, amount: number, currency: string): string {
  const tag = locale === 'es-MX' ? 'es-MX' : 'en-US';
  try {
    return new Intl.NumberFormat(tag, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function day(locale: string, iso: string): string {
  const tag = locale === 'es-MX' ? 'es-MX' : 'en-US';
  try {
    return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(`${iso}T00:00:00`)
    );
  } catch {
    return iso;
  }
}

const EMPTY_FORM = {
  accountId: '',
  categoryId: '',
  amount: '',
  currency: 'MXN' as Currency,
  cadence: 'monthly' as BudgetPeriod,
  nextDue: todayLocal(),
  note: '',
};

export function Recurring() {
  const { t, locale } = useI18n();
  const db = usePowerSync();
  const householdId = useHouseholdId();
  const rules = useRecurring(householdId);
  const accounts = useAccounts(householdId);
  const categories = useCategories(undefined, householdId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch }));

  const showError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg.startsWith('recurring.') ? t(msg) : msg);
  };

  const toInput = (): RecurringInput => ({
    accountId: form.accountId,
    categoryId: form.categoryId,
    amount: Number(form.amount),
    currency: form.currency,
    cadence: form.cadence,
    nextDue: form.nextDue,
    note: form.note,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!householdId) return;
    setError(null);
    setSaving(true);
    try {
      if (editingId) {
        await updateRecurring(db, editingId, toInput());
        setEditingId(null);
      } else {
        await createRecurring(db, householdId, toInput());
      }
      setForm({ ...EMPTY_FORM, nextDue: todayLocal() });
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (r: RecurringView) => {
    setEditingId(r.id);
    setForm({
      accountId: r.account_id,
      categoryId: r.category_id,
      amount: String(r.amount),
      currency: r.currency as Currency,
      cadence: r.cadence,
      nextDue: r.next_due,
      note: r.note ?? '',
    });
    setError(null);
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    await deleteRecurring(db, id);
  };

  return (
    <Page title={t('recurring.title')} body={t('recurring.subtitle')} placeholder={false}>
      {!householdId ? (
        <p className="hint">{t('tx.waitSync')}</p>
      ) : (
        <>
          <UpcomingBills />

          <form onSubmit={onSubmit} className="card flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('recurring.new')}</h2>
            <p className="hint">{t('common.requiredNote')}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="label">
                {t('recurring.account')}
                <select
                  className="input"
                  value={form.accountId}
                  onChange={(e) => set({ accountId: e.target.value })}
                >
                  <option value="">{t('recurring.account')}</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                {t('recurring.category')}
                <select
                  className="input"
                  value={form.categoryId}
                  onChange={(e) => set({ categoryId: e.target.value })}
                >
                  <option value="">{t('recurring.category')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryName(t, c)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                {t('recurring.amount')}
                <input
                  className="input"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => set({ amount: e.target.value })}
                  placeholder="0.00"
                />
              </label>
              <label className="label">
                {t('recurring.currency')}
                <select
                  className="input"
                  value={form.currency}
                  onChange={(e) => set({ currency: e.target.value as Currency })}
                >
                  <option value="MXN">MXN — MX$</option>
                  <option value="USD">USD — US$</option>
                </select>
              </label>
              <div className="flex flex-col gap-2">
                <p className="form-section-title">{t('recurring.cadence')}</p>
                <div
                  className="segmented segmented-3"
                  role="group"
                  aria-label={t('recurring.cadence')}
                >
                  {CADENCES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={form.cadence === c}
                      onClick={() => set({ cadence: c })}
                    >
                      {t(`recurring.${c}`)}
                    </button>
                  ))}
                </div>
              </div>
              <label className="label">
                {t('recurring.nextDue')}
                <input
                  type="date"
                  className="input"
                  value={form.nextDue}
                  onChange={(e) => set({ nextDue: e.target.value })}
                />
              </label>
            </div>
            <label className="label">
              {t('recurring.note')}
              <input
                className="input"
                value={form.note}
                onChange={(e) => set({ note: e.target.value })}
                maxLength={280}
              />
            </label>
            {error ? (
              <p className="error-text" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? t('common.saving') : editingId ? t('common.save') : t('recurring.create')}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...EMPTY_FORM, nextDue: todayLocal() });
                  }}
                >
                  {t('common.cancel')}
                </button>
              ) : null}
            </div>
          </form>

          {rules.length === 0 ? (
            <p className="hint">{t('recurring.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rules.map((r) => (
                <li key={r.id} className="card flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {categoryName(t, r)}
                      {r.is_active ? null : (
                        <span className="hint"> · {t('recurring.paused')}</span>
                      )}
                    </p>
                    <p className="hint">
                      {t(`recurring.${r.cadence}`)} · {t('recurring.dueOn')}{' '}
                      {day(locale, r.next_due)} · {r.account_name}
                      {r.note ? ` · ${r.note}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-bold">
                    {money(locale, r.amount, r.currency)}
                  </p>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setRecurringActive(db, r.id, !r.is_active)}
                    >
                      {r.is_active ? t('recurring.pause') : t('recurring.resume')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => onEdit(r)}>
                      {t('tx.edit')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => onDelete(r.id)}
                      aria-label={`${t('common.delete')}: ${categoryName(t, r)}`}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Page>
  );
}
