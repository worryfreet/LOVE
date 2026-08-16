import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('缺少 DATABASE_URL，无法执行数据库迁移')

const client = new pg.Client({ connectionString: databaseUrl })
await client.connect()

try {
  await client.query(`create table if not exists app_migrations (
    name text primary key,
    checksum char(64) not null,
    applied_at timestamptz not null default now()
  )`)
  const directory = path.resolve(process.cwd(), 'db/migrations')
  const names = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()
  for (const name of names) {
    const sql = await readFile(path.join(directory, name), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    await client.query('begin')
    try {
      await client.query('select pg_advisory_xact_lock($1)', [7_419_526])
      const existing = await client.query(
        'select checksum from app_migrations where name = $1',
        [name],
      )
      if (existing.rows[0] && existing.rows[0].checksum !== checksum) {
        throw new Error(`已执行的迁移 ${name} 内容发生变化`)
      }
      if (!existing.rows[0]) {
        await client.query(sql)
        await client.query(
          'insert into app_migrations (name, checksum) values ($1, $2)',
          [name, checksum],
        )
      }
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    }
  }
  console.log(`数据库迁移完成：${names.length} 个文件`)
} finally {
  await client.end()
}
