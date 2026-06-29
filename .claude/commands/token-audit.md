# Token Audit

Scan the project for token burn risks and report what needs fixing. No arguments needed.

## Steps

Run each check and report findings. Only report problems — skip passing checks.

### 1. Large unignored directories
Check that these are absent from `git status --short` output:
- `backend/.venv/`
- `frontend/node_modules/`
- `frontend/dist/`

If any appear → missing `.gitignore` or `.claudeignore` entry.

### 2. .claudeignore coverage
Read `.claudeignore`. Verify it excludes:
- `backend/.venv/`
- `frontend/node_modules/`
- `frontend/dist/`
- `*.png`, `*.jpg`, `*.jpeg`

Report any missing entries.

### 3. Stray temp files at root and in frontend/
Look for files matching:
- `*.js` at project root (not inside `frontend/src/` or `backend/`)
- `*.html` at project root
- `*.md` at root that aren't `CLAUDE.md` or `README.md`
- `*.png`, `*.jpg` at root

These are candidates for deletion or `.gitignore`.

### 4. Skills parity check
Read `CLAUDE.md` skills list (under `## Skills Available`).
List all files in `.claude/commands/`.
Report any skill listed in CLAUDE.md that has no corresponding `.md` file.

### 5. .env secrets check
Run: `git ls-files | grep -i "\.env$"`
Any result (other than `.env.example`) is a critical leak.

### 6. CLAUDE.md completeness
Verify CLAUDE.md contains all of:
- `## Project Structure` section
- `## Frontend Patterns` section
- `## Backend Patterns` section
- `## Avoid Reading` section

---

## Output format

```
TOKEN AUDIT — {date}

CRITICAL:
  [list issues that directly expose large dirs or secrets]

WARNINGS:
  [list stray files, missing skills, incomplete CLAUDE.md]

OK:
  [summary of checks that passed]
```

If everything is clean, output: `TOKEN AUDIT — all clear.`
