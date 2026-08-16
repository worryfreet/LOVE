import 'server-only'
import { Pool, type PoolClient, type QueryResultRow } from 'pg'
import { getServerEnvironment } from './environment'

let pool: Pool | null = null

export function getDatabase() {
  if (!pool) {
    pool = new Pool({
      connectionString: getServerEnvironment().databaseUrl,
      max: 12,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    })
  }
  return pool
}

export async function queryDatabase<Row extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
) {
  return getDatabase().query<Row>(text, [...values])
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  const client = await getDatabase().connect()
  try {
    await client.query('begin')
    const result = await callback(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
