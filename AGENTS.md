# Repository Guidelines

## Project Structure & Module Organization
- `backend/app-api/`: FastAPI service with `src/api/app/` (routers, models, services), `migrations/`, and `tests/`.
- `frontend/app-web/`: Next.js app with `app/` (App Router), `components/`, `lib/`, and `providers/`.
- `docs/`: product, planning, and implementation references.
- `docs/3-solutioning/architecture/index.md`: architecture reference index.
- `_bmad/`: BMAD workflows, templates, and configuration.
- `_bmad-output/`: BMAD generated artifacts (planning/implementation outputs).

## Build, Test, and Development Commands
- Backend: `pip install -r requirements.txt`, `uvicorn app.main:app --reload`, `ruff check .`, `ruff format .`, `mypy app/`, `pytest`, `alembic upgrade head`.
- Frontend: `npm install`, `npm run dev`, `npm run lint`, `npx prettier --check .`.

## Coding Style & Naming Conventions
- Python uses Ruff for formatting/linting and mypy for typing.
- TypeScript uses ESLint/Prettier; generated files must be committed when required.
- Use English identifiers only. File naming: `snake_case` for Python; classes use `UpperCamelCase`.

## Testing Guidelines
- Backend tests use `pytest` in `backend/app-api/tests/` and integration tests in `backend/app-api/tests/integration/`.
- Frontend tests run via `npm test` in `frontend/app-web/`.
- No mocks or test doubles; use real databases, providers, repositories, and APIs.

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `type(scope): subject` with types from `commitlint.config.mjs`.
- Include clear PR descriptions, linked issues/stories, and test evidence; add screenshots for UI changes.
- Update docs when behavior or architecture changes.

## AI Assistant Project Guidelines
This document standardizes AI assistant behavior and output for this project. Markdown headings must be in English, and Markdown body content must be in Chinese. Filenames remain in English to meet naming requirements.

### Mandatory Rules (Must Follow)

#### Rule 1: Communication Language
The AI assistant must always communicate with users in Chinese.

- All replies, explanations, suggestions, and progress updates must be in Chinese
- Use English only when quoting code snippets, technical identifiers, or file paths

#### Rule 2: File and Directory Naming
All file and directory names must be in English.

- Use snake_case, kebab-case, or camelCase
- Chinese characters are prohibited in file or directory names

#### Rule 3: Code Identifiers
All code identifiers must be in English.

- Variables, functions, methods, classes, interfaces, types, constants, enum values, modules, package names

#### Rule 4: Content and Documentation
Markdown headings must be in English, and Markdown body content must be in Chinese.

- Markdown documentation (README, guides, specifications)
- Code comments (inline, block, doc comments)
- TODO comments, user-facing prompts, logs, and error messages
- Configuration descriptions and API docs

#### Rule 5: File Size and Reading
When file content is large, read and modify it in batches to avoid loading too much at once.

#### Rule 6: Commit Message Format
Commit messages must be in Chinese and strictly follow the specified format.

Format:
```text
<type>(<module>): <subject>

- <change_highlight_1>
- <change_highlight_2>
```

Requirements:
- type must be one of: feat, fix, docs, style, refactor, test, build
- module must use layer:module-name format and align with file paths
- subject should be concise and describe the business goal (no more than 50 characters)
- body uses bullet points to describe business intent rather than technical operations

#### Rule 7: Testing Standards
This project forbids Mock-based tests.

Must follow:
- Backend tests use real databases and real interfaces
- Frontend tests use real Providers, real Repositories, and real APIs
- Integration tests cover real end-to-end flows

Prohibited:
- Mock classes and Mock frameworks
- Any form of test doubles (mock, stub, fake, spy)

#### Rule 8: BMAD Method Compliance
The entire development process must strictly follow BMAD-METHOD standards.

- Requirements analysis, architecture design, development implementation, and testing verification must follow the BMAD-METHOD workflow
- Each phase must have clear deliverables and acceptance criteria
- Follow BMAD project directory structure and documentation standards

### Pre-Action Checklist

1. Before responding, confirm the response is fully in Chinese
2. Before creating files or folders, confirm the names are in English
3. Before writing code, confirm all identifiers are in English
4. Before writing Markdown headings, confirm they are in English
5. Before writing Markdown body content, confirm it is in Chinese
6. Before writing code comments or non-Markdown content, confirm they are in English
7. Before writing tests, confirm no Mock is used

### Conflict Resolution Priority

1. Communication with users must be in Chinese
2. Technical naming must be in English
3. Markdown headings must be in English, Markdown body content must be in Chinese; code comments and non-Markdown content must be in English

### Auto-Correction Rules

- If the user proposes Chinese naming, automatically convert to appropriate English naming
- If Chinese identifiers are found, suggest changing them to English during edits
- If the user asks in English, still reply in Chinese and confirm understanding

---

This document is the unified behavioral guideline for the AI assistant in this project and must be strictly followed.
