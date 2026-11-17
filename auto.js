// COLETAS AUTOMÁTICAS — roda as buscas do agenda.json em sequência.
// Cada busca: gosom (Docker) → insert-leads.js (que registra a campanha).
// Uma busca que falha NÃO derruba as outras; ela entra de novo na próxima rodada.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const agenda = JSON.parse(fs.readFileSync('agenda.json', 'utf8'));
const buscas = agenda.buscas || [];
console.log(`Agenda com ${buscas.length} buscas.`);

let ok = 0, falhas = 0;
for (const b of buscas) {
  const query = `${b.nicho} em ${b.regiao}`;
  console.log(`\n=== Coleta automática: ${query} (até ${b.qtd || 40}) ===`);
  try {
    fs.writeFileSync('queries.txt', query + '\n');
    execSync('docker run --rm -v "$PWD:/work" -w /work gosom/google-maps-scraper:latest -input queries.txt -results results.csv -depth 1',
      { stdio: 'inherit', shell: '/bin/bash', timeout: 15 * 60 * 1000 });
    execSync(`node insert-leads.js results.csv "${b.qtd || 40}"`, {
      stdio: 'inherit',
      env: { ...process.env, EXTRACT_NICHO: b.nicho, EXTRACT_REGIAO: b.regiao },
      timeout: 5 * 60 * 1000
    });
    ok++;
  } catch (e) {
    falhas++;
    console.log(`FALHOU esta busca (segue pras próximas): ${query} — ${e.message}`);
  }
}
console.log(`\nRodada automática concluída: ${ok} ok, ${falhas} falhas.`);
