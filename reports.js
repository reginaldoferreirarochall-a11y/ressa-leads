// Gera a PÁGINA DE RELATÓRIOS (docs/reports.html) a partir do Neon.
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const [tot] = await sql`select count(*)::int as total,
  count(email)::int as com_email, count(site)::int as com_site,
  count(endereco)::int as com_endereco from leads`;
const porStatus = await sql`select status, count(*)::int as n from leads group by status order by n desc`;
const porCidade = await sql`select coalesce(cidade, '(sem cidade)') as cidade, count(*)::int as n
  from leads group by 1 order by n desc limit 20`;
const porCategoria = await sql`select coalesce(categoria, '(sem categoria)') as categoria, count(*)::int as n
  from leads group by 1 order by n desc limit 20`;
let campTot = { coletas: 0, encontrados: 0, novos: 0 };
try {
  const [c] = await sql`select count(*)::int as coletas, coalesce(sum(encontrados),0)::int as encontrados,
    coalesce(sum(inseridos),0)::int as novos from campaigns`;
  campTot = c;
} catch (e) { /* campaigns ainda não existe */ }

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LABEL = { queued: '🟢 Na fila', kit: '📋 No kit', sent: '✅ Enviado', replied: '💬 Respondeu', links_sent: '🔗 Recebeu links', hold: '⏸️ Travado', invalid: '🚫 Sem WhatsApp' };
const barras = (rows, labelFn) => {
  const max = Math.max(1, ...rows.map(r => r.n));
  return rows.map(r => `<div class="bar-row">
    <span class="bar-label">${labelFn(r)}</span>
    <span class="bar-track"><span class="bar-fill" style="width:${Math.round((r.n / max) * 100)}%"></span></span>
    <b>${esc(r.n)}</b></div>`).join('\n');
};

const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const doc = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatórios — RESSA Leads</title>
<style>
 body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#0a0a0e;color:#f4f4ec}
 header{padding:20px 16px 4px;text-align:center} h1{margin:0;font-size:23px}
 header p{opacity:.85;font-size:14px}
 main{max-width:520px;margin:0 auto;padding:12px}
 .card{background:#17171e;border:1px solid #2a2a33;border-radius:16px;padding:16px;margin-bottom:14px}
 .card h2{margin:0 0 12px;font-size:17px}
 .nums{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .num{background:#1f1f27;border-radius:14px;padding:14px;text-align:center}
 .num b{display:block;font-size:26px;color:#c9f24e}
 .num span{font-size:13px;opacity:.8}
 .bar-row{display:flex;align-items:center;gap:10px;margin:8px 0;font-size:14px}
 .bar-label{flex:0 0 42%;line-height:1.3}
 .bar-track{flex:1;background:#1f1f27;border-radius:8px;height:14px;overflow:hidden}
 .bar-fill{display:block;height:100%;background:#c9f24e;border-radius:8px}
</style></head><body>
<header><h1>📈 Relatórios</h1><p>Atualizado em ${quando}</p></header>
<main>
 <div class="card"><h2>Base de leads</h2><div class="nums">
   <div class="num"><b>${tot.total}</b><span>empresas</span></div>
   <div class="num"><b>${tot.com_email}</b><span>com e-mail</span></div>
   <div class="num"><b>${tot.com_site}</b><span>com site</span></div>
   <div class="num"><b>${tot.com_endereco}</b><span>com endereço</span></div>
 </div></div>
 <div class="card"><h2>Por situação</h2>${barras(porStatus, r => LABEL[r.status] || esc(r.status))}</div>
 <div class="card"><h2>Por cidade</h2>${barras(porCidade, r => esc(r.cidade))}</div>
 <div class="card"><h2>Por categoria</h2>${barras(porCategoria, r => esc(r.categoria))}</div>
 <div class="card"><h2>Coletas</h2><div class="nums">
   <div class="num"><b>${campTot.coletas}</b><span>campanhas</span></div>
   <div class="num"><b>${campTot.encontrados}</b><span>encontrados</span></div>
   <div class="num"><b>${campTot.novos}</b><span>novos inseridos</span></div>
 </div></div>
</main></body></html>`;

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/reports.html', doc);
console.log('Relatórios publicados:', JSON.stringify(tot));
