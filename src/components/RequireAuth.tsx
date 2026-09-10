import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session, bypassed } = useAuth();
  const { t } = useI18n();
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">{t('auth.loading')}</p>
      </div>
    );
  }
  if (session || bypassed) return <>{children}</>;
  return <Navigate to="/login" replace />;
}
