// CONTROLE POR LISTAS — puxar uma lista, marcar enviados e fechar (travar).
// Uso: node lista.js puxar <qtd> | node lista.js enviar <telefone> | node lista.js fechar <lista>
// Regras:
// - Puxar: pega os próximos contatos livres (queued, ou kit antigo sem lista) e marca com a lista nova.
// - Enviar: marca UM contato como sent (ele nunca mais volta pra nenhuma lista).
// - Fechar: quem estava na lista e NÃO foi enviado volta pra fila (lista=null, status=queued);
//   quem foi enviado guarda a lista no histórico — a lista fica travada.
import { execSync } from 'node:child_process';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
await sql`alter table leads add column if not exists lista text`;

const [acao, arg] = process.argv.slice(2);

function regenerar() {
  execSync('node leads.js', { stdio: 'inherit' });
}

if (acao === 'puxar') {
  const qtd = Math.max(1, Math.min(50, parseInt(arg || '10', 10)));
  const aberta = await sql`select distinct lista from leads where status = 'kit' and lista is not null limit 1`;
  if (aberta.length) {
    console.log(`Já existe uma lista aberta (${aberta[0].lista}). Feche ela antes de puxar outra.`);
    process.exit(0);
  }
  const agora = new Date();
  const id = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const escolhidos = await sql`select id from leads
    where (status = 'queued' or (status = 'kit' and lista is null))
    order by created_at limit ${qtd}`;
  if (!escolhidos.length) { console.log('Fila vazia — extraia mais contatos.'); process.exit(0); }
  for (const l of escolhidos) {
    await sql`update leads set status = 'kit', lista = ${id} where id = ${l.id}`;
  }
  console.log(`Lista "${id}" criada com ${escolhidos.length} contatos.`);
  regenerar();
} else if (acao === 'enviar') {
  const tel = String(arg || '').replace(/\D/g, '');
  if (!tel) { console.log('Telefone não informado.'); process.exit(0); }
  const r = await sql`update leads set status = 'sent', sent_at = now()
    where telefone = ${tel} and status in ('queued', 'kit') returning nome`;
  console.log(r.length ? `Marcado como enviado: ${r[0].nome}` : 'Nada marcado (contato não estava livre).');
  regenerar();
} else if (acao === 'fechar') {
  const id = String(arg || '');
  if (!id) { console.log('Informe qual lista fechar.'); process.exit(0); }
  const voltam = await sql`update leads set status = 'queued', lista = null
    where lista = ${id} and status = 'kit' returning id`;
  const [env] = await sql`select count(*)::int as n from leads where lista = ${id} and status = 'sent'`;
  console.log(`Lista "${id}" FECHADA e travada: ${env.n} enviados (histórico), ${voltam.length} voltaram pra fila.`);
  regenerar();
} else {
  console.log('Uso: node lista.js puxar <qtd> | enviar <telefone> | fechar "<lista>"');
}
