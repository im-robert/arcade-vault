---
name: spec-impl-game
description: Implements an approved spec for a new game, exactly like /spec-impl, and when implementation finishes, automatically runs the skin-designer agent and then the mobile-porter agent, one after the other (never in parallel).
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementer of approved game specs + automatic skin/mobile follow-up

This command is `/spec-impl` with one addition: once the spec implementation finishes and its
acceptance criteria are verified, it **must** trigger two agents, strictly in sequence (never in
parallel):

1. `@skin-designer` — verifies/implements the neon, retro and classic skins for the game that was
   just implemented.
2. `@mobile-porter` — only after `skin-designer` has fully finished, audits/implements the touch
   ergonomics of the player route for that same game.

Everything in Phases 1–4 below is identical to `/spec-impl`. Do not skip Phase 5.

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Instructions

Follow these five phases in strict order. **Do not advance to the next phase if the previous one
did not complete correctly.**

---

### Phase 1 — Identify the spec

The received argument is: `$ARGUMENTS`

If `$ARGUMENTS` is empty:

- List the files available in `specs/` (you already have them above).
- Ask the user to specify the exact name of the spec.
- Stop and wait for an answer. Do not continue.

If `$ARGUMENTS` has a value:

- Look for the file in `specs/`. The user may have written the full name (`09-nombre-juego`), only
  the number (`09`), or only the slug (`nombre-juego`). Try to find the correct file in any of
  those cases.
- If you do not find the file, show the available specs and ask the user to correct the name.
- If you do find it, continue to Phase 2.

This command is meant for specs that introduce or rework a **game** (a new engine, a new entry in
the catalog, or a significant change to an existing engine). While reading the spec in Phase 2,
identify and remember the **game id/title** the spec is about (from the objective, scope, or a
`games` table row it references) — you will need it verbatim in Phase 5 to hand off to
`skin-designer` and `mobile-porter`. If the spec is not about a specific game (e.g. it's a
cross-cutting or infra spec), tell the user this command expects a game-specific spec and ask
whether to continue anyway without the Phase 5 handoff, or use plain `/spec-impl` instead.

---

### Phase 2 — Validate the spec's state

Read the spec file you located in Phase 1 using the Read tool or `cat`.

In the file's contents, look for the line that contains the spec's state. The header label is
typically `**Status:**` (English) or `**Estado:**` (Spanish), but it may use any language. Match by
position (status line near the top of the spec) and by the surrounding state machine, not by the
exact label.

**Absolute rule:** You can only continue if the state **means "Approved"** — regardless of the
language used.

Treat any of the following (and their equivalents in other languages) as the **Approved** state and
continue:

- English: `Approved`
- Spanish: `Aprobado`
- Portuguese: `Aprovado`
- French: `Approuvé`
- German: `Genehmigt`
- Italian: `Approvato`
- …or any other language's word that clearly means "approved"

Anything else (Draft / Borrador, In review / En revisión, Implemented / Implementado, Obsolete /
Obsoleto, or any unrecognized value) means **stop** and show the error message below.

| State category                            | Examples (any language)                           | Action                                                                     |
| ----------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Approved                                  | `Approved`, `Aprobado`, `Aprovado`, `Approuvé`, … | Continue to Phase 3.                                                       |
| Draft                                     | `Draft`, `Borrador`, …                            | Stop. Show the error message below.                                        |
| In review                                 | `In review`, `En revisión`, …                     | Stop. Show the error message below.                                        |
| Implemented                               | `Implemented`, `Implementado`, …                  | Stop. Show the error message below.                                        |
| Obsolete                                  | `Obsolete`, `Obsoleto`, …                         | Stop. Show the error message below.                                        |
| State line not found / unrecognized value | —                                                 | Stop. The file does not follow the expected format. Tell this to the user. |

If you are unsure whether a value means "approved", **do not assume**. Stop and ask the user to
clarify or to update the spec to the canonical wording.

**Standard error message when the state does not mean Approved:**

```
❌ I cannot implement this spec.

Current state: [STATE FOUND]
I only work with specs whose state means "Approved" (e.g. `Approved`, `Aprobado`,
or the equivalent in another language).

To continue you have two options:
  1. If the spec is ready to be implemented, open it and change the state
     to "Approved" (or the equivalent term your team uses) manually.
     That change is made by the human, not the agent.
  2. If the spec still needs work, use /spec [name] to resume it.
```

Do not offer alternatives, do not suggest "I can still start if you want". The block is
intentional.

---

### Phase 3 — Create the git branch and switch to it

Once you have confirmed the state means `Approved`:

0. **Check the working tree first.** Look at the `git status --short` output in the session
   context above. If it is **not empty**, stop and show the pending changes, then ask:

   ```
   ⚠️ There are uncommitted changes in the working tree.
   Switching branches would carry them over. What do you want to do?
     1. Commit or stash them yourself, then re-run this command  (recommended)
     2. Continue anyway — the changes travel to the new branch
   ```

   Wait for the answer. **Do not stash or commit on the user's behalf** unless they explicitly ask
   for it. If the working tree is clean, skip straight to step 1 without mentioning it.

1. Derive the branch name from the spec file's full name, without the extension. Format:
   `spec-NN-slug`. Examples:

   - `09-nombre-juego.md` → branch `spec-09-nombre-juego`

2. Read the `AutoCreateBranch` flag from the **Branch-creation config** shown in the session
   context above.

   - If the config file does not exist, the value is missing, or the value is unrecognized → treat
     it as `true` (the default).
   - Only an explicit `false` (in any capitalization) disables automatic branch creation.

   **If `AutoCreateBranch` is `true` (default):** proceed without asking.

   - If the branch **does not exist**: create it with `git checkout -b spec-NN-slug`.
   - If it **already exists**: this means previous work is being resumed. Switch to it, read
     `git log --oneline` on the branch, and tell the user which steps of the plan already look done
     and which step you propose to resume from. Wait for confirmation on the resume point before
     implementing anything.
   - In both cases: switch to the branch with `git checkout spec-NN-slug` and confirm the change
     was successful before continuing.

   **If `AutoCreateBranch` is `false`:** ask before touching git. Show:

   ```
   AutoCreateBranch is set to false.
   Create and switch to the branch spec-NN-slug? [y/N]
   ```

   - If the user answers **yes**: create/switch to the branch exactly as in the `true` case above.
   - If the user answers **no** or leaves it empty: **do not create any branch.** Tell the user you
     will implement on the current branch (the one shown in the session context above) and ask for
     explicit confirmation to continue there. Do not improvise — wait for the answer.

3. Visually confirm to the user the spec is ready and which branch is active:

   ```
   ✅ Ready to implement.

   Spec:   specs/NN-slug.md
   Branch: spec-NN-slug  (active)   (← or the current branch, if no new branch was created)
   State:  Approved   (← echo back the actual value found in the spec)
   Game:   <game id/title identified in Phase 1>
   ```

4. **Do not start implementing yet.** First show the spec summary to the user so they have it
   fresh. Extract and show:
   - The **objective** (the line after `**Objective:**` / `**Objetivo:**` / equivalent label).
   - The **scope** (the `## Scope` / `## Alcance` / equivalent section).
   - The **implementation plan** (the section with the numbered steps —
     `## Implementation plan` / `## Plan de implementación` / equivalent).
   - The **acceptance criteria** (the checklist — `## Acceptance criteria` /
     `## Criterios de aceptación` / equivalent).

Match section headings by meaning, not by exact wording — the spec may be authored in any
language.

---

### Phase 4 — Implement step by step

After showing the spec summary, tell the user:

```
I am going to implement the spec following the implementation plan exactly.
I will pause after each step so you can review the diff.

Shall we start with Step 1?
```

Wait for explicit confirmation ("yes", "go ahead", "go", or equivalent). Do not start without it.

Once confirmed, follow these rules during the entire implementation:

**Never commit automatically.** Not per step, not at the end. You write the code and show the
diff; committing is the user's decision and the user's command. Only commit if they explicitly ask
you to.

**One rule above all:** implement what the spec says. If something in the spec looks suboptimal to
you, mention it as an observation but implement what was agreed. Changes to the spec go into the
spec, not into the code by surprise.

**Work rhythm:**

- Implement one step of the plan.
- Show a summary of which files you touched and what you did.
- Say: `Step N completed. Could you review the diff and let me know if I continue with Step N+1?`
- Wait for confirmation before continuing.

**If during the implementation you find an ambiguity** the spec does not resolve:

- Stop.
- Describe the ambiguity exactly.
- Present two or three concrete options.
- Wait for the user's decision.
- Do not improvise.

**If the user asks for something that is out of the spec's scope:**

- Remind them that it is out of this spec's scope.
- Suggest noting it down for the next spec.
- Do not implement it on this branch.

**When finishing the last step:**

```
✅ All steps of the plan are implemented.

Next: verify the spec's acceptance criteria one by one.
```

Verify each acceptance criterion explicitly with the user (or by inspection where you can, e.g.
`npm run build` / `npm run lint`). Do not proceed to Phase 5 until the criteria are confirmed to
pass. If a criterion fails, go back and fix it before continuing.

Once verified, tell the user to update the spec's state to "Implemented" (or the equivalent) and
that the final commit before merging is theirs to make — you still don't commit automatically.

---

### Phase 5 — Automatic skin + mobile follow-up (sequential, never parallel)

This phase is what distinguishes `/spec-impl-game` from `/spec-impl`. It runs automatically once
Phase 4's acceptance criteria are confirmed — you do not need to ask the user whether to run it,
but you must tell them it's starting.

**Hard rule: `mobile-porter` must not start until `skin-designer` has completely finished.** Do not
launch them in parallel and do not launch `mobile-porter` speculatively while waiting on
`skin-designer`.

1. Announce:

   ```
   🎨 Acceptance criteria verified. Kicking off the automatic follow-up:
     1. skin-designer — neon/retro/classic skins for <game>
     2. mobile-porter  — touch ergonomics for the player route

   Running skin-designer first.
   ```

2. Launch the `skin-designer` agent (via the Agent tool, `subagent_type: "skin-designer"`), passing
   the game id/title identified in Phase 1 as its argument — this agent works on exactly one game
   and never touches others. Give it a self-contained prompt since it starts with no context: name
   the game, its engine component under `components/games/`, and that its job is to verify/complete
   the neon, retro and classic/default skins for that game only.

3. Wait for `skin-designer` to fully complete (this is a normal, non-fork Agent call, so it blocks
   until done — do not proceed on assumptions). Read its result, summarize for the user what it did
   (files touched, skins completed/verified).

4. Only after that, launch the `mobile-porter` agent (`subagent_type: "mobile-porter"`). It doesn't
   take a game argument — it audits the whole player route (`app/juego/[id]/jugar`) for the 4
   real-engine games per `specs/08-controles-tactiles-movil.md` — but mention in its prompt that it
   is running right after `skin-designer` finished work on `<game>`, in case that context is useful
   for what it checks.

5. Wait for `mobile-porter` to fully complete. Read its result and summarize for the user what it
   did.

6. Final summary to the user:

   ```
   ✅ Spec implemented, skins verified/completed by skin-designer, and touch ergonomics
   audited/implemented by mobile-porter.

   Review the diffs from both agents before committing.
   ```

Neither agent commits on its own; committing remains the user's explicit decision, same as in
Phase 4.

---

## Summary of expected behavior

```
/spec-impl-game 09-nuevo-juego

  Phase 1  →  Finds specs/09-nuevo-juego.md, identifies the game it's about
  Phase 2  →  Reads the state → "Approved" (or "Aprobado", etc.) → ✅ continues
  Phase 3  →  git checkout -b spec-09-nuevo-juego → git checkout spec-09-nuevo-juego
              Shows objective, scope, plan and criteria
  Phase 4  →  Implements step by step with pauses
              Verifies acceptance criteria
  Phase 5  →  Runs @skin-designer for the game, waits for it to finish
              Then runs @mobile-porter, waits for it to finish
              Summarizes both results

/spec-impl-game 02-powerups  (state: Draft / Borrador)

  Phase 1  →  Finds specs/02-powerups.md
  Phase 2  →  Reads the state → "Draft" → ❌ stops
              Shows the standard error message
              Does not create branch, does not touch code, Phase 5 never runs
```

**Branch creation is controlled by the `AutoCreateBranch` flag** in `specs/.spec-config.yml`. It
defaults to `true` (create the branch automatically, as shown above). Set it to `false` to make
Phase 3 ask `[y/N]` before creating the branch.

**Phase 5 always runs sequentially** — `skin-designer` first, `mobile-porter` second, never in
parallel — once and only once Phase 4's acceptance criteria are confirmed to pass.
