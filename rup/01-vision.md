# Boo — Vision Document

**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Draft  

---

## 1. Introduction

### 1.1 Purpose

This document defines the vision for **Boo**, a ghost developer system that learns a software engineer's individual coding style from their GitHub history and generates pull requests that authentically replicate that style — including commit order, granularity, message conventions, and design decisions.

### 1.2 Scope

Boo operates as a local tool integrated into the developer's existing Git workflow. It does not replace the developer's judgment; it executes approved plans in the developer's voice.

### 1.3 Definitions

See Glossary (09-glossary.md) for terms including *fingerprint*, *ghost dev*, *delta_time*, and *unified diff*.

---

## 2. Problem Statement

Senior engineers working across multiple client engagements, open-source projects, or freelance platforms face a recurring tension: high-quality work requires focused, uninterrupted time, but repository activity signals — commit frequency, PR cadence, review responsiveness — are often proxies for engagement and productivity in distributed teams.

Additionally, a developer's Git history is a form of intellectual identity. Two engineers solving the same problem will produce structurally different commit sequences. This temporal and stylistic fingerprint is rarely documented, yet it is immediately recognizable to collaborators.

Boo addresses both concerns:

1. **Execution gap:** given an approved plan, Boo generates and schedules the commits, freeing the developer from mechanical implementation of well-understood tasks.
2. **Identity gap:** generated commits are indistinguishable from the developer's organic output in style, order, and cadence.

---

## 3. Stakeholders

| Stakeholder | Role | Interest |
|---|---|---|
| Rafael Uchôa | Primary user / developer | Delegates mechanical implementation; maintains identity |
| Client / employer | Indirect | Receives consistent, high-quality PRs |
| Reviewers | Indirect | Reviews PRs that match expected style |
| OpenClaw runtime | System | Executes scheduled commits and opens PRs |

---

## 4. Product Overview

### 4.1 Product Perspective

Boo is a local automation layer sitting between the developer's decision-making and the Git repository. It integrates with:

- **Claude API (Opus)** — LLM backbone for commit generation
- **OpenClaw** — local agent runtime for scheduling and execution
- **GitHub CLI (`gh`)** — PR creation and review interaction
- **Git** — commit application with `--date` override

### 4.2 Product Position Statement

For senior engineers who manage multiple concurrent projects, Boo is a ghost developer tool that generates authentic, style-faithful pull requests from approved issue plans — unlike generic code generation tools that produce output with no stylistic continuity.

### 4.3 Key Capabilities

| Capability | Description |
|---|---|
| Fingerprint ingestion | Learns commit style from GitHub history |
| Commit generation | Produces ordered commits with unified diffs via LLM |
| Self-evaluation | Model scores its own output against the fingerprint rubric |
| Timestamp distribution | Distributes commits across a realistic work session |
| Deploy scheduling | Schedules PRs to open during target timezone overlap window |
| Review response | Generates inline review replies and fix commits in developer's voice |
| PR description | Generates PR body matching developer's writing style |

---

## 5. Product Features

### F-01: Fingerprint Profile
Extract and encode a developer's commit style into a structured profile covering 14+ code dimensions and 7 writing dimensions.

### F-02: Commit Plan Generation
Given an issue and codebase context in Markdown, generate an ordered commit sequence with unified diffs via Claude Opus.

### F-03: Structured JSON Output
Return commits as a validated JSON schema consumable by the post-processor.

### F-04: Self-Evaluation Loop
Prompt the model to score its own output against the fingerprint rubric; optionally regenerate failing commits.

### F-05: Timestamp Post-Processor
Distribute commit timestamps using profile-aware distributions (Normal for Rafael, burst-exponential for Jordan).

### F-06: Deploy Scheduler
Reschedule commits into a future timezone overlap window; enforce D+1 minimum delay.

### F-07: Git Application
Apply diffs and commits with `--date` override via `git apply` + `git commit`.

### F-08: Draft PR Opening
Push branch and open GitHub draft PR via `gh pr create --draft`.

### F-09: Review Response Generation
Generate per-comment replies and atomic fix commits from review feedback.

### F-10: Export
Export commit plan as `.json` or `.md` from the Boo web UI.

---

## 6. Constraints

- All execution is local — no cloud storage of code or diffs
- LLM calls require Anthropic API key (Claude Opus)
- GitHub CLI must be authenticated
- Scheduling never targets the current calendar day
- No regeneration after export (plan is immutable once approved)

---

## 7. Quality Attributes

| Attribute | Target |
|---|---|
| Fingerprint fidelity | ≥ 8.5/10 on benchmark rubric |
| Diff applicability | 100% `git apply --check` pass rate before commit |
| Schedule accuracy | All commits within target timezone window |
| Export completeness | JSON output parseable by post-processor without modification |
