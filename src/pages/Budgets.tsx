import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePowerSync } from '@powersync/react';
import { Page } from '../components/Page';
import { BudgetBar } from '../components/BudgetBar';
import { budgetBarColor, budgetStateFor } from '../data/budgets';
import {
  createBudget,
  deleteBudget,
  updateBudgetLimit,
  useBudgetSpent,
  useBudgets,
} from '../data/budgets';
import type { BudgetView } from '../data/budgets';
import { categoryName, useCategories } from '../data/categories';
import { useHouseholdId } from '../data/household';
import { getPeriodRange, todayLocal } from '../data/periods';
import type { BudgetPeriod } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { loadBaseCurrency } from '../lib/prefs';

const PERIODS: BudgetPeriod[] = ['weekly', 'monthly', 'yearly'];

function money(locale: string, amount: number, currency: string): string {
  const tag = locale === 'es-MX' ? 'es-MX' : 'en-US';
  try {
    return new Intl.NumberFormat(tag, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function BudgetCard({ budget }: { budget: BudgetView }) {
  const { t, locale } = useI18n();
  const db = usePowerSync();
  const householdId = useHouseholdId();
  const baseCurrency = loadBaseCurrency();

  const [editing, setEditing] = useState(false);
  const [limit, setLimit] = useState(String(budget.limit_amount));
  const [error, setError] = useState<string | null>(null);

  const range = getPeriodRange(budget.period, todayLocal());
  const spent = useBudgetSpent(householdId, budget.category_id, range.from, range.to);
  const ratio = budget.limit_amount > 0 ? spent / budget.limit_amount : 0;
  const state = budgetStateFor(spent, budget.limit_amount);
  const barColor = budgetBarColor(state);

  const showError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg.startsWith('budgets.') ? t(msg) : msg);
  };

  const onSaveLimit = async () => {
    setError(null);
    try {
      await updateBudgetLimit(db, budget.id, Number(limit));
      setEditing(false);
    } catch (e) {
      showError(e);
    }
  };

  const onDelete = async () => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    await deleteBudget(db, budget.id);
  };

  return (
    <li className="card flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{categoryName(t, budget)}</p>
          <p className="hint">
            {t(`budgets.${budget.period}`)} · {t('budgets.spent')}{' '}
            {money(locale, spent, baseCurrency)} /{' '}
            {money(locale, budget.limit_amount, baseCurrency)}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-sm font-semibold"
          style={{
            background: state === 'onTrack' ? 'var(--surface-2)' : undefined,
            color: state === 'onTrack' ? 'var(--text-muted)' : barColor,
          }}
        >
          {t(`budgets.${state}`)}
        </span>
      </div>
      <BudgetBar spent={spent} limit={budget.limit_amount} label={categoryName(t, budget)} />
      <p className="hint">
        {ratio >= 1
          ? `${t('budgets.overBy')} ${money(locale, spent - budget.limit_amount, baseCurrency)}`
          : `${t('budgets.remaining')}: ${money(locale, budget.limit_amount - spent, baseCurrency)}`}
      </p>
      {editing ? (
        <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
          <label className="label">
            {t('budgets.limit')}
            <input
              className="input"
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={onSaveLimit}>
            {t('common.save')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            {t('budgets.limit')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onDelete}
            aria-label={`${t('common.delete')}: ${categoryName(t, budget)}`}
          >
            {t('common.delete')}
          </button>
        </div>
      )}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function Budgets() {
  const { t } = useI18n();
  const db = usePowerSync();
  const householdId = useHouseholdId();
  const budgets = useBudgets(householdId);
  const categories = useCategories('expense', householdId);

  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg.startsWith('budgets.') ? t(msg) : msg);
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!householdId) return;
    setError(null);
    setSaving(true);
    try {
      await createBudget(db, householdId, categoryId, Number(limit), period);
      setCategoryId('');
      setLimit('');
      setPeriod('monthly');
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title={t('budgets.title')} body={t('budgets.subtitle')} placeholder={false}>
      {!householdId ? (
        <p className="hint">{t('tx.waitSync')}</p>
      ) : (
        <>
          <form onSubmit={onCreate} className="card flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('budgets.new')}</h2>
            <p className="hint">{t('common.requiredNote')}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="label">
                {t('budgets.category')}
                <select
                  className="input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">{t('budgets.category')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryName(t, c)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                {t('budgets.limit')}
                <input
                  className="input"
                  inputMode="decimal"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label className="label">
                {t('budgets.period')}
                <select
                  className="input"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
                >
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {t(`budgets.${p}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error ? (
              <p className="error-text" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={saving} className="btn btn-primary self-start">
              {saving ? t('common.saving') : t('budgets.create')}
            </button>
          </form>

          {budgets.length === 0 ? (
            <p className="hint">{t('budgets.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {budgets.map((b) => (
                <BudgetCard key={b.id} budget={b} />
              ))}
            </ul>
          )}
        </>
      )}
    </Page>
  );
}
