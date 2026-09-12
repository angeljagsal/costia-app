import { Navigate, createBrowserRouter } from 'react-router';
import { Layout } from '../components/Layout';
import { LazyDashboard } from './LazyDashboard';
import { RequireAuth } from '../components/RequireAuth';
import { Login } from '../pages/Login';
import { NotFound } from '../pages/NotFound';
import { More } from '../pages/More';
import { Budgets } from '../pages/Budgets';
import { Recurring } from '../pages/Recurring';
import { Accounts } from '../pages/Accounts';
import { Categories } from '../pages/Categories';
import { Diagnostics } from '../pages/Diagnostics';
import { Settings } from '../pages/Settings';
import { TransactionForm } from '../pages/TransactionForm';
import { Transactions } from '../pages/Transactions';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <LazyDashboard />,
      },
      { path: 'transactions', element: <Transactions /> },
      { path: 'transactions/new', element: <TransactionForm mode="new" /> },
      { path: 'transactions/:id/edit', element: <TransactionForm mode="edit" /> },
      { path: 'accounts', element: <Accounts /> },
      { path: 'categories', element: <Categories /> },
      { path: 'budgets', element: <Budgets /> },
      { path: 'recurring', element: <Recurring /> },
      { path: 'reports', element: <Navigate to="/" replace /> },
      { path: 'more', element: <More /> },
      { path: 'settings', element: <Settings /> },
      { path: 'diagnostics', element: <Diagnostics /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
