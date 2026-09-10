import { column, Schema, Table } from '@powersync/web';

/**
 * Client SQLite schema. Mirrors supabase/migrations/0001_schema.sql (+0008 ids).
 * Type mapping: uuid/text/date/timestamptz -> text, numeric -> real, bool -> integer.
 * Table names must match the server tables exactly (uploads use them by name).
 */

const households = new Table({
  name: column.text,
  created_at: column.text,
});

const users = new Table(
  {
    email: column.text,
    base_currency: column.text,
    household_id: column.text,
    locale: column.text,
    created_at: column.text,
  },
  { indexes: { household: ['household_id'] } }
);

const accounts = new Table(
  {
    household_id: column.text,
    name: column.text,
    type: column.text,
    created_at: column.text,
  },
  { indexes: { household: ['household_id'] } }
);

const categories = new Table(
  {
    key: column.text,
    kind: column.text,
    sort: column.integer,
    household_id: column.text,
    label: column.text
  },
  { indexes: { household: ['household_id'] } }
);

const transactions = new Table(
  {
    household_id: column.text,
    account_id: column.text,
    category_id: column.text,
    amount: column.real,
    currency: column.text,
    base_amount: column.real,
    txn_date: column.text,
    kind: column.text,
    note: column.text,
    recurring_rule_id: column.text,
    created_at: column.text,
  },
  { indexes: { household_date: ['household_id', 'txn_date'], account: ['account_id'] } }
);

const transaction_splits = new Table(
  {
    transaction_id: column.text,
    category_id: column.text,
    amount: column.real,
  },
  { indexes: { transaction: ['transaction_id'] } }
);

const tags = new Table(
  {
    household_id: column.text,
    name: column.text,
  },
  { indexes: { household: ['household_id'] } }
);

const transaction_tags = new Table(
  {
    transaction_id: column.text,
    tag_id: column.text,
  },
  { indexes: { transaction: ['transaction_id'], tag: ['tag_id'] } }
);

const budgets = new Table(
  {
    household_id: column.text,
    category_id: column.text,
    limit_amount: column.real,
    period: column.text,
  },
  { indexes: { household: ['household_id'] } }
);

const recurring_rules = new Table(
  {
    household_id: column.text,
    account_id: column.text,
    category_id: column.text,
    amount: column.real,
    currency: column.text,
    cadence: column.text,
    next_due: column.text,
    note: column.text,
    is_active: column.integer,
    created_at: column.text,
  },
  { indexes: { household_due: ['household_id', 'next_due'] } }
);

const exchange_rates = new Table(
  {
    base_currency: column.text,
    target_currency: column.text,
    rate: column.real,
    rate_date: column.text,
    fetched_at: column.text,
  },
  { indexes: { lookup: ['base_currency', 'target_currency', 'rate_date'] } }
);

export const AppSchema = new Schema({
  households,
  users,
  accounts,
  categories,
  transactions,
  transaction_splits,
  tags,
  transaction_tags,
  budgets,
  recurring_rules,
  exchange_rates,
});

export type Database = (typeof AppSchema)['types'];
