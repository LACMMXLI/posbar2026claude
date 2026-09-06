import { useQuery } from '@tanstack/react-query';
import type { DependencyHealth } from '@posbar/contracts';
import { API_URL, fetchHealth } from './lib/api/health';

type Light = 'up' | 'down' | 'unknown';

function Indicator({
  name,
  state,
  detail,
}: {
  name: string;
  state: Light;
  detail?: string | undefined;
}) {
  return (
    <li className={`service service--${state}`} data-testid={`service-${name}`}>
      <span className="dot" aria-hidden />
      <span className="name">{name}</span>
      <span className="detail">{detail ?? state}</span>
    </li>
  );
}

function describe(check?: DependencyHealth): string | undefined {
  if (!check) return undefined;
  if (check.status === 'up') return `arriba · ${check.latencyMs ?? 0} ms`;
  return `caído${check.error ? ` · ${check.error}` : ''}`;
}

export function App() {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: () => fetchHealth(),
    refetchInterval: 10_000,
    retry: false,
  });

  const apiState: Light = query.isError ? 'down' : query.data ? 'up' : 'unknown';
  const pg = query.data?.checks.postgres;
  const redis = query.data?.checks.redis;

  return (
    <main className="panel">
      <h1>POS Bar · estado del sistema</h1>
      <p className="muted">
        API: <code>{API_URL}</code>
        {query.data ? ` · versión ${query.data.version}` : ''}
      </p>
      <ul className="services">
        <Indicator
          name="api"
          state={apiState}
          detail={query.isError ? (query.error as Error).message : undefined}
        />
        <Indicator name="postgres" state={pg?.status ?? 'unknown'} detail={describe(pg)} />
        <Indicator name="redis" state={redis?.status ?? 'unknown'} detail={describe(redis)} />
      </ul>
      <p className="muted">
        {query.isFetching
          ? 'Comprobando…'
          : query.data
            ? `Actualizado ${query.data.timestamp}`
            : ''}
      </p>
    </main>
  );
}
