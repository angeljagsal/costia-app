import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { Page } from '../components/Page';
import { CalendarIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/icons';
import { avatarColor, initialOf } from '../lib/avatar';
import { useAccounts } from '../data/accounts';
import { categoryName, useCategories } from '../data/categories';
import { useHouseholdId } from '../data/household';
import { addDaysISO, todayLocal } from '../data/periods';
import { useTags } from '../data/tags';
import { deleteTransaction, useTransactions } from '../data/transactions';
import { EMPTY_FILTERS } from '../data/types';
import type { TransactionFilters, TransactionView } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { loadBaseCurrency } from '../lib/prefs';

const PAGE_SIZE = 50;

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

export function Transactions() {
  const { t, locale } = useI18n();
  const db = usePowerSync();
  const householdId = useHouseholdId();
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const patch = (p: Partial<TransactionFilters>) => {
    setFilters((f) => ({ ...f, ...p }));
    setLimit(PAGE_SIZE);
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [
    filters.search.trim(),
    filters.kind,
    filters.categoryId,
    filters.accountId,
    filters.tagId,
    filters.from,
    filters.to,
    filters.sort === 'newest' ? '' : filters.sort,
  ].filter(Boolean).length;

  const baseCurrency = loadBaseCurrency();

  // Fetch one extra row to know whether more pages exist.
  const rows = useTransactions(householdId, filters, limit + 1, 0, baseCurrency);
  const visible = rows.slice(0, limit);
  const hasMore = rows.length > limit;

  const categories = useCategories(undefined, householdId);
  const accounts = useAccounts(householdId);
  const tags = useTags(householdId);

  const onDelete = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    await deleteTransaction(db, id);
  };

  // Bank-statement grouping, newest day first (rows already arrive sorted).
  const groups = useMemo(() => {
    const byDay = new Map<string, TransactionView[]>();
    for (const row of visible) {
      const list = byDay.get(row.txn_date);
      if (list) list.push(row);
      else byDay.set(row.txn_date, [row]);
    }
    return [...byDay.entries()];
  }, [visible]);

  const today = todayLocal();
  const yesterday = addDaysISO(today, -1);
  const groupLabel = (iso: string) =>
    iso === today ? t('tx.today') : iso === yesterday ? t('tx.yesterday') : day(locale, iso);

  return (
    <Page title={t('tx.title')} body={t('tx.subtitle')}>
      <Link to="/transactions/new" className="btn btn-primary self-start">
        <PlusIcon size={18} />
        {t('tx.new')}
      </Link>

      <details
        className="advanced"
        open={filtersOpen}
        onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
      >
        <summary>
          <span className="flex items-center gap-2 text-base font-bold">
            {t('tx.filters')}
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--accent-strong)]">
                {activeFilterCount}
              </span>
            ) : null}
          </span>
        </summary>
        <div className="advanced-body">
          <div className="search-wrap">
            <SearchIcon size={18} />
            <input
              className="input"
              value={filters.search}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder={t('tx.searchPlaceholder')}
              aria-label={t('common.search')}
              type="search"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="label">
              {t('tx.filterKind')}
              <select
                className="input"
                value={filters.kind}
                onChange={(e) => patch({ kind: e.target.value as TransactionFilters['kind'] })}
              >
                <option value="">{t('common.all')}</option>
                <option value="expense">{t('tx.kindExpense')}</option>
                <option value="income">{t('tx.kindIncome')}</option>
                <option value="transfer">{t('tx.kindTransfer')}</option>
              </select>
            </label>
            <label className="label">
              {t('tx.filterSort')}
              <select
                className="input"
                value={filters.sort}
                onChange={(e) => patch({ sort: e.target.value as TransactionFilters['sort'] })}
              >
                <option value="newest">{t('tx.sortNewest')}</option>
                <option value="oldest">{t('tx.sortOldest')}</option>
                <option value="amount">{t('tx.sortAmount')}</option>
              </select>
            </label>
            <label className="label">
              {t('tx.filterCategory')}
              <select
                className="input"
                value={filters.categoryId}
                onChange={(e) => patch({ categoryId: e.target.value })}
              >
                <option value="">{t('common.all')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryName(t, c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              {t('tx.filterAccount')}
              <select
                className="input"
                value={filters.accountId}
                onChange={(e) => patch({ accountId: e.target.value })}
              >
                <option value="">{t('common.all')}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              {t('tx.tags')}{' '}
              <select
                className="input"
                value={filters.tagId}
                onChange={(e) => patch({ tagId: e.target.value })}
              >
                <option value="">{t('common.all')}</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="label">
                {t('tx.filterFrom')}
                <span className="date-wrap">
                  <CalendarIcon size={18} />
                  <input
                    type="date"
                    className="input"
                    value={filters.from}
                    onChange={(e) => patch({ from: e.target.value })}
                  />
                </span>
              </label>
              <label className="label">
                {t('tx.filterTo')}
                <span className="date-wrap">
                  <CalendarIcon size={18} />
                  <input
                    type="date"
                    className="input"
                    value={filters.to}
                    onChange={(e) => patch({ to: e.target.value })}
                  />
                </span>
              </label>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary self-start"
            onClick={() => patch({ ...EMPTY_FILTERS })}
          >
            {t('common.clear')}
          </button>
        </div>
      </details>

      {!householdId ? (
        <p className="hint">{t('tx.waitSync')}</p>
      ) : visible.length === 0 ? (
        <p className="hint">{t('common.empty')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(([date, items]) => (
            <section key={date} aria-label={groupLabel(date)} className="flex flex-col gap-2">
              <p className="form-section-title">{groupLabel(date)}</p>
              <ul className="flex flex-col gap-2">
                {items.map((row) => {
                  const isTransfer = row.kind === 'transfer';
                  const expense = row.kind === 'expense';
                  const name = isTransfer
                    ? t('tx.transferTitle')
                    : categoryName(t, {
                        key: row.category_key,
                        label: row.category_label,
                      });
                  const sub = isTransfer
                    ? `${row.account_name} → ${row.to_account_name ?? ''}${row.note ? ` · ${row.note}` : ''}`
                    : `${row.account_name}${row.note ? ` · ${row.note}` : ''}`;
                  return (
                    <li key={row.id} className="card card-compact flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="avatar avatar-sm"
                        style={{
                          background: isTransfer
                            ? 'var(--text-muted)'
                            : avatarColor(row.category_key ?? row.category_label ?? row.id),
                        }}
                      >
                        {isTransfer ? '⇄' : initialOf(name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.9375rem] font-semibold">{name}</p>
                        <p className="hint truncate">{sub}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <div className="text-right">
                          <p
                            className="amount text-base"
                            style={{
                              color: isTransfer
                                ? 'var(--text)'
                                : expense
                                  ? 'var(--danger)'
                                  : 'var(--success)',
                            }}
                          >
                            {isTransfer ? '⇄' : expense ? '−' : '+'}
                            {money(locale, row.amount, row.currency)}
                          </p>
                          {row.currency !== baseCurrency ? (
                            <p className="hint">
                              ≈ {money(locale, row.display_amount, baseCurrency)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex gap-1.5">
                          <Link
                            to={`/transactions/${row.id}/edit`}
                            className="btn btn-secondary btn-square"
                            aria-label={`${t('tx.edit')}: ${name}`}
                          >
                            <PencilIcon size={18} />
                          </Link>
                          <button
                            type="button"
                            className="btn btn-danger btn-square"
                            onClick={() => onDelete(row.id)}
                            aria-label={`${t('common.delete')}: ${name}`}
                          >
                            <TrashIcon size={18} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {hasMore ? (
        <button
          type="button"
          className="btn btn-secondary self-center"
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
        >
          {t('common.loadMore')}
        </button>
      ) : null}
    </Page>
  );
}
