import type { ReactNode } from 'react';
import { useI18n } from '../i18n/useI18n';

export function Page({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {body ? <p className="mt-1 text-sm text-[var(--text-muted)]">{body}</p> : null}
      </div>
      {children}
      <p className="text-xs text-[var(--text-muted)]">{t('common.comingSoon')}</p>
    </div>
  );
}
