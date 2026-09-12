import { Link } from 'react-router';
import { categoryName } from '../data/categories';
import { addDaysISO, todayLocal } from '../data/periods';
import { useHouseholdId } from '../data/household';
import { useUpcomingBills } from '../data/recurring';
import { useI18n } from '../i18n/useI18n';

/** Bills due in the next 7 days. Ships on the Recurring page; reused by the Dashboard in Phase 6. */
export function UpcomingBills() {
  const { t, locale } = useI18n();
  const householdId = useHouseholdId();
  const today = todayLocal();
  const bills = useUpcomingBills(householdId, today, addDaysISO(today, 7));
  const tag = locale === 'es-MX' ? 'es-MX' : 'en-US';

  const day = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' }).format(
        new Date(`${iso}T00:00:00`)
      );
    } catch {
      return iso;
    }
  };

  const money = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(tag, { style: 'currency', currency }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  if (!householdId) return <p className="hint">{t('tx.waitSync')}</p>;

  return (
    <section className="card flex flex-col gap-2" aria-label={t('recurring.upcoming')}>
      <h2 className="text-lg font-semibold">{t('recurring.upcoming')}</h2>
      {bills.length === 0 ? (
        <p className="hint">{t('recurring.upcomingEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bills.map((b) => {
            const income = b.category_kind === 'income';
            const dueTomorrow = b.next_due === addDaysISO(today, 1);
            return (
              <li key={b.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {categoryName(t, b)}{' '}
                    {dueTomorrow ? (
                      <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--accent-strong)]">
                        {t('recurring.dueTomorrow')}
                      </span>
                    ) : null}
                  </p>
                  <p className="hint">
                    {t('recurring.dueOn')} {day(b.next_due)} · {b.account_name}
                  </p>
                </div>
                <p
                  className="shrink-0 font-bold"
                  style={{ color: income ? 'var(--success)' : 'var(--danger)' }}
                >
                  {income ? '+' : '−'}
                  {money(b.amount, b.currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <Link to="/recurring" className="btn btn-secondary self-start">
        {t('nav.recurring')}
      </Link>
    </section>
  );
}
