import { useQuery } from '@powersync/react';
import type { AppDatabase } from '../powersync/db';
import type { Currency } from './types';

export type IntervalUnit = 'day' | 'week' | 'month';

export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface RecurringRule {
  id: string;
  household_id: string;
  account_id: string;
  category_id: string;
  amount: number;
  currency: string;
  cadence: string;
  interval_n: number | null;
  interval_unit: IntervalUnit | null;
  next_due: string;
  end_date: string | null;
  skip_date: string | null;
  note: string | null;
  is_active: number;
  created_at: string;
}

export interface RecurringView extends RecurringRule {
  account_name: string;
  category_key: string | null;
  category_label: string | null;
  category_kind: string;
}

export interface RecurringInput {
  accountId: string;
  categoryId: string;
  amount: number;
  currency: Currency;
  cadence: Cadence;
  /** Required when cadence is custom. */
  intervalN?: number | null;
  intervalUnit?: IntervalUnit | null;
  nextDue: string;
  /** YYYY-MM-DD or empty = runs forever. */
  endDate?: string;
  note?: string;
}

const VIEW_SELECT = `SELECT r.*, a.name AS account_name, c.key AS category_key, c.label AS category_label,
  c.kind AS category_kind
  FROM recurring_rules r
  JOIN accounts a ON a.id = r.account_id
  JOIN categories c ON c.id = r.category_id`;

export function useRecurring(householdId: string | null): RecurringView[] {
  const { data } = useQuery<RecurringView>(
    `${VIEW_SELECT} WHERE r.household_id = ? ORDER BY r.next_due`,
    [householdId ?? '']
  );
  return data;
}

/** Active rules due within the window (inclusive), soonest first. */
export function useUpcomingBills(
  householdId: string | null,
  todayISO: string,
  throughISO: string
): RecurringView[] {
  const { data } = useQuery<RecurringView>(
    `${VIEW_SELECT} WHERE r.household_id = ? AND r.is_active = 1
     AND r.next_due >= ? AND r.next_due <= ? ORDER BY r.next_due`,
    [householdId ?? '', todayISO, throughISO]
  );
  return data;
}

function validate(input: RecurringInput): void {
  if (!input.accountId || !input.categoryId || !input.nextDue)
    throw new Error('recurring.errRequired');
  if (!(input.amount > 0)) throw new Error('recurring.errRequired');
  if (input.cadence === 'custom') {
    if (!(input.intervalN != null && input.intervalN >= 1 && input.intervalUnit))
      throw new Error('recurring.errInterval');
  }
  if (input.endDate && input.endDate < input.nextDue) throw new Error('recurring.errEndDate');
}

export async function createRecurring(
  db: AppDatabase,
  householdId: string,
  input: RecurringInput
): Promise<string> {
  validate(input);
  const id = crypto.randomUUID();
  const custom = input.cadence === 'custom';
  await db.execute(
    `INSERT INTO recurring_rules
      (id, household_id, account_id, category_id, amount, currency, cadence,
       interval_n, interval_unit, next_due, end_date, skip_date, note, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?)`,
    [
      id,
      householdId,
      input.accountId,
      input.categoryId,
      input.amount,
      input.currency,
      input.cadence,
      custom ? input.intervalN : null,
      custom ? input.intervalUnit : null,
      input.nextDue,
      input.endDate?.trim() || null,
      input.note?.trim() || null,
      new Date().toISOString(),
    ]
  );
  return id;
}

export async function updateRecurring(
  db: AppDatabase,
  id: string,
  input: RecurringInput
): Promise<void> {
  validate(input);
  const custom = input.cadence === 'custom';
  await db.execute(
    `UPDATE recurring_rules SET account_id = ?, category_id = ?, amount = ?, currency = ?,
      cadence = ?, interval_n = ?, interval_unit = ?, next_due = ?,
      end_date = ?, note = ? WHERE id = ?`,
    [
      input.accountId,
      input.categoryId,
      input.amount,
      input.currency,
      input.cadence,
      custom ? input.intervalN : null,
      custom ? input.intervalUnit : null,
      input.nextDue,
      input.endDate?.trim() || null,
      input.note?.trim() || null,
      id,
    ]
  );
}

export async function setRecurringActive(
  db: AppDatabase,
  id: string,
  active: boolean
): Promise<void> {
  await db.execute('UPDATE recurring_rules SET is_active = ? WHERE id = ?', [active ? 1 : 0, id]);
}

/** Skip exactly the given occurrence (normally the rule's next_due). */
export async function skipNextOccurrence(
  db: AppDatabase,
  id: string,
  dateISO: string
): Promise<void> {
  if (!dateISO) throw new Error('recurring.errRequired');
  await db.execute('UPDATE recurring_rules SET skip_date = ? WHERE id = ?', [dateISO, id]);
}

/** Cancel a pending skip so the occurrence generates normally. */
export async function clearSkip(db: AppDatabase, id: string): Promise<void> {
  await db.execute('UPDATE recurring_rules SET skip_date = NULL WHERE id = ?', [id]);
}

export async function deleteRecurring(db: AppDatabase, id: string): Promise<void> {
  // Past generated transactions survive (recurring_rule_id set null server-side).
  await db.execute('DELETE FROM recurring_rules WHERE id = ?', [id]);
}
