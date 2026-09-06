import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('muestra los tres servicios en verde cuando /health responde ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'ok',
            version: '0.1.0',
            timestamp: new Date().toISOString(),
            checks: {
              postgres: { status: 'up', latencyMs: 3 },
              redis: { status: 'up', latencyMs: 1 },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    renderApp();
    await waitFor(() => expect(screen.getByTestId('service-postgres')).toHaveClass('service--up'));
    expect(screen.getByTestId('service-redis')).toHaveClass('service--up');
    expect(screen.getByTestId('service-api')).toHaveClass('service--up');
  });

  it('marca la API caída cuando la petición falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));
    renderApp();
    await waitFor(() => expect(screen.getByTestId('service-api')).toHaveClass('service--down'));
    expect(screen.getByTestId('service-postgres')).toHaveClass('service--unknown');
  });
});
