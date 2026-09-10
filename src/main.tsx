import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PowerSyncContext } from '@powersync/react';
import { RouterProvider } from 'react-router';
import './index.css';
import { router } from './app/router.tsx';
import { AuthProvider } from './auth/AuthProvider.tsx';
import { I18nProvider } from './i18n/I18nProvider.tsx';
import { SyncProvider } from './sync/SyncProvider.tsx';
import { ThemeProvider } from './theme/ThemeProvider.tsx';
import { db } from './powersync/db.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <SyncProvider>
            <PowerSyncContext.Provider value={db}>
              <RouterProvider router={router} />
            </PowerSyncContext.Provider>
          </SyncProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>
);
