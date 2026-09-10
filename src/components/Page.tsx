import type { ReactNode } from 'react';
import { useI18n } from '../i18n/useI18n';

export function Page({
  title,
  body,
  children,
  placeholder = true,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
  /** Placeholder screens explain that functionality arrives in their phase. */
  placeholder?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {body ? <p className="page-sub">{body}</p> : null}
      </div>
      {children}
      {placeholder ? <p className="hint">{t('common.comingSoon')}</p> : null}
    </div>
  );
}
