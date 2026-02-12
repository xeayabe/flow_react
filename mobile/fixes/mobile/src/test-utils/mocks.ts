/**
 * Enhanced InstantDB Mocks for Flow Test Suite
 *
 * Provides comprehensive mocking of InstantDB's db object including:
 * - db.queryOnce() for async one-shot queries
 * - db.transact() for database mutations
 * - db.tx chain for building transaction operations (update/delete)
 * - db.useQuery() for reactive queries in components
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MockQueryResult {
  data: Record<string, any[]>;
}

type QueryHandler = (query: Record<string, any>) => MockQueryResult;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** In-memory data store keyed by entity name */
let mockDataStore: Record<string, any[]> = {};

/** Optional custom query handler for advanced scenarios */
let customQueryHandler: QueryHandler | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reset all mock data between tests
 */
export function resetMockData(): void {
  mockDataStore = {};
  customQueryHandler = null;
}

/**
 * Seed the mock store with data for a specific entity
 */
export function seedMockData(entity: string, records: any[]): void {
  mockDataStore[entity] = records;
}

/**
 * Retrieve current mock data for an entity (useful for assertions)
 */
export function getMockData(entity: string): any[] {
  return mockDataStore[entity] || [];
}

/**
 * Register a custom query handler for complex test scenarios
 */
export function setCustomQueryHandler(handler: QueryHandler): void {
  customQueryHandler = handler;
}

// ---------------------------------------------------------------------------
// Query matching
// ---------------------------------------------------------------------------

function matchesWhere(record: any, where: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Range operators: $gte, $lte, $gt, $lt
      if ('$gte' in value && record[key] < value.$gte) return false;
      if ('$lte' in value && record[key] > value.$lte) return false;
      if ('$gt' in value && record[key] <= value.$gt) return false;
      if ('$lt' in value && record[key] >= value.$lt) return false;
    } else {
      if (record[key] !== value) return false;
    }
  }
  return true;
}

function resolveQuery(query: Record<string, any>): MockQueryResult {
  if (customQueryHandler) {
    return customQueryHandler(query);
  }

  const data: Record<string, any[]> = {};

  for (const [entity, config] of Object.entries(query)) {
    const allRecords = mockDataStore[entity] || [];

    if (config && typeof config === 'object' && config.$) {
      const where = config.$.where || {};
      data[entity] = allRecords.filter((r: any) => matchesWhere(r, where));
    } else {
      data[entity] = allRecords;
    }
  }

  return { data };
}

// ---------------------------------------------------------------------------
// db.tx chain builder
// ---------------------------------------------------------------------------

function createTxProxy(): any {
  return new Proxy(
    {},
    {
      get(_target, entityName: string) {
        // db.tx.transactions  ->  returns another proxy keyed by id
        return new Proxy(
          {},
          {
            get(_t, recordId: string) {
              return {
                update(fields: Record<string, any>) {
                  // Apply update to mock store
                  const store = mockDataStore[entityName] || [];
                  const index = store.findIndex((r: any) => r.id === recordId);
                  if (index >= 0) {
                    store[index] = { ...store[index], ...fields };
                  } else {
                    // Insert new record
                    store.push({ id: recordId, ...fields });
                    mockDataStore[entityName] = store;
                  }
                  return {
                    __op: 'update',
                    entity: entityName,
                    id: recordId,
                    fields,
                  };
                },
                delete() {
                  const store = mockDataStore[entityName] || [];
                  mockDataStore[entityName] = store.filter(
                    (r: any) => r.id !== recordId
                  );
                  return {
                    __op: 'delete',
                    entity: entityName,
                    id: recordId,
                  };
                },
              };
            },
          }
        );
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Mock db object
// ---------------------------------------------------------------------------

export const mockDb = {
  /**
   * One-shot async query (returns a promise)
   */
  queryOnce: jest.fn(async (query: Record<string, any>): Promise<MockQueryResult> => {
    return resolveQuery(query);
  }),

  /**
   * Reactive query hook (for component testing)
   */
  useQuery: jest.fn((query: Record<string, any>) => {
    const result = resolveQuery(query);
    return {
      data: result.data,
      isLoading: false,
      error: null,
    };
  }),

  /**
   * Execute a batch of transaction operations
   */
  transact: jest.fn(async (ops: any[]) => {
    // Operations are already applied via the tx proxy
    return { status: 'ok' };
  }),

  /**
   * Transaction builder (chainable proxy)
   */
  tx: createTxProxy(),

  /**
   * Auth mock
   */
  auth: {
    sendMagicCode: jest.fn(async () => ({ sent: true })),
    signInWithMagicCode: jest.fn(async () => ({ user: { id: 'mock-user-id', email: 'test@flow.ch' } })),
    signOut: jest.fn(async () => {}),
  },
};

/**
 * Create a fresh mock db instance (useful when you need isolated mocks per test)
 */
export function createMockDb() {
  return {
    queryOnce: jest.fn(async (query: Record<string, any>) => resolveQuery(query)),
    useQuery: jest.fn((query: Record<string, any>) => ({
      data: resolveQuery(query).data,
      isLoading: false,
      error: null,
    })),
    transact: jest.fn(async () => ({ status: 'ok' })),
    tx: createTxProxy(),
    auth: {
      sendMagicCode: jest.fn(async () => ({ sent: true })),
      signInWithMagicCode: jest.fn(async () => ({
        user: { id: 'mock-user-id', email: 'test@flow.ch' },
      })),
      signOut: jest.fn(async () => {}),
    },
  };
}
