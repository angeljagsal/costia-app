import { useI18n } from '../i18n/useI18n';

/** Flat gray placeholders shown while the Dashboard chunk loads. */
export function DashboardSkeleton() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4" role="status" aria-label={t('common.loading')}>
      <div className="skeleton h-40" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="skeleton h-48" />
        <div className="skeleton h-48" />
        <div className="skeleton h-48" />
        <div className="skeleton h-48" />
      </div>
    </div>
  );
}
