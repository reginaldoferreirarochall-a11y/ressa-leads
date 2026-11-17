// Gera a PÁGINA DE LEADS (docs/leads.html) a partir do Neon — 100% código.
// Mostra os contadores por status e a lista completa de lojas capturadas.
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const leads = await sql`select id, nome, telefone, cidade, status, sent_at, created_at
  from leads order by status, created_at`;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pretty = (t) => (t.length === 13 ? `(${t.slice(2, 4)}) ${t.slice(4, 9)}-${t.slice(9)}`
  : t.length === 12 ? `(${t.slice(2, 4)}) ${t.slice(4, 8)}-${t.slice(8)}` : t);
const LABEL = { queued: '🟢 Na fila', kit: '📋 No kit', sent: '✅ Enviado', replied: '💬 Respondeu', links_sent: '🔗 Recebeu links', hold: '⏸️ Travado', invalid: '🚫 Sem WhatsApp' };

const counts = {};
for (const l of leads) counts[l.status] = (counts[l.status] || 0) + 1;
const summary = Object.entries(counts).map(([s, c]) => `${LABEL[s] || s}: <b>${c}</b>`).join(' · ');

const cards = leads.map((l) => `<div class="card">
  <h2>${esc(l.nome)}</h2>
  <p class="meta">${esc(l.cidade || '')} · ${pretty(l.telefone)} · ${LABEL[l.status] || esc(l.status)}</p>
  <a class="btn" href="https://wa.me/${l.telefone}" target="_blank" rel="noopener">💬 Abrir conversa</a>
</div>`).join('\n');

const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const doc = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Leads capturados — RESSA</title>
<style>
 body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#0a0a0e;color:#f4f4ec}
 header{padding:20px 16px 4px;text-align:center} h1{margin:0;font-size:23px}
 header p{opacity:.85;font-size:14px;line-height:1.6}
 main{max-width:520px;margin:0 auto;padding:12px}
 .card{background:#17171e;border:1px solid #2a2a33;border-radius:16px;padding:14px 16px;margin-bottom:12px}
 .card h2{margin:0 0 4px;font-size:17px} .meta{opacity:.85;margin:0;font-size:14px;line-height:1.5}
 .btn{display:block;text-align:center;background:#c9f24e;color:#0c0c10;font-weight:800;font-size:15px;
   padding:12px;border-radius:12px;text-decoration:none;margin-top:10px}
</style></head><body>
<header><h1>👀 Leads capturados</h1>
<p>Total: <b>${leads.length}</b> · ${summary}<br>Atualizado em ${quando}</p></header>
<main>${cards || '<p style="text-align:center">Nenhum lead ainda — rode o extrator no painel.</p>'}</main>
</body></html>`;

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/leads.html', doc);
console.log(`Página de leads publicada com ${leads.length} registros.`);
