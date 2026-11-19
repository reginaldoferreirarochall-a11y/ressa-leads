// Gera a PÁGINA DE LEADS (docs/leads.html) a partir do Neon — Etapa 2 (base rica).
// Mostra contadores por status e os cartões completos de cada empresa.
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const leads = await sql`select id, nome, telefone, cidade, endereco, site, avaliacao, avaliacoes,
  categoria, email, maps_link, status, created_at
  from leads order by status, created_at`;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pretty = (t) => (t.length === 13 ? `(${t.slice(2, 4)}) ${t.slice(4, 9)}-${t.slice(9)}`
  : t.length === 12 ? `(${t.slice(2, 4)}) ${t.slice(4, 8)}-${t.slice(8)}` : t);
const LABEL = { queued: 'Na fila', kit: 'No kit', sent: 'Enviado', replied: 'Respondeu', links_sent: 'Recebeu links', hold: 'Travado', invalid: 'Sem WhatsApp' };

const counts = {};
for (const l of leads) counts[l.status] = (counts[l.status] || 0) + 1;
const summary = Object.entries(counts).map(([s, c]) => `${LABEL[s] || s}: <b>${c}</b>`).join(' · ');

const cards = leads.map((l) => {
  const bits = [];
  if (l.avaliacao) bits.push(`Nota ${esc(l.avaliacao)}${l.avaliacoes ? ` (${esc(l.avaliacoes)} avaliações)` : ''}`);
  if (l.categoria) bits.push(esc(l.categoria));
  if (l.endereco) bits.push(esc(l.endereco));
  if (l.email) bits.push(esc(l.email));
  const links = [`<a class="btn" href="https://wa.me/${l.telefone}" target="_blank" rel="noopener">WhatsApp</a>`];
  if (l.site) links.push(`<a class="btn alt" href="${esc(l.site.startsWith('http') ? l.site : 'https://' + l.site)}" target="_blank" rel="noopener">Site</a>`);
  if (l.maps_link) links.push(`<a class="btn alt" href="${esc(l.maps_link)}" target="_blank" rel="noopener">Maps</a>`);
  return `<div class="card">
  <h2>${esc(l.nome)}</h2>
  <p class="meta">${esc(l.cidade || '')} · ${pretty(l.telefone)} · ${LABEL[l.status] || esc(l.status)}</p>
  ${bits.length ? `<p class="meta">${bits.join('<br>')}</p>` : ''}
  <div class="row">${links.join('')}</div>
</div>`;
}).join('\n');

const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const doc = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Leads capturados — RESSA Leads</title>
<style>
 body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#0a0a0b;color:#f5f5f4}
 header{max-width:560px;margin:0 auto;padding:26px 16px 6px}
 header .kicker{font-size:11.5px;letter-spacing:2px;color:#9c9ca3;font-weight:700;margin:0 0 8px}
 h1{margin:0;font-size:27px;font-weight:800;letter-spacing:-.5px}
 header p{color:#9c9ca3;font-size:14px;line-height:1.65;margin:10px 0 0}
 header p b{color:#f5f5f4}
 main{max-width:560px;margin:0 auto;padding:12px 16px 28px}
 .card{background:#141417;border:1px solid #26262b;border-radius:20px;padding:18px;margin-bottom:12px}
 .card h2{margin:0 0 4px;font-size:17.5px;font-weight:800}
 .meta{color:#9c9ca3;margin:0 0 6px;font-size:14px;line-height:1.6}
 .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
 .btn{flex:1;text-align:center;background:#fff;color:#0a0a0b;font-weight:700;font-size:15px;
   padding:13px;border-radius:999px;text-decoration:none;min-width:100px}
 .btn.alt{background:transparent;color:#f5f5f4;border:1px solid #3a3a41}
</style></head><body>
<header><p class="kicker">RESSA LEADS</p><h1>Suas lojas</h1>
<p>Total: <b>${leads.length}</b> · ${summary}<br>Atualizado em ${quando}</p></header>
<main>${cards || '<p style="text-align:center;color:#9c9ca3">Nenhuma loja ainda — busque lojas novas no painel.</p>'}</main>
</body></html>`;

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/leads.html', doc);
console.log(`Página de leads publicada com ${leads.length} registros.`);
