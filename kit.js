// Gera o KIT DE ENVIO MANUAL (docs/kit.html) — 100% código, sem IA.
// Usa a MENSAGEM e a FOTO definidas no config.json (editáveis no dashboard).
// Lê os próximos leads 'queued' do Neon e marca como 'kit'.
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const FOTO_URL = `https://raw.githubusercontent.com/reginaldoferreirarochall-a11y/ressa-leads/main/${config.foto}`;

const qtd = Math.max(1, Math.min(20, parseInt(process.env.KIT_QTD || '5', 10)));
const incluirKit = process.env.KIT_INCLUIR === '1';
const sql = neon(process.env.DATABASE_URL);

const leads = incluirKit
  ? await sql`select id, nome, telefone, cidade from leads where status in ('queued','kit') order by created_at limit ${qtd}`
  : await sql`select id, nome, telefone, cidade from leads where status = 'queued' order by created_at limit ${qtd}`;

console.log(`Leads no kit: ${leads.length}`);

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pretty = (t) => (t.length === 13 ? `(${t.slice(2, 4)}) ${t.slice(4, 9)}-${t.slice(9)}`
  : t.length === 12 ? `(${t.slice(2, 4)}) ${t.slice(4, 8)}-${t.slice(8)}` : t);

const cards = leads.map((l) => {
  const link = `https://wa.me/${l.telefone}?text=${encodeURIComponent(config.mensagem)}`;
  const note = l.telefone.length === 12
    ? '<p class="note">Telefone fixo — se não abrir o WhatsApp, liga pra loja.</p>' : '';
  return `<div class="card">
  <h2>${esc(l.nome)}</h2>
  <p class="meta">${esc(l.cidade || '')} · ${pretty(l.telefone)}</p>
  ${note}
  <a class="btn" href="${link}" target="_blank" rel="noopener">Abrir conversa com texto pronto</a>
  <p class="hint">Ao abrir: <b>anexe a foto da campanha</b> (aqui em cima) e aperte enviar.</p>
</div>`;
}).join('\n');

const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const doc = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kit de Prospecção — RESSA Leads</title>
<style>
 body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#0a0a0b;color:#f5f5f4}
 header{max-width:560px;margin:0 auto;padding:26px 16px 6px}
 header .kicker{font-size:11.5px;letter-spacing:2px;color:#9c9ca3;font-weight:700;margin:0 0 8px}
 h1{margin:0;font-size:27px;font-weight:800;letter-spacing:-.5px}
 header p{color:#9c9ca3;font-size:14.5px;line-height:1.6;margin:10px 0 0}
 header img{max-width:100%;border-radius:18px;margin-top:14px;border:1px solid #26262b}
 main{max-width:560px;margin:0 auto;padding:12px 16px 28px}
 .card{background:#141417;border:1px solid #26262b;border-radius:20px;padding:18px;margin-bottom:12px}
 .card h2{margin:0 0 4px;font-size:18px;font-weight:800} .meta{color:#9c9ca3;margin:0 0 8px;font-size:14px}
 .note{color:#e8c476;font-size:14px} .hint{font-size:13.5px;color:#9c9ca3;line-height:1.55}
 .btn{display:block;text-align:center;background:#fff;color:#0a0a0b;font-weight:700;font-size:16.5px;
   padding:16px;border-radius:999px;text-decoration:none;margin:10px 0}
</style></head><body>
<header><p class="kicker">RESSA LEADS</p><h1>Kit de envio</h1>
<p>${leads.length} lojas · gerado em ${quando}<br>Ritmo sugerido: 5 por dia. Segure na foto pra salvar, anexe em cada conversa.</p>
<img src="${FOTO_URL}" alt="Foto da campanha"></header>
<main>${cards || '<p style="text-align:center;color:#9c9ca3">Fila vazia — busque mais lojas no painel.</p>'}</main>
</body></html>`;

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/kit.html', doc);

for (const l of leads) {
  await sql`update leads set status = 'kit' where id = ${l.id}`;
}
console.log('Kit publicado em docs/kit.html e leads marcados como kit.');
