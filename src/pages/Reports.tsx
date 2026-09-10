import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Page } from '../components/Page';
import { BudgetProgressRow } from '../components/BudgetProgress';
import { categoryName } from '../data/categories';
import { useHouseholdId } from '../data/household';
import { monthEnd, monthRange, monthStart, shiftMonth, todayLocal } from '../data/periods';
import { useBalanceHistory, useCategoryTotals, useMonthlyFlow } from '../data/reports';
import { useBudgets } from '../data/budgets';
import { useI18n } from '../i18n/useI18n';
import { formatMoney, formatMonthLabel } from '../lib/format';
import { loadBaseCurrency } from '../lib/prefs';

type Preset = 'month' | 'quarter' | 'half' | 'year' | 'custom';

const PRESETS: Preset[] = ['month', 'quarter', 'half', 'year', 'custom'];

const PRESET_LABEL: Record<Preset, string> = {
  month: 'reports.presetMonth',
  quarter: 'reports.presetQuarter',
  half: 'reports.presetHalf',
  year: 'reports.presetYear',
  custom: 'reports.custom',
};

const INCOME_COLOR = '#108548';
const EXPENSE_COLOR = '#1f75cb';
const BALANCE_COLOR = '#6e49cb';

const tooltipStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
};

export function Reports() {
  const { t, locale } = useI18n();
  const householdId = useHouseholdId();
  const baseCurrency = loadBaseCurrency();
  const today = todayLocal();
  const curMonth = today.slice(0, 7);
  const curYear = today.slice(0, 4);

  const [preset, setPreset] = useState<Preset>('month');
  const [customFrom, setCustomFrom] = useState(monthStart(curMonth));
  const [customTo, setCustomTo] = useState(monthEnd(curMonth));

  let from = monthStart(curMonth);
  let to = monthEnd(curMonth);
  if (preset === 'quarter') {
    from = monthStart(shiftMonth(curMonth, -2));
    to = today;
  } else if (preset === 'half') {
    from = monthStart(shiftMonth(curMonth, -5));
    to = today;
  } else if (preset === 'year') {
    from = `${curYear}-01-01`;
    to = today;
  } else if (preset === 'custom') {
    from = customFrom || monthStart(curMonth);
    to = customTo || monthEnd(curMonth);
  }

  const flow = useMonthlyFlow(householdId, from, to);
  const totals = flow.reduce(
    (acc, f) => ({
      income: acc.income + (f.income ?? 0),
      expenses: acc.expenses + (f.expenses ?? 0),
    }),
    { income: 0, expenses: 0 }
  );
  const net = totals.income - totals.expenses;

  const byMonth = new Map(flow.map((f) => [f.month, f]));
  const trend = monthRange(from.slice(0, 7), to.slice(0, 7)).map((m) => ({
    month: formatMonthLabel(locale, m),
    [t('reports.income')]: byMonth.get(m)?.income ?? 0,
    [t('reports.expenses')]: byMonth.get(m)?.expenses ?? 0,
  }));

  const history = useBalanceHistory(householdId, from.slice(0, 7), to.slice(0, 7));
  const historyData = history.map((p) => ({
    month: formatMonthLabel(locale, p.month),
    [t('reports.balanceHistory')]: Math.round(p.balance * 100) / 100,
  }));

  const categories = useCategoryTotals(householdId, 'expense', from, to);
  const maxCat = Math.max(1, ...categories.map((c) => c.total));
  const budgets = useBudgets(householdId);

  const isEmpty = totals.income === 0 && totals.expenses === 0 && budgets.length === 0;

  return (
    <Page title={t('reports.title')} body={t('reports.subtitle')} placeholder={false}>
      {!householdId ? (
        <p className="hint">{t('tx.waitSync')}</p>
      ) : (
        <>
          <div className="card flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('reports.title')}>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={preset === p}
                  onClick={() => setPreset(p)}
                  className={`btn ${preset === p ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {t(PRESET_LABEL[p])}
                </button>
              ))}
            </div>
            {preset === 'custom' ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="label">
                  {t('reports.from')}
                  <input
                    type="date"
                    className="input"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </label>
                <label className="label">
                  {t('reports.to')}
                  <input
                    type="date"
                    className="input"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </label>
              </div>
            ) : null}
          </div>

          {isEmpty ? (
            <p className="hint">{t('reports.empty')}</p>
          ) : (
            <>
              <section className="card flex flex-col gap-2" aria-label={t('reports.totals')}>
                <h2 className="text-lg font-semibold">{t('reports.totals')}</h2>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="hint">{t('reports.income')}</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--success)' }}>
                      {formatMoney(locale, totals.income, baseCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="hint">{t('reports.expenses')}</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--danger)' }}>
                      {formatMoney(locale, totals.expenses, baseCurrency)}
                    </p>
                  </div>
                  <div>
                    <p className="hint">{t('reports.net')}</p>
                    <p className="text-lg font-bold">{formatMoney(locale, net, baseCurrency)}</p>
                  </div>
                </div>
              </section>

              <section
                className="card flex min-w-0 flex-col gap-2"
                aria-label={t('reports.byCategory')}
              >
                <h2 className="text-lg font-semibold">{t('reports.byCategory')}</h2>
                {categories.length === 0 ? (
                  <p className="hint">{t('reports.empty')}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {categories.map((c) => (
                      <li key={c.category_id} className="flex flex-col gap-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="truncate font-medium">{categoryName(t, c)}</span>
                          <span className="font-semibold">
                            {formatMoney(locale, c.total, baseCurrency)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round((c.total / maxCat) * 100)}%`,
                              background: EXPENSE_COLOR,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card flex min-w-0 flex-col gap-2" aria-label={t('reports.trend')}>
                <h2 className="text-lg font-semibold">{t('reports.trend')}</h2>
                <div className="h-52 text-[var(--text-muted)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#999" strokeOpacity={0.4} />
                      <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} width={48} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => formatMoney(locale, Number(value ?? 0), baseCurrency)}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey={t('reports.income')}
                        fill={INCOME_COLOR}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey={t('reports.expenses')}
                        fill={EXPENSE_COLOR}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section
                className="card flex min-w-0 flex-col gap-2"
                aria-label={t('reports.balanceHistory')}
              >
                <h2 className="text-lg font-semibold">{t('reports.balanceHistory')}</h2>
                {historyData.length === 0 ? (
                  <p className="hint">{t('reports.empty')}</p>
                ) : (
                  <div className="h-52 text-[var(--text-muted)]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#999" strokeOpacity={0.4} />
                        <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} width={48} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value) =>
                            formatMoney(locale, Number(value ?? 0), baseCurrency)
                          }
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line
                          type="monotone"
                          dataKey={t('reports.balanceHistory')}
                          stroke={BALANCE_COLOR}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              {budgets.length > 0 ? (
                <section
                  className="card flex min-w-0 flex-col gap-3"
                  aria-label={t('reports.budgetVsActual')}
                >
                  <h2 className="text-lg font-semibold">{t('reports.budgetVsActual')}</h2>
                  {budgets.map((b) => (
                    <BudgetProgressRow key={b.id} budget={b} />
                  ))}
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </Page>
  );
}
