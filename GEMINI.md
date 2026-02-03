# Project Guidelines for AI Assistants

## CRITICAL RULES - MUST FOLLOW STRICTLY

These rules MUST be followed at all times when working on this project. No exceptions.

---

### Rule 1: Communication Language
**AI Assistants MUST communicate with users in Chinese (中文) at all times**

- All responses and explanations to users MUST be in Chinese
- All task descriptions and progress updates MUST be in Chinese
- All error explanations and suggestions MUST be in Chinese
- All planning and thinking shared with users MUST be in Chinese
- Only use English when explicitly quoting code snippets, technical identifiers, or file paths

---

### Rule 2: File and Folder Naming
**ALL file names and folder names MUST be in English**

- File names: ALWAYS use English
- Folder/Directory names: ALWAYS use English
- Use snake_case, kebab-case, or camelCase as appropriate
- NEVER use Chinese characters in file or folder names

---

### Rule 3: Code Identifiers
**ALL code identifiers MUST be in English**

This includes:
- Variable names
- Function names
- Method names
- Class names
- Interface names
- Type names
- Constants
- Enum values
- Module names
- Package names

---

### Rule 4: Language Specification
**Default: English**

**Special Rules:**

| Scenario | Rule |
|----------|------|
| AI communication with users | Chinese (replies, explanations, task descriptions, progress updates, error explanations, suggestions, plans) |
| `_bmad-output/` documents | Headings in English, content in Chinese |
| Git commit type | English (`feat`, `fix`, `docs`, etc.) |
| Git commit scope/module | English (`backend:app-api`, etc.) |
| Git commit subject | Chinese (`添加用户认证功能`) |
| Git commit body | Chinese (`- 实现 JWT 令牌验证逻辑`) |

---

### Rule 5: File Size Management
**When file context is too large, read and write in batches**

---

### Rule 6: Git Commit Guidelines
**Commit messages MUST be in Chinese and follow the strict format below.**

**Format Structure:**
```text
<type>(<module>): <subject>

- <change_highlight_1>
- <change_highlight_2>
...
```

**1. Header Specifications:**
- **Type** (Allowed values only):
  - `feat`: New feature
  - `fix`: Bug fix
  - `docs`: Documentation
  - `style`: Formatting (white-space, formatting, missing semi-colons, etc)
  - `refactor`: Code change that neither fixes a bug nor adds a feature
  - `test`: Adding missing tests
  - `build`: Build system or external dependencies
- **Module**:
  - **MUST** use `layer:module` format based on the file path being modified.
  - Format: `layer:module-name` (e.g., `backend:framework-kernel`, `frontend:admin`).
  - Path mapping examples:
    - `backend/framework-kernel/**` → `backend:framework-kernel`
    - `backend/app-api/**` → `backend:app-api`
    - `frontend/admin/**` → `frontend:admin`
    - `docs/**` → `docs` (top-level only)
  - **Anti-pattern**: Do NOT use overly generic scopes like `kernel`, `api`, `admin` alone.
- **Subject**:
  - Concise description (max 50 chars).
  - Must describe the **business goal**.

**2. Body Specifications (Change Highlights):**
- Format: Bulleted list (`- ...`).
- **Content Requirement**:
  - Group and summarize similar changes.
  - **Business Context**: Descriptions must explain the *business logic* or *functional intent*, not just technical file operations.
  - *Example*: Instead of "Modified verify.ts", use "Implement JWT token validation logic".

---

### Rule 7: Testing Standards
**STRICTLY FORBIDDEN: Mock Testing is PROHIBITED in this project**

**CRITICAL REQUIREMENT:**
- **ALL tests MUST use real implementations** - NO Mock objects, NO Mock adapters, NO Mock providers
- **Backend tests**: MUST use real database (SQLite test DB), real API endpoints, real services
- **Frontend tests**: MUST use real Providers, real Repositories, real API calls (to test backend or local test server)
- **Integration tests**: MUST test actual end-to-end flows with real components

**What is FORBIDDEN:**
- ❌ Mock classes (MockDio, MockRepository, MockService, etc.)
- ❌ Mock libraries (mocktail, mockito, http_mock_adapter, etc.)
- ❌ Fake implementations that bypass real logic
- ❌ Stub methods that return hardcoded values
- ❌ Any form of test doubles (mocks, stubs, spies, fakes)

**What is REQUIRED:**
- ✅ Real database instances (use test database for backend)
- ✅ Real HTTP clients (Dio, http) calling real endpoints
- ✅ Real Providers and StateNotifiers (Riverpod)
- ✅ Real file I/O operations (use temp directories for tests)
- ✅ End-to-end integration tests with full stack

**Testing Strategy:**
- **Unit Tests**: Test individual functions/classes using real dependencies
- **Integration Tests**: Test complete workflows with real backend + frontend
- **E2E Tests**: Test full user flows with real application state

**Enforcement:**
- Any code review finding Mock usage will be REJECTED immediately
- Tests using Mocks will be deleted and rewritten
- Developers violating this rule must refactor all affected tests

**Rationale:**
- Mock tests provide false confidence and miss real integration issues
- Real tests catch actual bugs that Mocks hide
- Mock-based tests become maintenance burden when APIs change
- This project prioritizes **real-world correctness** over test isolation

---

### Rule 8: BMAD Method Compliance
**The entire development process MUST strictly follow the BMAD-METHOD specification**

- All requirements analysis, architecture design, development implementation, and testing verification must be executed according to the BMAD-METHOD workflow
- Each stage must have clear deliverables and acceptance criteria
- Follow the BMAD project directory structure and documentation standards

---

## Enforcement Guidelines

### Before Every Action:

1. **Before responding to user**:
   - ✓ Check: Am I responding in Chinese?
   - ✓ Check: Am I only using English for code/file references?

2. **Before creating files or folders**:
   - ✓ Check: Is the file/folder name in English?
   - ✓ Check: Will this name follow standard naming conventions?

3. **Before writing code**:
   - ✓ Check: Are all identifiers (variables, functions, classes) in English?
   - ✓ Check: Are all comments in Chinese?

4. **Before explaining or suggesting**:
   - ✓ Check: Am I explaining in Chinese?
   - If user suggests Chinese names: Convert to appropriate English names

5. **During refactoring**:
   - Keep: English naming for all identifiers
   - Update: Chinese comments to reflect changes
   - Maintain: Chinese documentation

6. **Before writing tests**:
   - ✓ Check: Am I using ANY Mock objects? (If yes, STOP immediately)
   - ✓ Check: Are all tests using real implementations?
   - ✓ Check: Do integration tests call real APIs and use real databases?

7. **Before starting any development task**:
   - ✓ Check: Am I following BMAD-METHOD workflow?
   - ✓ Check: Are deliverables and acceptance criteria clearly defined?
   - ✓ Check: Am I adhering to the BMAD project structure?

### Conflict Resolution Priority:

If any conflict or ambiguity arises, follow this priority order:

1. **Highest Priority**: Communication with users in Chinese
2. **Second Priority**: Technical naming (files, folders, code) in English
3. **Third Priority**: Content and documentation in Chinese

### Auto-Correction Rules:

- If user provides Chinese names for files/folders/variables → Automatically convert to English equivalents
- If existing code has Chinese identifiers → Suggest refactoring to English during modifications
- If user asks in English → Respond in Chinese but acknowledge you understand English

---

## Summary

**Remember these golden rules:**

1. 🗣️ **Speak Chinese** - Always communicate with users in Chinese
2. 📝 **Name in English** - All files, folders, and code identifiers in English
3. 📚 **Document in Chinese** - All comments, docs, and messages in Chinese
4. 🎯 **Follow BMAD-METHOD** - All development workflows must strictly comply with BMAD-METHOD standards

**These rules are MANDATORY and must be followed strictly in every interaction and every line of code.**

---

*This document serves as the authoritative guide for all development work in this project. When in doubt, refer back to these rules.*
