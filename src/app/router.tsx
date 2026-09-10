import { createBrowserRouter } from 'react-router';
import { Layout } from '../components/Layout';
import { RequireAuth } from '../components/RequireAuth';
import { Dashboard } from '../pages/Dashboard';
import { Login } from '../pages/Login';
import { NotFound } from '../pages/NotFound';
import { Reports } from '../pages/Reports';
import { Budgets } from '../pages/Budgets';
import { Recurring } from '../pages/Recurring';
import { Accounts } from '../pages/Accounts';
import { Categories } from '../pages/Categories';
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
      { index: true, element: <Dashboard /> },
      { path: 'transactions', element: <Transactions /> },
      { path: 'transactions/new', element: <TransactionForm mode="new" /> },
      { path: 'transactions/:id/edit', element: <TransactionForm mode="edit" /> },
      { path: 'accounts', element: <Accounts /> },
      { path: 'categories', element: <Categories /> },
      { path: 'budgets', element: <Budgets /> },
      { path: 'recurring', element: <Recurring /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
