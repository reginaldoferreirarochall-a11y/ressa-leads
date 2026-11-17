# RESSA Leads — Central de Prospecção

Sistema de prospecção da Ponto AlumiGlass: captura de empresas no Google Maps,
base de leads no Neon e dashboard de controle pelo celular.

## Como funciona

1. **Extrair** — no dashboard, você define nicho + região + quantidade; o robô
   busca no Google Maps (gosom/google-maps-scraper) e lança os leads no banco.
2. **Base de leads** — tudo fica no Neon, visível e editável pelo dashboard.
3. **Montagem** — a mensagem e a foto da campanha ficam no `config.json` e na
   `foto.jpg`, editáveis pelo dashboard (aba Mensagem).
4. **Envio** — o kit de envio é gerado por código a partir da base + config.

## Estrutura

- `docs/` — o dashboard (GitHub Pages)
- `.github/workflows/` — os robôs (extrair, kit, lista, admin)
- `config.json` — mensagem e foto atuais da campanha
- `foto.jpg` — foto atual da campanha
