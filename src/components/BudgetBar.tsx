export type BudgetState = 'onTrack' | 'nearLimit' | 'overLimit';

export function budgetStateFor(spent: number, limit: number): BudgetState {
  if (!(limit > 0)) return 'onTrack';
  const ratio = spent / limit;
  if (ratio >= 1) return 'overLimit';
  if (ratio >= 0.8) return 'nearLimit';
  return 'onTrack';
}

export function budgetBarColor(state: BudgetState): string {
  if (state === 'overLimit') return 'var(--danger)';
  if (state === 'nearLimit') return '#e8930c';
  return 'var(--success)';
}

/** Accessible progress bar shared by the Budgets page and the Dashboard. */
export function BudgetBar({
  spent,
  limit,
  label,
}: {
  spent: number;
  limit: number;
  label: string;
}) {
  const state = budgetStateFor(spent, limit);
  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]"
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: budgetBarColor(state) }}
      />
    </div>
  );
}
