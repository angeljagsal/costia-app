import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { AccountPicker } from '../components/AccountPicker';
import { CategoryGrid } from '../components/CategoryGrid';
import { CheckIcon, PlusIcon, XIcon } from '../components/icons';
import { useAccountBalances, useAccounts } from '../data/accounts';
import { categoryName, useCategories } from '../data/categories';
import { useHouseholdId } from '../data/household';
import { createTag, useTags } from '../data/tags';
import { createTransaction, updateTransaction, useTransaction } from '../data/transactions';
import type { Currency, Kind } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { formatMoney } from '../lib/format';
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
  const normalized =
    s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s.replace(/,/g, '');
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
    amount: Number.isFinite(amount) ? String(amount) : '',
  };
}

export function TransactionForm({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useI18n();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
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
  // Dashboard quick actions link here with ?kind=income to pre-select it.
  const kindParam = searchParams.get('kind') === 'income' ? 'income' : 'expense';
  const initial: Initial = {
    kind: (tx?.kind as Kind | undefined) ?? kindParam,
    amount: tx ? String(tx.amount) : '',
    currency: (tx?.currency as Currency | undefined) ?? 'MXN',
    categoryId: tx?.category_id ?? '',
    accountId: tx?.account_id ?? '',
    date: tx?.txn_date ?? todayLocal(),
    note: tx?.note ?? '',
    splits: existing.splits.map((s) => toRow(s.category_id, s.amount)),
    tagIds: existing.tagIds,
  };
  return <TransactionFormInner key={id ?? 'new'} mode={mode} editId={id} initial={initial} />;
}

function TransactionFormInner({
  mode,
  editId,
  initial,
}: {
  mode: 'new' | 'edit';
  editId: string | undefined;
  initial: Initial;
}) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const db = usePowerSync();
  const householdId = useHouseholdId();
  const baseCurrency = loadBaseCurrency();

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

  const categories = useCategories(kind, householdId);
  const accounts = useAccounts(householdId);
  const balances = useAccountBalances(householdId);
  const tags = useTags(householdId);
  const balanceOf = (id: string) => balances.find((b) => b.account_id === id)?.balance ?? 0;

  const parsed = parseAmount(amount);
  const preview = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

  const splitTotal = splits.reduce((sum, s) => {
    const n = parseAmount(s.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const showError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
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
        tagIds,
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
    <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <h1 className="page-title">{t(mode === 'new' ? 'tx.new' : 'tx.edit')}</h1>

      <div className="segmented" role="group" aria-label={t('tx.kindExpense')}>
        {(['expense', 'income'] as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              setCategoryId('');
            }}
          >
            {k === 'expense' ? `− ${t('tx.kindExpense')}` : `+ ${t('tx.kindIncome')}`}
          </button>
        ))}
      </div>

      <div className="amount-hero">
        <input
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          aria-label={t('tx.amount')}
        />
        <div className="currency-chips" role="group" aria-label={t('tx.currency')}>
          {(['MXN', 'USD'] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={currency === c}
              onClick={() => setCurrency(c)}
            >
              {c === 'MXN' ? 'MX$' : 'US$'}
            </button>
          ))}
        </div>
      </div>

      <CategoryGrid
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        label={t('tx.category')}
      />

      {accounts.length === 0 ? (
        <p className="hint">{t('tx.errNoAccount')}</p>
      ) : (
        <AccountPicker
          accounts={accounts}
          balanceOf={balanceOf}
          baseCurrency={baseCurrency}
          value={accountId}
          onChange={setAccountId}
          label={t('tx.account')}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          {t('tx.date')}
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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
      </div>

      <details className="advanced">
        <summary>{t('tx.splits')}</summary>
        <div className="advanced-body">
          <p className="hint">{t('tx.splitsHint')}</p>
          {splits.map((s) => (
            <div key={s.key} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
              <label className="label">
                {t('tx.splitCategory')}
                <select
                  className="input"
                  value={s.categoryId}
                  onChange={(e) =>
                    setSplits((rows) =>
                      rows.map((r) => (r.key === s.key ? { ...r, categoryId: e.target.value } : r))
                    )
                  }
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryName(t, c)}
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
                    setSplits((rows) =>
                      rows.map((r) => (r.key === s.key ? { ...r, amount: e.target.value } : r))
                    )
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
                <XIcon size={18} />
              </button>
            </div>
          ))}
          {splits.length > 0 ? (
            <p className="hint">
              {t('tx.splitTotal')}: {splitTotal.toFixed(2)}
            </p>
          ) : null}
          <button type="button" className="btn btn-secondary self-start" onClick={onAddSplit}>
            <PlusIcon size={18} />
            {t('tx.addSplit')}
          </button>
        </div>
      </details>

      <details className="advanced">
        <summary>{t('tx.tags')}</summary>
        <div className="advanced-body">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const on = tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setTagIds((ids) => (on ? ids.filter((x) => x !== tag.id) : [...ids, tag.id]))
                  }
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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onAddTag}
              aria-label={t('tx.newTag')}
            >
              <PlusIcon size={18} />
            </button>
          </div>
        </div>
      </details>

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-cta">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          <div className="min-w-0">
            <p className="hint">{t('tx.amount')}</p>
            <p
              className="amount truncate text-2xl"
              style={{ color: kind === 'expense' ? 'var(--danger)' : 'var(--success)' }}
            >
              {kind === 'expense' ? '−' : '+'}
              {formatMoney(locale, preview, currency)}
            </p>
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">
            {saving ? (
              t('common.saving')
            ) : (
              <>
                <CheckIcon size={18} />
                {t('common.save')}
              </>
            )}
          </button>
        </div>
      </div>

      <Link to="/transactions" className="btn btn-secondary self-center">
        {t('common.cancel')}
      </Link>
    </form>
  );
}
