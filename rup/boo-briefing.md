# Boo — Project Briefing

**Date:** 2026-03-07  
**Status:** Iteration 1 complete · Iteration 2 in progress

---

## O que é o Boo

Boo é um **ghost developer** — um sistema que aprende o estilo de código de um engenheiro específico e gera pull requests indistinguíveis do seu trabalho orgânico.

A entrada é um issue + contexto do codebase em Markdown. A saída é uma sequência ordenada de commits com diffs reais, timestamps distribuídos de forma realista, e uma PR aberta em draft no GitHub no horário de overlap com a empresa-alvo.

---

## O problema que resolve

Engenheiros sênior em múltiplos projetos enfrentam duas tensões:

**1. Execution gap** — tarefas bem compreendidas consomem tempo de execução mecânica que poderia ser delegado. Ferramentas de codegen existentes geram código genérico, não código *seu*.

**2. Identity gap** — o histórico git de um dev é uma identidade intelectual. A ordem dos commits, a granularidade, o estilo das mensagens — tudo isso é reconhecível por colaboradores. Nenhuma ferramenta atual preserva esse fingerprint.

---

## Como funciona

```
Issue (Markdown)
    ↓
Claude Opus + fingerprint prompt
    ↓
Commits ordenados + diffs (JSON)
    ↓
Developer review + aprovação
    ↓
post_processor.rb → timestamps realistas
    ↓
deploy.sh → git apply + git commit --date + gh pr create --draft
    ↓
PR no GitHub com histórico autêntico
```

O loop de qualidade inclui auto-avaliação: o modelo pontua seu próprio output contra o rubric do fingerprint e regenera commits problemáticos antes da aprovação humana.

---

## Fingerprint

O coração do Boo. Cada developer tem um perfil com **14 dimensões de código** e **7 dimensões de escrita**:

**Código:** commit_density, commit_size, files_per_commit, test_ratio, commit_order, refactor_frequency, docs_discipline, magic_numbers, message_style, message_length, comment_style, wip_tolerance, fix_after_feat_ratio, delta_time

**Escrita:** comment_length, emoji_usage, review_response_style, pushback_style, acknowledgment, pr_description_style, sign_off

Dois perfis implementados: **Rafael Uchôa** (TDD, atomic, conventional commits) e **Jordan "Ship It" Casey** (fat commits, informal, burst pattern).

---

## Stack

| Componente | Tecnologia |
|---|---|
| UI | React JSX (single-file artifact, Claude.ai) |
| LLM | Claude Opus 4 via Anthropic API |
| Post-processor | Ruby (stdlib only) |
| Deploy | Bash + git + GitHub CLI |
| Scheduling (opcional) | OpenClaw local agent |

Local-first. Nenhum dado armazenado em cloud. Nenhum servidor.

---

## Qualidade — Benchmark atual

O output é avaliado em 5 dimensões (commit order 30%, granularity 20%, messages 20%, design 20%, tests 10%).

| Melhor resultado | Score |
|---|---|
| Opus após self-eval loop (issue #67, Rafael) | **9.5/10** |
| Referência humana (issue #42, Rafael) | 8.5/10 |
| Melhor Jordan (Modelo A, issue #42) | 9.0/10 |

Target: ≥ 8.0 Rafael, ≥ 8.5 Jordan.

---

## Status por iteração

| # | Tema | Status |
|---|---|---|
| 1 | Fingerprint + benchmark | ✅ Completo |
| 2 | JSON estruturado + git apply | 🔄 Em andamento |
| 3 | Deploy + scheduling | 📋 Planejado |
| 4 | Review response | 📋 Planejado |
| 5 | OpenClaw integration | 📋 Planejado |
| 6 | Fingerprint learning (auto-extract de git history) | 📋 Planejado |

---

## Artefatos produzidos

- `boo-app.jsx` — UI completa (input Markdown → visualização de commits → export)
- `boo-prompt-simulation.md` — 10 blocos de prompt copy-paste (geração, avaliação, schedule, review, PR)
- `post_processor.rb` — distribuição de timestamps (Normal/burst, past/schedule modes)
- `deploy.sh` — git apply + commit --date + gh pr create
- 9 documentos RUP: Vision, Use Cases, Requirements, Domain Model, SAD, Iteration Plan, Deployment Model, Test Plan, Glossary

---

## Próximos passos imediatos

1. Validar `git apply --check` nos diffs gerados pelo Opus (issue #67)
2. Rodar `post_processor.rb` em modo past e verificar `git log` resultante
3. Testar `--schedule` com uma janela EST e confirmar timestamps dentro da janela
4. Adicionar perfil Rafael ao PROFILES do post_processor com distribuição Normal calibrada
