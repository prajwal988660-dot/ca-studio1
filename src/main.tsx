import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './routes';
import { purgeLegacyAppDataOnce } from '@/lib/purgeLegacyAppData';
import './app/globals.css';

purgeLegacyAppDataOnce();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster richColors position="top-right" closeButton />
  </StrictMode>
);
