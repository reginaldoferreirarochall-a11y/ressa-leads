// Insere leads extraídos (CSV do gosom/google-maps-scraper) na fila do Neon.
// Uso: node insert-leads.js results.csv [max]
// - Normaliza o telefone para o formato 55 + DDD + número.
// - Ignora duplicados (telefone é UNIQUE no banco) e linhas sem telefone válido.
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

const file = process.argv[2] || 'results.csv';
const max = parseInt(process.argv[3] || '40', 10);

if (!fs.existsSync(file)) {
  console.log('Sem arquivo de resultados — nada a inserir.');
  process.exit(0);
}

// Parser CSV simples com suporte a campos entre aspas.
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  return '55' + d;
}

(async () => {
  const rows = parseCSV(fs.readFileSync(file, 'utf8'));
  if (rows.length < 2) { console.log('CSV vazio ou só com cabeçalho.'); return; }
  const header = rows[0].map(h => String(h).trim().toLowerCase());
  const nameIdx = header.findIndex(h => ['name', 'title', 'nome'].includes(h));
  const phoneIdx = header.findIndex(h => ['phone', 'telefone', 'tel', 'phone_number'].includes(h));
  console.log('Colunas encontradas:', header.join(' | '));
  if (phoneIdx === -1) { console.log('Nenhuma coluna de telefone no CSV — nada a inserir.'); return; }

  const sql = neon(process.env.DATABASE_URL);
  let inserted = 0, skipped = 0, seen = 0;
  for (const r of rows.slice(1)) {
    if (seen >= max) break;
    const phone = normalizePhone(r[phoneIdx]);
    if (!phone) { skipped++; continue; }
    seen++;
    const name = (nameIdx >= 0 && r[nameIdx] ? String(r[nameIdx]).trim() : '') || 'Vidraçaria';
    const res = await sql`insert into leads (nome, telefone, status) values (${name}, ${phone}, 'queued') on conflict (telefone) do nothing returning id`;
    if (res.length) { inserted++; console.log('Novo lead:', name, phone); }
    else skipped++;
  }
  console.log(`Resumo da extração — inseridos: ${inserted} | duplicados/inválidos: ${skipped}`);
})().catch(e => { console.error('Erro ao inserir leads:', e.message); process.exit(1); });
