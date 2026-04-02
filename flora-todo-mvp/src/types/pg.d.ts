declare module "pg" {
  export type QueryResult<T = Record<string, unknown>> = {
    rows: T[];
    rowCount?: number | null;
  };

  export class PoolClient {
    query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}
