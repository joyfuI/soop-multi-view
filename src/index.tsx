/* @refresh reload */
import { createRouter } from '@solidjs/router';
import { render } from '@solidjs/web';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools';

import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found.');
}

const Router = createRouter({ routes: [{ path: '/*', component: App }] });

const queryClient = new QueryClient();

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <Router />
      <SolidQueryDevtools />
    </QueryClientProvider>
  ),
  root,
);
