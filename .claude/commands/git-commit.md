# Git Commit

Auto-commit current changes after completing a feature or fix. Arguments: `$ARGUMENTS` (optional commit message hint).

## Steps

1. Run `git status` to see what changed
2. Run `git diff --stat` for a quick summary
3. Stage only relevant files (never `.env`, secrets, or temp files):
   ```
   git add <specific files>
   ```
4. Craft a conventional commit message:
   - `feat(scope): description` — new feature
   - `fix(scope): description` — bug fix
   - `refactor(scope): description` — code cleanup
   - `style(scope): description` — CSS/visual only
   - `chore(scope): description` — tooling, config

5. Commit:
   ```
   git commit -m "feat(frontend): add X component"
   ```

## Auto-commit triggers

Run `/git-commit` automatically after:
- Adding a new page or component (feat)
- Fixing a bug (fix)
- Refactoring existing code (refactor)
- CSS-only changes (style)

Never commit:
- `.env` files
- Temp/scratch files
- `node_modules/`, `.venv/`
- `*.png`, `*.jpg` screenshots unless they're project assets
