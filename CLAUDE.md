# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault ("Es una plataforma para jugar online y competir por la mayor cantidad de puntos") — a retro arcade portal built with Next.js (App Router), React 19, TypeScript, and Tailwind CSS v4. Currently just the create-next-app scaffold in `app/` — the real UI/UX has not been migrated in yet.

The project follows Spec Driven Design using the `/spec` and `/spec-impl` skills from https://github.com/Klerith/fernando-skills (install via `npx skills@latest add Klerith/fernando-skills`).

No test runner is configured yet.

## Styles
Always use the /frontend-desing to desing the UI.

## Architecture

- `app/` — Next.js App Router source (currently only the default scaffold: `layout.tsx`, `page.tsx`, `globals.css`).
- `templates/` — a standalone static HTML/JSX prototype of the actual product, **not** wired into the Next.js app. It's a plain-React (via unpkg CDN + in-browser Babel) SPA that serves as the design/behavior reference for building out the real `app/` routes. Open `templates/Arcade Vault.html` directly in a browser to see it run.
  - `data.jsx` — mock game catalog (id, title, category, cover, color theme, best score, plays).
  - `nav.jsx` — top navigation.
  - `biblioteca.jsx` — game library/browse screen.
  - `detalle.jsx` — game detail screen.
  - `reproductor.jsx` — game player screen (score submission).
  - `auth.jsx` — sign in/up.
  - `salon.jsx` — hall of fame / leaderboard.
  - `app.jsx` — root component wiring a hash-based router (`location.hash` as JSON route state) across the screens above, with user/session and scores persisted to `localStorage` (`av_user`, `av_scores`).
  - `styles.css` — shared neon/retro visual language (CSS custom properties like `--line`, `--ink-faint`, `--mono`) that any migrated Tailwind styling should match.

When implementing real routes/pages under `app/`, treat `templates/` as the source of truth for screens, routing states, and data shapes, translating the hash-router/localStorage prototype into proper Next.js routes and (eventually) real persistence.

## Important: non-standard Next.js version

Per `AGENTS.md`: this repo pins a Next.js version that may have breaking changes relative to your training data. Before writing Next.js-specific code (routing, data fetching, config, etc.), check `node_modules/next/dist/docs/` (organized as `01-app`, `02-pages`, `03-architecture`, `04-community`) for the current APIs and any deprecation notices rather than assuming prior knowledge.
