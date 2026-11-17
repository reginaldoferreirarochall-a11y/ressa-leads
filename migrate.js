// Migração da Etapa 2 — expande a tabela leads e cria a tabela campaigns.
// Idempotente: pode rodar quantas vezes quiser (IF NOT EXISTS em tudo).
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`alter table leads add column if not exists endereco text`;
await sql`alter table leads add column if not exists site text`;
await sql`alter table leads add column if not exists avaliacao numeric`;
await sql`alter table leads add column if not exists avaliacoes int`;
await sql`alter table leads add column if not exists categoria text`;
await sql`alter table leads add column if not exists place_id text`;
await sql`alter table leads add column if not exists email text`;
await sql`alter table leads add column if not exists maps_link text`;
await sql`create unique index if not exists leads_place_id_unique on leads (place_id) where place_id is not null`;

await sql`create table if not exists campaigns (
  id serial primary key,
  nicho text,
  regiao text,
  query text,
  encontrados int default 0,
  inseridos int default 0,
  duplicados int default 0,
  created_at timestamptz default now()
)`;

const cols = await sql`select column_name from information_schema.columns where table_name = 'leads' order by ordinal_position`;
console.log('Colunas da tabela leads:', cols.map(c => c.column_name).join(', '));
const total = await sql`select count(*)::int as n from leads`;
console.log('Total de leads na base:', total[0].n);
console.log('Migração concluída.');
