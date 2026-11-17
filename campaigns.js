// Gera a PÁGINA DE CAMPANHAS (docs/campaigns.html): histórico das coletas.
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
let camps = [];
try {
  camps = await sql`select id, nicho, regiao, query, encontrados, inseridos, duplicados, created_at
    from campaigns order by created_at desc limit 100`;
} catch (e) {
  console.log('Tabela campaigns ainda não existe — rode a migração.');
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cards = camps.map((c) => `<div class="card">
  <h2>${esc(c.query || (c.nicho + ' em ' + c.regiao))}</h2>
  <p class="meta">${new Date(c.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}<br>
  🔍 Encontrados: <b>${esc(c.encontrados)}</b> · 🆕 Novos: <b>${esc(c.inseridos)}</b> · ♻️ Duplicados/inválidos: <b>${esc(c.duplicados)}</b></p>
</div>`).join('\n');

const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const doc = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Campanhas — RESSA Leads</title>
<style>
 body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#0a0a0e;color:#f4f4ec}
 header{padding:20px 16px 4px;text-align:center} h1{margin:0;font-size:23px}
 header p{opacity:.85;font-size:14px;line-height:1.6}
 main{max-width:520px;margin:0 auto;padding:12px}
 .card{background:#17171e;border:1px solid #2a2a33;border-radius:16px;padding:14px 16px;margin-bottom:12px}
 .card h2{margin:0 0 4px;font-size:17px} .meta{opacity:.85;margin:0;font-size:14px;line-height:1.55}
</style></head><body>
<header><h1>📊 Campanhas de coleta</h1>
<p>Total de coletas: <b>${camps.length}</b> · Atualizado em ${quando}</p></header>
<main>${cards || '<p style="text-align:center">Nenhuma campanha registrada ainda — faça uma extração.</p>'}</main>
</body></html>`;

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/campaigns.html', doc);
console.log(`Página de campanhas publicada com ${camps.length} registros.`);
