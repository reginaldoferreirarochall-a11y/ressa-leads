// Administração de leads pelo painel — 100% código.
// Ações (env ADMIN_ACAO): add | queue | hold | sent | invalid | delete
// Identifica o lead pelo telefone (ADMIN_PHONE, com ou sem o 55).
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const acao = process.env.ADMIN_ACAO || '';
let phone = (process.env.ADMIN_PHONE || '').replace(/\D/g, '');
if (phone.length === 10 || phone.length === 11) phone = '55' + phone;
const nome = (process.env.ADMIN_NOME || '').trim();
const cidade = (process.env.ADMIN_CIDADE || '').trim();

if (!phone) { console.log('Telefone não informado.'); process.exit(1); }

if (acao === 'add') {
  const r = await sql`insert into leads (nome, telefone, cidade, status)
    values (${nome || 'Vidraçaria'}, ${phone}, ${cidade || null}, 'queued')
    on conflict (telefone) do update set nome = excluded.nome, cidade = excluded.cidade, status = 'queued'
    returning id`;
  console.log(`Lead adicionado/atualizado na fila: ${nome} ${phone} (id ${r[0].id})`);
} else if (acao === 'delete') {
  const r = await sql`delete from leads where telefone = ${phone} returning id`;
  console.log(r.length ? `Lead excluído: ${phone}` : `Nenhum lead com o telefone ${phone}.`);
} else {
  const map = { queue: 'queued', hold: 'hold', sent: 'sent', invalid: 'invalid' };
  const st = map[acao];
  if (!st) { console.log('Ação desconhecida:', acao); process.exit(1); }
  const r = await sql`update leads set status = ${st} where telefone = ${phone} returning id, nome`;
  console.log(r.length ? `Lead ${r[0].nome} (${phone}) agora está: ${st}` : `Nenhum lead com o telefone ${phone}.`);
}
