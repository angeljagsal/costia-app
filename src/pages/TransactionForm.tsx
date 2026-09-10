import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { useAccounts } from '../data/accounts';
import { categoryName, useCategories } from '../data/categories';
import { useHouseholdId } from '../data/household';
import { createTag, useTags } from '../data/tags';
import { createTransaction, updateTransaction, useTransaction } from '../data/transactions';
import type { Currency, Kind } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { loadBaseCurrency } from '../lib/prefs';

function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Accepts "1234.56", "1234,56" and "1,234.56". */
function parseAmount(raw: string): number {
  const s = raw.trim().replace(/\s/g, '');
  if (!s) return NaN;
  const normalized = s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s.replace(/,/g, '');
  return Number(normalized);
}

interface SplitRow {
  key: string;
  categoryId: string;
  amount: string;
}

interface Initial {
  kind: Kind;
  amount: string;
  currency: Currency;
  categoryId: string;
  accountId: string;
  date: string;
  note: string;
  splits: SplitRow[];
  tagIds: string[];
}

function toRow(categoryId: string, amount: number): SplitRow {
  return {
    key: crypto.randomUUID(),
    categoryId,
    amount: Number.isFinite(amount) ? String(amount) : ''
  };
}

export function TransactionForm({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useI18n();
  const { id } = useParams();
  const existing = useTransaction(mode === 'edit' ? id : undefined);

  if (mode === 'edit' && !existing.tx) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="page-title">{t('tx.edit')}</h1>
        <p className="hint">{t('tx.waitSync')}</p>
        <Link to="/transactions" className="btn btn-secondary self-start">
          {t('common.cancel')}
        </Link>
      </div>
    );
  }

  const tx = existing.tx;
  const initial: Initial = {
    kind: (tx?.kind as Kind | undefined) ?? 'expense',
    amount: tx ? String(tx.amount) : '',
    currency: (tx?.currency as Currency | undefined) ?? 'MXN',
    categoryId: tx?.category_id ?? '',
    accountId: tx?.account_id ?? '',
    date: tx?.txn_date ?? todayLocal(),
    note: tx?.note ?? '',
    splits: existing.splits.map((s) => toRow(s.category_id, s.amount)),
    tagIds: existing.tagIds
  };
  return <TransactionFormInner key={id ?? 'new'} mode={mode} editId={id} initial={initial} />;
}

function TransactionFormInner({
  mode,
  editId,
  initial
}: {
  mode: 'new' | 'edit';
  editId: string | undefined;
  initial: Initial;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const db = usePowerSync();
  const householdId = useHouseholdId();

  const [kind, setKind] = useState<Kind>(initial.kind);
  const [amount, setAmount] = useState(initial.amount);
  const [currency, setCurrency] = useState<Currency>(initial.currency);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [accountId, setAccountId] = useState(initial.accountId);
  const [date, setDate] = useState(initial.date);
  const [note, setNote] = useState(initial.note);
  const [splits, setSplits] = useState<SplitRow[]>(initial.splits);
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = useCategories(kind);
  const accounts = useAccounts(householdId);
  const tags = useTags(householdId);

  const splitTotal = splits.reduce((sum, s) => {
    const n = parseAmount(s.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const showError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    // Mutations throw i18n keys; anything else is shown raw (should not happen).
    setError(msg.startsWith('tx.') || msg.startsWith('tags.') ? t(msg) : msg);
  };

  const onAddSplit = () =>
    setSplits((rows) => [...rows, { key: crypto.randomUUID(), categoryId: '', amount: '' }]);

  const onAddTag = async () => {
    if (!householdId || !newTag.trim()) return;
    try {
      const id = await createTag(db, householdId, newTag);
      setTagIds((ids) => [...ids, id]);
      setNewTag('');
    } catch (e) {
      showError(e);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!householdId) return;
    setError(null);
    setSaving(true);
    try {
      const input = {
        accountId,
        categoryId,
        amount: parseAmount(amount),
        currency,
        kind,
        txnDate: date,
        note,
        splits: splits.map((s) => ({ categoryId: s.categoryId, amount: parseAmount(s.amount) })),
        tagIds
      };
      if (mode === 'new' || !editId) {
        await createTransaction(db, householdId, loadBaseCurrency(), input);
      } else {
        await updateTransaction(db, editId, loadBaseCurrency(), input);
      }
      navigate('/transactions');
    } catch (err) {
      showError(err);
      setSaving(false);
    }
  };

  if (!householdId) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="page-title">{t(mode === 'new' ? 'tx.new' : 'tx.edit')}</h1>
        <p className="hint">{t('tx.waitSync')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
      <h1 className="page-title">{t(mode === 'new' ? 'tx.new' : 'tx.edit')}</h1>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('tx.kindExpense')}>
        {( ['expense', 'income'] as Kind[] ).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              setCategoryId('');
            }}
            className={`btn ${kind === k ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t(k === 'expense' ? 'tx.kindExpense' : 'tx.kindIncome')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          {t('tx.amount')}
          <input
            className="input"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </label>
        <label className="label">
          {t('tx.currency')}
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="MXN">MXN — MX$</option>
            <option value="USD">USD — US$</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="label">
          {t('tx.category')}
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t('tx.category')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(t, c.key)}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          {t('tx.account')}
          <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">{t('tx.account')}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {accounts.length === 0 ? <p className="hint">{t('tx.errNoAccount')}</p> : null}

      <label className="label">
        {t('tx.date')}
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <label className="label">
        {t('tx.note')}
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('tx.notePlaceholder')}
          maxLength={280}
        />
      </label>

      <fieldset className="card flex flex-col gap-3">
        <legend className="px-1 font-semibold">{t('tx.splits')}</legend>
        <p className="hint">{t('tx.splitsHint')}</p>
        {splits.map((s) => (
          <div key={s.key} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
            <label className="label">
              {t('tx.splitCategory')}
              <select
                className="input"
                value={s.categoryId}
                onChange={(e) =>
                  setSplits((rows) => rows.map((r) => (r.key === s.key ? { ...r, categoryId: e.target.value } : r)))
                }
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryName(t, c.key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              {t('tx.splitAmount')}
              <input
                className="input"
                inputMode="decimal"
                value={s.amount}
                onChange={(e) =>
                  setSplits((rows) => rows.map((r) => (r.key === s.key ? { ...r, amount: e.target.value } : r)))
                }
                placeholder="0.00"
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSplits((rows) => rows.filter((r) => r.key !== s.key))}
              aria-label={t('tx.removeSplit')}
            >
              ×
            </button>
          </div>
        ))}
        {splits.length > 0 ? (
          <p className="hint">
            {t('tx.splitTotal')}: {splitTotal.toFixed(2)}
          </p>
        ) : null}
        <button type="button" className="btn btn-secondary self-start" onClick={onAddSplit}>
          {t('tx.addSplit')}
        </button>
      </fieldset>

      <fieldset className="card flex flex-col gap-3">
        <legend className="px-1 font-semibold">{t('tx.tags')}</legend>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const on = tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={on}
                onClick={() => setTagIds((ids) => (on ? ids.filter((x) => x !== tag.id) : [...ids, tag.id]))}
                className={`btn ${on ? 'btn-primary' : 'btn-secondary'}`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className="input"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder={t('tx.newTag')}
            maxLength={40}
            aria-label={t('tx.newTag')}
          />
          <button type="button" className="btn btn-secondary" onClick={onAddTag} aria-label={t('tx.newTag')}>
            +
          </button>
        </div>
      </fieldset>

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn btn-primary flex-1">
          {saving ? t('common.saving') : t('common.save')}
        </button>
        <Link to="/transactions" className="btn btn-secondary">
          {t('common.cancel')}
        </Link>
      </div>
    </form>
  );
}
