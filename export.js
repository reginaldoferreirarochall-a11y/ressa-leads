// Exporta a base inteira para CSV (docs/leads.csv) — download pelo painel.
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const leads = await sql`select nome, telefone, cidade, endereco, site, avaliacao, avaliacoes,
  categoria, email, maps_link, status, created_at from leads order by cidade, nome`;

const q = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const header = 'nome,telefone,cidade,endereco,site,avaliacao,avaliacoes,categoria,email,maps_link,status,capturado_em';
const lines = leads.map(l => [l.nome, l.telefone, l.cidade, l.endereco, l.site, l.avaliacao, l.avaliacoes,
  l.categoria, l.email, l.maps_link, l.status,
  l.created_at ? new Date(l.created_at).toISOString() : ''].map(q).join(','));

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/leads.csv', '﻿' + header + '\n' + lines.join('\n') + '\n');
console.log(`CSV exportado com ${leads.length} leads.`);
