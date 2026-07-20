/* @refresh reload */
import 'solid-devtools';
import { Route, Router } from '@solidjs/router';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools';
import { render } from 'solid-js/web';

import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found.');
}

const queryClient = new QueryClient();

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Route component={App} path="/*" />
      </Router>
      <SolidQueryDevtools />
    </QueryClientProvider>
  ),
  root,
);
