import { BudgetBar } from './BudgetBar';
import { useBudgetSpent } from '../data/budgets';
import type { BudgetView } from '../data/budgets';
import { categoryName } from '../data/categories';
import { useHouseholdId } from '../data/household';
import { getPeriodRange, todayLocal } from '../data/periods';
import { useI18n } from '../i18n/useI18n';
import { formatMoney } from '../lib/format';
import { loadBaseCurrency } from '../lib/prefs';

/** Compact current-period budget progress, shared by Dashboard and Reports. */
export function BudgetProgressRow({ budget }: { budget: BudgetView }) {
  const { t, locale } = useI18n();
  const householdId = useHouseholdId();
  const baseCurrency = loadBaseCurrency();
  const range = getPeriodRange(budget.period, todayLocal());
  const spent = useBudgetSpent(householdId, budget.category_id, range.from, range.to);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-medium">{categoryName(t, budget)}</span>
        <span className="hint shrink-0">
          {formatMoney(locale, spent, baseCurrency)} /{' '}
          {formatMoney(locale, budget.limit_amount, baseCurrency)}
        </span>
      </div>
      <BudgetBar spent={spent} limit={budget.limit_amount} label={categoryName(t, budget)} />
    </div>
  );
}
