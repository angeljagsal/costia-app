import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { AccountPicker } from '../components/AccountPicker';
import { CategoryGrid } from '../components/CategoryGrid';
import { CalendarIcon } from '../components/icons';
import { useAccountBalances, useAccounts } from '../data/accounts';
import { budgetStateFor, useBudgets } from '../data/budgets';
import type { BudgetView } from '../data/budgets';
import { categoryName, useCategories } from '../data/categories';
import { useHouseholdId } from '../data/household';
import { createTag, useTags } from '../data/tags';
import { createTransaction, updateTransaction, useTransaction } from '../data/transactions';
import type { Currency, Kind } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { useBudgetSpent } from '../data/budgets';
import { getPeriodRange, todayLocal as todayISODate } from '../data/periods';
import { formatMoney, parseAmount } from '../lib/format';
import { getRate } from '../lib/fx';
import { loadBaseCurrency } from '../lib/prefs';

function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
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
  toAccountId: string;
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

/** Soft budget warning for the chosen expense category (never blocks saving). */
function BudgetHintRow({ budget, previewBase }: { budget: BudgetView; previewBase: number }) {
  const { t, locale } = useI18n();
  const householdId = useHouseholdId();
  const baseCurrency = loadBaseCurrency();
  const range = getPeriodRange(budget.period, todayISODate());
  const spent = useBudgetSpent(householdId, budget.category_id, range.from, range.to, baseCurrency);
  const state = budgetStateFor(spent + previewBase, budget.limit_amount);
  if (state === 'onTrack') return null;
  return (
    <p
      className="hint"
      role="status"
      style={{ color: state === 'overLimit' ? 'var(--danger)' : '#e8930c' }}
    >
      {t(`budgets.${state}`)} · {formatMoney(locale, spent + previewBase, baseCurrency)} /{' '}
      {formatMoney(locale, budget.limit_amount, baseCurrency)}
    </p>
  );
}

function BudgetHint({
  categoryId,
  previewBase,
  ready,
}: {
  categoryId: string;
  previewBase: number;
  ready: boolean;
}) {
  const householdId = useHouseholdId();
  const budgets = useBudgets(householdId);
  if (!categoryId || !ready || !(previewBase > 0)) return null;
  const matches = budgets.filter((b) => b.category_id === categoryId);
  if (matches.length === 0) return null;
  return (
    <>
      {matches.map((b) => (
        <BudgetHintRow key={b.id} budget={b} previewBase={previewBase} />
      ))}
    </>
  );
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
  const rawKind = searchParams.get('kind');
  const kindParam: Kind = rawKind === 'income' || rawKind === 'transfer' ? rawKind : 'expense';
  const initial: Initial = {
    kind: (tx?.kind as Kind | undefined) ?? kindParam,
    amount: tx ? String(tx.amount) : '',
    currency: (tx?.currency as Currency | undefined) ?? 'MXN',
    categoryId: tx?.category_id ?? '',
    accountId: tx?.account_id ?? '',
    toAccountId: tx?.to_account_id ?? '',
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
  const [toAccountId, setToAccountId] = useState(initial.toAccountId);
  const [date, setDate] = useState(initial.date);
  const [note, setNote] = useState(initial.note);
  const [splits, setSplits] = useState<SplitRow[]>(initial.splits);
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rateCache, setRateCache] = useState<Record<string, number | null>>({});
  const [fxOverride, setFxOverride] = useState('');

  const isTransfer = kind === 'transfer';
  const rateKey = `${currency}|${baseCurrency}|${date}`;

  useEffect(() => {
    if (currency === baseCurrency || rateCache[rateKey] !== undefined) return;
    let live = true;
    getRate(currency, baseCurrency, date)
      .then((r) => {
        if (live) setRateCache((c) => ({ ...c, [rateKey]: r }));
      })
      .catch(() => {
        if (live) setRateCache((c) => ({ ...c, [rateKey]: null }));
      });
    return () => {
      live = false;
    };
  }, [currency, baseCurrency, date, rateKey, rateCache]);

  const knownRate = currency === baseCurrency ? 1 : rateCache[rateKey];
  const categories = useCategories(isTransfer ? undefined : kind, householdId);
  const accounts = useAccounts(householdId);
  const balances = useAccountBalances(householdId, baseCurrency);
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
      const overrideText = knownRate === null ? fxOverride.trim() : '';
      const override = overrideText ? Number(overrideText.replace(',', '.')) : null;
      if (overrideText && !(override != null && override > 0)) throw new Error('tx.errFxRate');
      const input = {
        accountId,
        toAccountId: isTransfer ? toAccountId : undefined,
        categoryId: isTransfer ? undefined : categoryId,
        amount: parseAmount(amount),
        currency,
        kind,
        txnDate: date,
        note,
        splits: isTransfer
          ? []
          : splits.map((s) => ({ categoryId: s.categoryId, amount: parseAmount(s.amount) })),
        tagIds: isTransfer ? [] : tagIds,
      };
      if (mode === 'new' || !editId) {
        await createTransaction(db, householdId, loadBaseCurrency(), input, override);
      } else {
        await updateTransaction(db, editId, loadBaseCurrency(), input, override);
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
      <p className="hint">{t('common.requiredNote')}</p>

      <section className="card flex flex-col gap-4" aria-label={t('tx.sectionType')}>
        <h2 className="text-lg font-semibold">{t('tx.sectionType')}</h2>
        <div className="segmented segmented-3" role="group" aria-label={t('tx.sectionType')}>
          {(['expense', 'income', 'transfer'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setCategoryId('');
                setError(null);
              }}
            >
              {k === 'expense'
                ? `− ${t('tx.kindExpense')}`
                : k === 'income'
                  ? `+ ${t('tx.kindIncome')}`
                  : `⇄ ${t('tx.kindTransfer')}`}
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
          <span aria-hidden="true" className="hero-divider" />
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
        {currency === baseCurrency ? null : knownRate === undefined ? (
          <p className="hint" aria-live="polite">
            {t('common.loading')}
          </p>
        ) : knownRate !== null ? (
          <p className="hint" aria-live="polite">
            1 {currency} = {knownRate} {baseCurrency}
          </p>
        ) : (
          <label className="label">
            {t('tx.fxManual')}
            <input
              className="input"
              inputMode="decimal"
              value={fxOverride}
              onChange={(e) => setFxOverride(e.target.value)}
              placeholder="0.00"
            />
            <span className="hint">{t('tx.fxManualHint')}</span>
          </label>
        )}
      </section>

      {isTransfer ? null : (
        <section className="card flex flex-col gap-2" aria-label={t('tx.category')}>
          <CategoryGrid
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            label={t('tx.category')}
          />
          {kind === 'expense' ? (
            <BudgetHint
              categoryId={categoryId}
              previewBase={knownRate == null ? 0 : preview * knownRate}
              ready={knownRate != null}
            />
          ) : null}
        </section>
      )}

      {accounts.length === 0 ? (
        <p className="hint">{t('tx.errNoAccount')}</p>
      ) : isTransfer ? (
        <>
          <section className="card" aria-label={t('tx.fromAccount')}>
            <AccountPicker
              accounts={accounts}
              balanceOf={balanceOf}
              baseCurrency={baseCurrency}
              value={accountId}
              onChange={setAccountId}
              label={t('tx.fromAccount')}
            />
          </section>
          <section className="card" aria-label={t('tx.toAccount')}>
            <AccountPicker
              accounts={accounts.filter((a) => a.id !== accountId)}
              balanceOf={balanceOf}
              baseCurrency={baseCurrency}
              value={toAccountId}
              onChange={setToAccountId}
              label={t('tx.toAccount')}
            />
          </section>
        </>
      ) : (
        <section className="card" aria-label={t('tx.account')}>
          <AccountPicker
            accounts={accounts}
            balanceOf={balanceOf}
            baseCurrency={baseCurrency}
            value={accountId}
            onChange={setAccountId}
            label={t('tx.account')}
          />
        </section>
      )}

      <section className="card flex flex-col gap-3" aria-label={t('tx.sectionDetails')}>
        <h2 className="text-lg font-semibold">{t('tx.sectionDetails')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="label">
            {t('tx.date')}
            <span className="date-wrap">
              <CalendarIcon size={18} />
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </span>
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
      </section>

      {isTransfer ? null : (
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
                        rows.map((r) =>
                          r.key === s.key ? { ...r, categoryId: e.target.value } : r
                        )
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
                  {t('common.remove')}
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
          </div>
        </details>
      )}

      {isTransfer ? null : (
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
                {t('common.add')}
              </button>
            </div>
          </div>
        </details>
      )}

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-cta">
        <div className="mx-auto flex w-full max-w-xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="hint">{t('tx.amount')}</p>
            <p
              className="amount truncate text-xl"
              style={{
                color:
                  kind === 'expense'
                    ? 'var(--danger)'
                    : kind === 'income'
                      ? 'var(--success)'
                      : 'var(--text)',
              }}
            >
              {kind === 'expense' ? '−' : kind === 'income' ? '+' : '⇄'}
              {formatMoney(locale, preview, currency)}
            </p>
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <Link to="/transactions" className="btn btn-secondary flex-1">
            {t('common.cancel')}
          </Link>
        </div>
      </div>
    </form>
  );
}
