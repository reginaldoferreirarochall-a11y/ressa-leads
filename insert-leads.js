// Insere leads extraídos (CSV do gosom) na base do Neon — Etapa 2 (base rica).
// Uso: node insert-leads.js results.csv [max]
// - Guarda nome, telefone, cidade, endereço, site, avaliação, nº de avaliações,
//   categoria, place_id, e-mail e link do Maps.
// - Telefone normalizado (55+DDD). Duplicado por telefone ENRIQUECE os dados
//   que faltam (não muda o status). Ao final, registra a CAMPANHA no banco.
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const file = process.argv[2] || 'results.csv';
const max = parseInt(process.argv[3] || '40', 10);
const NICHO = process.env.EXTRACT_NICHO || '';
const REGIAO = process.env.EXTRACT_REGIAO || '';
const QUERY = NICHO && REGIAO ? `${NICHO} em ${REGIAO}` : (process.env.EXTRACT_QUERY || '');

if (!fs.existsSync(file)) {
  console.log('Sem arquivo de resultados — nada a inserir.');
  process.exit(0);
}

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

function cidadeDoEndereco(endereco, fallback) {
  const m = String(endereco || '').match(/,\s*([^,–-]+?)\s*-\s*[A-Z]{2}\s*,/);
  if (m) return m[1].trim();
  return fallback ? fallback.replace(/\s+(SP|RJ|MG|PR|SC|RS|BA|GO|DF|ES|PE|CE|MA|PA|MT|MS|AL|SE|PI|RN|PB|RO|AC|AM|RR|AP|TO)\s*$/i, '').trim() : null;
}

const rows = parseCSV(fs.readFileSync(file, 'utf8'));
if (rows.length < 2) { console.log('CSV vazio ou só com cabeçalho.'); process.exit(0); }
const header = rows[0].map(h => String(h).trim().toLowerCase());
const col = (...names) => header.findIndex(h => names.includes(h));
const iNome = col('title', 'name', 'nome');
const iTel = col('phone', 'telefone', 'tel', 'phone_number');
const iEnd = col('complete_address', 'address', 'endereco');
const iSite = col('website', 'site');
const iNota = col('review_rating', 'rating');
const iQtdAval = col('review_count', 'reviews');
const iCat = col('category', 'categoria');
const iPlace = col('place_id');
const iEmail = col('emails', 'email');
const iLink = col('link', 'url');
console.log('Colunas encontradas:', header.join(' | '));
if (iTel === -1) { console.log('Nenhuma coluna de telefone no CSV — nada a inserir.'); process.exit(0); }

const val = (r, i) => (i >= 0 && r[i] != null ? String(r[i]).trim() : '');
const sql = neon(process.env.DATABASE_URL);
let inserted = 0, enriched = 0, invalid = 0, seen = 0;
const dataRows = rows.slice(1).filter(r => r.length > 1);

for (const r of dataRows) {
  if (seen >= max) break;
  const phone = normalizePhone(val(r, iTel));
  if (!phone) { invalid++; continue; }
  seen++;
  const nome = val(r, iNome) || 'Empresa';
  const endereco = val(r, iEnd) || null;
  const cidade = cidadeDoEndereco(endereco, REGIAO);
  const site = val(r, iSite) || null;
  const nota = parseFloat(val(r, iNota).replace(',', '.')) || null;
  const qtdAval = parseInt(val(r, iQtdAval), 10) || null;
  const categoria = val(r, iCat) || null;
  const placeId = val(r, iPlace) || null;
  const email = (val(r, iEmail).split(/[;,\s]+/).filter(Boolean)[0]) || null;
  const mapsLink = val(r, iLink) || null;

  const res = await sql`
    insert into leads (nome, telefone, cidade, endereco, site, avaliacao, avaliacoes, categoria, place_id, email, maps_link, status)
    values (${nome}, ${phone}, ${cidade}, ${endereco}, ${site}, ${nota}, ${qtdAval}, ${categoria}, ${placeId}, ${email}, ${mapsLink}, 'queued')
    on conflict (telefone) do update set
      endereco = coalesce(excluded.endereco, leads.endereco),
      site = coalesce(excluded.site, leads.site),
      avaliacao = coalesce(excluded.avaliacao, leads.avaliacao),
      avaliacoes = coalesce(excluded.avaliacoes, leads.avaliacoes),
      categoria = coalesce(excluded.categoria, leads.categoria),
      place_id = coalesce(leads.place_id, excluded.place_id),
      email = coalesce(excluded.email, leads.email),
      maps_link = coalesce(excluded.maps_link, leads.maps_link),
      cidade = coalesce(leads.cidade, excluded.cidade)
    returning (xmax = 0) as is_new`;
  if (res[0].is_new) { inserted++; console.log('Novo lead:', nome, phone); }
  else { enriched++; console.log('Já existia (dados enriquecidos):', nome, phone); }
}
const duplicados = enriched + invalid;
console.log(`Resumo da extração — inseridos: ${inserted} | duplicados/inválidos: ${duplicados}`);

try {
  await sql`insert into campaigns (nicho, regiao, query, encontrados, inseridos, duplicados)
    values (${NICHO || null}, ${REGIAO || null}, ${QUERY || null}, ${dataRows.length}, ${inserted}, ${duplicados})`;
  console.log('Campanha registrada no banco.');
} catch (e) {
  console.log('Aviso: não registrou a campanha (' + e.message + ') — rode a migração.');
}
