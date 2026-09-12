import { Link } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BudgetProgressRow } from '../components/BudgetProgress';
import { ChevronRightIcon, MinusIcon, PlusIcon } from '../components/icons';
import { UpcomingBills } from '../components/UpcomingBills';
import { accountTypeLabel, useAccountBalances, useAccounts } from '../data/accounts';
import { useBudgets } from '../data/budgets';
import { categoryName } from '../data/categories';
import { useHouseholdId } from '../data/household';
import {
  getPeriodRange,
  monthEnd,
  monthRange,
  monthStart,
  shiftMonth,
  todayLocal,
} from '../data/periods';
import { useBalanceHistory, useCategoryTotals, useMonthlyFlow } from '../data/reports';
import { useTransactions } from '../data/transactions';
import { EMPTY_FILTERS } from '../data/types';
import { useI18n } from '../i18n/useI18n';
import { formatDay, formatMoney, formatMonthLabel } from '../lib/format';
import { loadBaseCurrency } from '../lib/prefs';

const PIE_COLORS = [
  '#1f75cb',
  '#108548',
  '#e8930c',
  '#d02a0e',
  '#6e49cb',
  '#0098a1',
  '#c0349e',
  '#7a7a7a',
];
const INCOME_COLOR = '#108548';
const EXPENSE_COLOR = '#1f75cb';
const BALANCE_COLOR = '#6e49cb';

const tooltipStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
};

function Hero() {
  const { t, locale } = useI18n();
  const householdId = useHouseholdId();
  const baseCurrency = loadBaseCurrency();
  const accounts = useAccounts(householdId);
  const balances = useAccountBalances(householdId);
  const balanceOf = (id: string) => balances.find((b) => b.account_id === id)?.balance ?? 0;
  const netWorth = balances.reduce((sum, b) => sum + (b.balance ?? 0), 0);
  const assetsTotal = accounts
    .filter((a) => a.type !== 'credit')
    .reduce((sum, a) => sum + balanceOf(a.id), 0);
  const debtsTotal = accounts
    .filter((a) => a.type === 'credit')
    .reduce((sum, a) => sum + Math.abs(Math.min(balanceOf(a.id), 0)), 0);

  const today = todayLocal();
  const month = today.slice(0, 7);
  const flow = useMonthlyFlow(householdId, monthStart(month), monthEnd(month));
  const monthIncome = flow.reduce((s, f) => s + (f.income ?? 0), 0);
  const monthExpenses = flow.reduce((s, f) => s + (f.expenses ?? 0), 0);

  return (
    <section className="hero flex flex-col gap-4" aria-label={t('accounts.netWorth')}>
      <div>
        <p className="hint">{t('accounts.netWorth')}</p>
        <p className="amount text-4xl">{formatMoney(locale, netWorth, baseCurrency)}</p>
        <p className="hint">
          {t('accounts.assets')} {formatMoney(locale, assetsTotal, baseCurrency)} ·{' '}
          {t('accounts.liabilities')} {formatMoney(locale, debtsTotal, baseCurrency)}
        </p>
        <p className="hint">
          {t('dashboard.thisMonth')}:{' '}
          <span className="amount">+{formatMoney(locale, monthIncome, baseCurrency)}</span> ·{' '}
          <span className="amount">−{formatMoney(locale, monthExpenses, baseCurrency)}</span>
        </p>
      </div>
      <div className="flex gap-2">
        <Link to="/transactions/new?kind=expense" className="hero-action hero-action-primary">
          <MinusIcon size={20} />
          {t('dashboard.newExpense')}
        </Link>
        <Link to="/transactions/new?kind=income" className="hero-action hero-action-secondary">
          <PlusIcon size={20} />
          {t('dashboard.newIncome')}
        </Link>
      </div>
    </section>
  );
}

function BudgetOverview() {
  const { t } = useI18n();
  const householdId = useHouseholdId();
  const budgets = useBudgets(householdId);
  return (
    <section
      className="card flex min-w-0 flex-col gap-3"
      aria-label={t('dashboard.budgetOverview')}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('dashboard.budgetOverview')}</h2>
        <Link
          to="/budgets"
          className="inline-flex items-center gap-1 text-sm font-medium underline"
        >
          {t('dashboard.viewAll')}
          <ChevronRightIcon size={16} />
        </Link>
      </div>
      {budgets.length === 0 ? (
        <p className="hint">{t('budgets.empty')}</p>
      ) : (
        budgets.map((b) => <BudgetProgressRow key={b.id} budget={b} />)
      )}
    </section>
  );
}

function RecentTransactions() {
  const { t, locale } = useI18n();
  const householdId = useHouseholdId();
  const rows = useTransactions(householdId, EMPTY_FILTERS, 10, 0);
  return (
    <section className="card flex min-w-0 flex-col gap-2" aria-label={t('dashboard.recentTx')}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('dashboard.recentTx')}</h2>
        <Link
          to="/transactions"
          className="inline-flex items-center gap-1 text-sm font-medium underline"
        >
          {t('dashboard.viewAll')}
          <ChevronRightIcon size={16} />
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="hint">{t('common.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const isTransfer = r.kind === 'transfer';
            const expense = r.kind === 'expense';
            const title = isTransfer
              ? `${t('tx.transferTitle')}: ${r.account_name} → ${r.to_account_name ?? ''}`
              : categoryName(t, r);
            return (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{title}</p>
                  <p className="hint">{formatDay(locale, r.txn_date)}</p>
                </div>
                <p
                  className="amount shrink-0"
                  style={{
                    color: isTransfer
                      ? 'var(--text)'
                      : expense
                        ? 'var(--danger)'
                        : 'var(--success)',
                  }}
                >
                  {isTransfer ? '⇄' : expense ? '−' : '+'}
                  {formatMoney(locale, r.amount, r.currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CategoryBreakdown() {
  const { t, locale } = useI18n();
  const householdId = useHouseholdId();
  const baseCurrency = loadBaseCurrency();
  const today = todayLocal();
  const range = getPeriodRange('monthly', today);
  const totals = useCategoryTotals(householdId, 'expense', range.from, range.to);
  const data = totals.map((row, i) => ({
    name: categoryName(t, row),
    value: row.total,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));
  return (
    <section
      className="card flex min-w-0 flex-col gap-2"
      aria-label={t('dashboard.categoryBreakdown')}
    >
      <h2 className="text-lg font-semibold">{t('dashboard.categoryBreakdown')}</h2>
      {data.length === 0 ? (
        <p className="hint">{t('dashboard.noData')}</p>
      ) : (
        <>
          <div className="h-48 text-[var(--text)]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatMoney(locale, Number(value ?? 0), baseCurrency)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            {data.map((d) => (
              <li key={d.name} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ background: d.fill }}
                />
                <span className="flex-1 truncate">{d.name}</span>
                <span className="amount">{formatMoney(locale, d.value, baseCurrency)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function IncomeVsExpenses() {
  const { t, locale } = useI18n();
  const householdId = useHouseholdId();
  const baseCurrency = loadBaseCurrency();
  const endMonth = todayLocal().slice(0, 7);
  const startMonth = shiftMonth(endMonth, -5);
  const flow = useMonthlyFlow(householdId, monthStart(startMonth), monthEnd(endMonth));
  const byMonth = new Map(flow.map((f) => [f.month, f]));
  const data = monthRange(startMonth, endMonth).map((m) => ({
    month: formatMonthLabel(locale, m),
    [t('reports.income')]: byMonth.get(m)?.income ?? 0,
    [t('reports.expenses')]: byMonth.get(m)?.expenses ?? 0,
  }));
  const hasAny = flow.some((f) => (f.income ?? 0) > 0 || (f.expenses ?? 0) > 0);
  return (
    <section className="card flex min-w-0 flex-col gap-2" aria-label={t('dashboard.trend')}>
      <h2 className="text-lg font-semibold">{t('dashboard.trend')}</h2>
      {!householdId || !hasAny ? (
        <p className="hint">{t('dashboard.noData')}</p>
      ) : (
        <div className="h-52 text-[var(--text-muted)]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#999" strokeOpacity={0.4} />
              <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
              <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} width={48} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => formatMoney(locale, Number(value ?? 0), baseCurrency)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey={t('reports.income')} fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey={t('reports.expenses')} fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function BalanceHistory() {
  const { t, locale } = useI18n();
  const householdId = useHouseholdId();
  const baseCurrency = loadBaseCurrency();
  const endMonth = todayLocal().slice(0, 7);
  const startMonth = shiftMonth(endMonth, -5);
  const history = useBalanceHistory(householdId, startMonth, endMonth);
  const data = history.map((p) => ({
    month: formatMonthLabel(locale, p.month),
    [t('dashboard.balanceHistory')]: Math.round(p.balance * 100) / 100,
  }));
  return (
    <section
      className="card flex min-w-0 flex-col gap-2"
      aria-label={t('dashboard.balanceHistory')}
    >
      <h2 className="text-lg font-semibold">{t('dashboard.balanceHistory')}</h2>
      {data.length === 0 ? (
        <p className="hint">{t('dashboard.noData')}</p>
      ) : (
        <div className="h-52 text-[var(--text-muted)]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#999" strokeOpacity={0.4} />
              <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
              <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} width={48} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => formatMoney(locale, Number(value ?? 0), baseCurrency)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey={t('dashboard.balanceHistory')}
                stroke={BALANCE_COLOR}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function Balances() {
  const { t, locale } = useI18n();
  const householdId = useHouseholdId();
  const baseCurrency = loadBaseCurrency();
  const accounts = useAccounts(householdId);
  const balances = useAccountBalances(householdId);
  const balanceOf = (id: string) => balances.find((b) => b.account_id === id)?.balance ?? 0;
  const netWorth = balances.reduce((sum, b) => sum + (b.balance ?? 0), 0);
  const groups = [
    { title: t('accounts.assets'), list: accounts.filter((a) => a.type !== 'credit'), debt: false },
    {
      title: t('accounts.liabilities'),
      list: accounts.filter((a) => a.type === 'credit'),
      debt: true,
    },
  ];
  return (
    <section className="card flex min-w-0 flex-col gap-3" aria-label={t('dashboard.balances')}>
      <h2 className="text-lg font-semibold">{t('dashboard.balances')}</h2>
      {accounts.length === 0 ? (
        <p className="hint">{t('accounts.empty')}</p>
      ) : (
        <>
          {groups.map((group) => {
            if (group.list.length === 0) return null;
            const subtotal = group.list.reduce(
              (sum, a) =>
                sum + (group.debt ? Math.abs(Math.min(balanceOf(a.id), 0)) : balanceOf(a.id)),
              0
            );
            return (
              <div key={group.title} className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-[var(--text-muted)]">
                  {group.title} · {formatMoney(locale, subtotal, baseCurrency)}
                </p>
                {group.list.map((a) => {
                  const bal = balanceOf(a.id);
                  return (
                    <p key={a.id} className="flex justify-between gap-2 text-sm">
                      <span className="truncate">
                        {a.name} · {accountTypeLabel(t, a.type)}
                      </span>
                      <span
                        className="amount"
                        style={group.debt ? { color: 'var(--danger)' } : undefined}
                      >
                        {formatMoney(
                          locale,
                          group.debt ? Math.abs(Math.min(bal, 0)) : bal,
                          baseCurrency
                        )}
                      </span>
                    </p>
                  );
                })}
              </div>
            );
          })}
          <p className="flex justify-between border-t border-[var(--border)] pt-2 font-bold">
            <span>{t('accounts.netWorth')}</span>
            <span className="amount">{formatMoney(locale, netWorth, baseCurrency)}</span>
          </p>
        </>
      )}
    </section>
  );
}

export function Dashboard() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <p className="page-sub">{t('dashboard.welcome')}</p>
      </div>
      <Hero />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <BudgetOverview />
        <UpcomingBills />
        <RecentTransactions />
        <CategoryBreakdown />
        <IncomeVsExpenses />
        <BalanceHistory />
        <Balances />
      </div>
    </div>
  );
}
