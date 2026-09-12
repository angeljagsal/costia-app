import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePowerSync } from '@powersync/react';
import { Page } from '../components/Page';
import {
  categoryName,
  createCategory,
  deleteCategory,
  renameCategory,
  useCategories,
} from '../data/categories';
import { useHouseholdId } from '../data/household';
import type { Kind } from '../data/types';
import { useI18n } from '../i18n/useI18n';

export function Categories() {
  const { t } = useI18n();
  const db = usePowerSync();
  const householdId = useHouseholdId();
  const categories = useCategories(undefined, householdId);

  const [kind, setKind] = useState<Kind>('expense');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const showError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg.startsWith('categories.') ? t(msg) : msg);
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!householdId) return;
    setError(null);
    setSaving(true);
    try {
      await createCategory(db, householdId, kind, label);
      setLabel('');
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const onRename = async (id: string) => {
    setError(null);
    try {
      await renameCategory(db, id, editingLabel);
      setEditingId(null);
      setEditingLabel('');
    } catch (err) {
      showError(err);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    setError(null);
    try {
      await deleteCategory(db, id);
    } catch (err) {
      showError(err);
    }
  };

  const section = (sectionKind: Kind) => {
    const catalog = categories.filter((c) => c.kind === sectionKind && !c.household_id);
    const custom = categories.filter((c) => c.kind === sectionKind && c.household_id);
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          {t(sectionKind === 'expense' ? 'tx.kindExpense' : 'tx.kindIncome')}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {catalog.map((c) => (
            <li key={c.id} className="card px-3 py-2">
              {categoryName(t, c)}
            </li>
          ))}
        </ul>
        <p className="hint">{t('categories.custom')}</p>
        {custom.length === 0 ? (
          <p className="hint">{t('categories.emptyCustom')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {custom.map((c) => (
              <li key={c.id} className="card flex items-center gap-2">
                {editingId === c.id ? (
                  <>
                    <input
                      className="input flex-1"
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      maxLength={60}
                      aria-label={t('categories.label')}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onRename(c.id)}
                    >
                      {t('common.save')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingId(null);
                        setEditingLabel('');
                      }}
                    >
                      {t('common.cancel')}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{categoryName(t, c)}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditingLabel(c.label ?? '');
                      }}
                    >
                      {t('categories.rename')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => onDelete(c.id)}
                      aria-label={`${t('common.delete')}: ${categoryName(t, c)}`}
                    >
                      {t('common.delete')}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <Page title={t('categories.title')} body={t('categories.subtitle')} placeholder={false}>
      {!householdId ? (
        <p className="hint">{t('tx.waitSync')}</p>
      ) : (
        <>
          <form onSubmit={onCreate} className="card flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t('categories.new')}</h2>
            <p className="hint">{t('common.requiredNote')}</p>
            <div className="segmented" role="group" aria-label={t('categories.kind')}>
              {(['expense', 'income'] as Kind[]).map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
                  {t(k === 'expense' ? 'tx.kindExpense' : 'tx.kindIncome')}
                </button>
              ))}
            </div>
            <label className="label">
              {t('categories.label')}
              <input
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('categories.labelPlaceholder')}
                maxLength={60}
              />
            </label>
            {error ? (
              <p className="error-text" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={saving} className="btn btn-primary self-start">
              {saving ? t('common.saving') : t('categories.create')}
            </button>
          </form>

          {section('expense')}
          {section('income')}
        </>
      )}
    </Page>
  );
}
