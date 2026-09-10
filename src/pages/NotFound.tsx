import { Link } from 'react-router';
import { useI18n } from '../i18n/useI18n';

export function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-4xl font-bold">404</p>
      <Link to="/" className="text-sm underline">
        {t('common.backToDashboard')}
      </Link>
    </div>
  );
}
