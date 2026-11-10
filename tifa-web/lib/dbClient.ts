// Database Client - PostgreSQL connection via pg package
// Connects to PostgreSQL database via Cloudflare tunnel (DBeaver)
// Pre-requisite: run `cloudflared access tcp --hostname postgres.forgixrobotic.com --url localhost:5002`

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Database connection configuration from environment variables
// IMPORTANT: Jangan menuliskan password atau kredensial sensitif secara hardcode di sini!
// Semua nilai ini akan dibaca dari file .env.local (saat local) atau Environment Variables dashboard (saat deploy).
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
};

if (!process.env.DB_PASS || !process.env.DB_HOST) {
  console.warn('[PostgreSQL] ⚠️ WARNING: Environment variables database (DB_HOST, DB_PASS, dll) belum di-set. Pastikan .env.local atau config deployment sudah benar.');
}

const pool = new Pool({
  ...DB_CONFIG,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // 5s timeout (higher for tunnel latency)
});

console.log(`[PostgreSQL] Pool configured → ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database} (user: ${DB_CONFIG.user})`);

// Log connection errors
pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client:', err);
});

// Transient error codes that should trigger a retry
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'EAI_AGAIN']);

function isRetryableError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    return RETRYABLE_CODES.has((err as { code: string }).code);
  }
  return false;
}

/**
 * Execute a parameterized query and return typed rows.
 * Automatically retries on transient connection errors (e.g. ECONNRESET from tunnel).
 * @param text - SQL query with $1, $2, etc. placeholders
 * @param params - Array of parameter values
 * @returns Array of typed row objects
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T[]> {
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result: QueryResult<T> = await pool.query(text, params);
      return result.rows;
    } catch (err) {
      if (attempt < MAX_RETRIES && isRetryableError(err)) {
        const wait = 500 * Math.pow(2, attempt); // 500ms, 1000ms
        console.warn(`[PostgreSQL] query retry ${attempt + 1}/${MAX_RETRIES} after ${wait}ms (${(err as { code: string }).code})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  // Should never reach here, but TypeScript needs it
  throw new Error('[PostgreSQL] query: max retries exceeded');
}

/**
 * Execute a query and return the full result with row count.
 * Automatically retries on transient connection errors.
 * Useful for INSERT/UPDATE/DELETE operations.
 */
export async function queryWithCount<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<{ rows: T[]; rowCount: number }> {
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result: QueryResult<T> = await pool.query(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
      };
    } catch (err) {
      if (attempt < MAX_RETRIES && isRetryableError(err)) {
        const wait = 500 * Math.pow(2, attempt);
        console.warn(`[PostgreSQL] queryWithCount retry ${attempt + 1}/${MAX_RETRIES} after ${wait}ms (${(err as { code: string }).code})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error('[PostgreSQL] queryWithCount: max retries exceeded');
}

/**
 * Get a client from the pool for transaction support
 * Remember to release the client when done!
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Execute a transaction with automatic commit/rollback
 * @param callback - Function that receives a client and performs operations
 * @returns The result of the callback
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all pool connections (use on app shutdown)
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

/**
 * Test database connection with retry support
 * @param retries - Number of retry attempts (default 3)
 * @param delayMs - Initial delay between retries in ms (default 1000, doubles each retry)
 * @returns true if connection is successful, false otherwise
 */
export async function testConnection(retries = 3, delayMs = 1000): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await query<{ now: Date }>('SELECT NOW() as now');
      console.log('[PostgreSQL] Connection successful:', result[0]?.now);
      return true;
    } catch (error) {
      console.error(`[PostgreSQL] Connection attempt ${attempt}/${retries} failed:`, error);
      if (attempt < retries) {
        const wait = delayMs * Math.pow(2, attempt - 1);
        console.log(`[PostgreSQL] Retrying in ${wait}ms...`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }
  console.error('[PostgreSQL] All connection attempts failed. Is the Cloudflare tunnel running?');
  return false;
}
