import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Client } from 'pg'

test(
  'PostgreSQL 迁移可在独立测试库完整执行',
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const client = new Client({ connectionString: process.env.TEST_DATABASE_URL })
    await client.connect()
    const schema = `love_test_${Date.now()}`
    try {
      await client.query('begin')
      await client.query(`create schema ${schema}`)
      await client.query(`set local search_path to ${schema}`)
      const migration = await readFile(new URL('../db/migrations/001_init.sql', import.meta.url), 'utf8')
      await client.query(migration)
      const result = await client.query<{ table_name: string }>(
        `select table_name from information_schema.tables
          where table_schema = $1 order by table_name`,
        [schema],
      )
      assert.deepEqual(
        result.rows.map((row) => row.table_name),
        ['assets', 'edit_sessions', 'project_revisions', 'projects'],
      )
    } finally {
      await client.query('rollback')
      await client.end()
    }
  },
)
