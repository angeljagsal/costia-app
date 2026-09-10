import { useState } from 'react';
import { Link } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { Page } from '../components/Page';
import { PencilIcon, PlusIcon, SearchIcon } from '../components/icons';
import { useAccounts } from '../data/accounts';
import { categoryName, useCategories } from '../data/categories';
import { useHouseholdId } from '../data/household';
import { useTags } from '../data/tags';
import { deleteTransaction, useTransactions } from '../data/transactions';
import { EMPTY_FILTERS } from '../data/types';
import type { TransactionFilters } from '../data/types';
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

  // Fetch one extra row to know whether more pages exist.
  const rows = useTransactions(householdId, filters, limit + 1, 0);
  const visible = rows.slice(0, limit);
  const hasMore = rows.length > limit;

  const categories = useCategories(undefined, householdId);
  const accounts = useAccounts(householdId);
  const tags = useTags(householdId);
  const baseCurrency = loadBaseCurrency();

  const onDelete = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    await deleteTransaction(db, id);
  };

  return (
    <Page title={t('tx.title')} body={t('tx.subtitle')} placeholder={false}>
      <Link to="/transactions/new" className="btn btn-primary self-start">
        <PlusIcon size={18} />
        {t('tx.new')}
      </Link>

      <div className="card flex flex-col gap-3">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            {t('tx.tags')}
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
              <input
                type="date"
                className="input"
                value={filters.from}
                onChange={(e) => patch({ from: e.target.value })}
              />
            </label>
            <label className="label">
              {t('tx.filterTo')}
              <input
                type="date"
                className="input"
                value={filters.to}
                onChange={(e) => patch({ to: e.target.value })}
              />
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

      {!householdId ? (
        <p className="hint">{t('tx.waitSync')}</p>
      ) : visible.length === 0 ? (
        <p className="hint">{t('common.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((row) => {
            const expense = row.kind === 'expense';
            return (
              <li key={row.id} className="card flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {categoryName(t, { key: row.category_key, label: row.category_label })}
                    <span className="hint font-normal"> · {row.account_name}</span>
                  </p>
                  <p className="hint">
                    {day(locale, row.txn_date)}
                    {row.note ? ` · ${row.note}` : ''}
                  </p>
                  <p className="hint">≈ {money(locale, row.base_amount, baseCurrency)}</p>
                </div>
                <p
                  className="shrink-0 text-lg font-bold"
                  style={{ color: expense ? 'var(--danger)' : 'var(--success)' }}
                >
                  {expense ? '−' : '+'}
                  {money(locale, row.amount, row.currency)}
                </p>
                <div className="flex shrink-0 flex-col gap-1">
                  <Link
                    to={`/transactions/${row.id}/edit`}
                    className="btn btn-secondary"
                    aria-label={t('tx.edit')}
                  >
                    <PencilIcon size={16} />
                    {t('tx.edit')}
                  </Link>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onDelete(row.id)}
                    aria-label={`${t('common.delete')}: ${categoryName(t, { key: row.category_key, label: row.category_label })}`}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
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
