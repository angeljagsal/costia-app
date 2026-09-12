import { Suspense, lazy } from 'react';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

// Dashboard (and its recharts dependency) loads on demand so the initial
// bundle stays lean; PowerSync + shell render first.
const DashboardInner = lazy(() =>
  import('../pages/Dashboard').then((m) => ({ default: m.Dashboard }))
);

export function LazyDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardInner />
    </Suspense>
  );
}
