# ReviveCode - Complete Project Implementation Summary

ReviveCode is a state-of-the-art AI-powered code review and analysis application that integrates static analysis, AST parsers, AI embedding models, and interactive code visualization tools. Below is a comprehensive breakdown of the features and architectural changes implemented across all development phases.

---

## 🛠️ Phase 1: Basic AI Code Review (Single File)
- **Multi-Language Support**: Initial setup of the review engine supporting Python and JavaScript.
- **Static Analysis & Linting**:
  - **Python**: Integrates **Ruff** for fast linting (detecting formatting issues and unused variables), **Bandit** for security checks, and Regex parsing for metadata checks (such as finding `TODO` items).
  - **JavaScript**: Implements custom **Abstract Syntax Tree (AST)** parsing to locate security issues (e.g. usage of `eval` or `document.write`) and complexity issues (e.g. nested loops).
- **REST APIs**: Simple FastAPI endpoints supporting `POST /api/v1/review` for submitting raw code.

---

## 📈 Phase 2: Advanced Scoring & Classification
- **Categorization Engine** (`severity_service.py`): Maps static analysis warnings and syntax alerts into six distinct categories:
  1. `Readability`
  2. `Security`
  3. `Performance`
  4. `Maintainability`
  5. `Documentation`
  6. `Best Practices` (Fallback)
- **Standardized Severity levels**: normalizes severities into: `Critical`, `High`, `Medium`, `Low`, and `Info`.
- **Deduction and Weighting Math** (`scoring_service.py`, `weighting.py`):
  - Applies distinct category weights (e.g. Security: `0.25`, Readability: `0.20`).
  - Deducts points based on issue severity (e.g., Critical: `15pt`, Medium: `4pt`), clamping final category scores between `0` and `100`.
  - Calculates an overall weighted score.

---

## 🔐 Phase 3: JWT User Authentication
- **Database Backend**: Configured SQLite for persistence.
- **User Accounts**: Developed signup and login routes, hashes passwords securely, and issues **JSON Web Tokens (JWT)**.
- **Access Middleware**: Secures endpoints to block unauthenticated calls or database tampering. Ensures users only access their own review reports.

---

## 💾 Phase 4: Code Upload & History Logs
- **File Upload Endpoint**: Custom multipart file upload routes to automatically ingest and parse `.py`, `.js`, `.tsx`, and `.go` source files.
- **Persistent History Dashboard**:
  - Saves completed analyses to the SQLite `reviews` table.
  - Exposes `GET /api/v1/history` to retrieve user logs.
  - Allows reports to be deleted, cascade-cleaning all referenced database records.

---

## 🤖 Phase 5: CodeBERT Embeddings & Line Surprise Perplexity
- **CodeBERT Embeddings**: Integrates a Hugging Face PyTorch pipeline utilizing `microsoft/codebert-base-mlm` to generate high-fidelity, 768-dimensional code vector representation.
- **Line Surprise Perplexity**: Computes per-line surprise scores (statistical outlier detection) using CodeBERT to highlight unexpected or highly complex lines of code (potential logic bugs).

---

## 🎨 Phase 6: Monaco Editor & Interactive Visual Dashboard
- **Monaco Code Viewer**: Mounts the VS-Code-style Monaco editor, attaching hover highlights and inline markers directly at the exact line of the issues.
- **Aggregated Visual Metrics**:
  - Sleek Overall Score dials.
  - Progressive category horizontal bar charts.
  - Severity-level distribution pie charts.
  - Clickable "Issue Explorer" lists that automatically scroll the Monaco Editor directly to the relevant line.

---

## 🐱 Phase 7: Repository-Wide Scan & GitHub Integration
- **GitHub Auth & Accounts**:
  - Implemented GitHub connection APIs (`POST /github/connect` & `POST /github/disconnect`) saving OAuth credentials inside SQLite.
  - Support for local **Mock Mode** using mock developer profiles.
- **Cloning & Filtering**:
  - Clones Git repositories, checks out branches, or targets pull requests.
  - Excludes boilerplate or temporary folders (`node_modules`, `.git`, `.next`, `dist`, `build`, etc.) and processes only supported files.
- **Repository Analytics Dashboard**:
  - Displays language breakdown, complexity hotspots (top problematic files), and frequent lint warnings.
  - Renders a directory folder tree (`FileExplorer`) allowing users to navigate repository file structures dynamically.
  - Loads file-specific lint cards and CodeBERT markers in Monaco as the user selects files in the explorer sidebar.
- **Persistent Repo Scans**: Saves codebase scans to the database under the new `review_files` table, letting users reload full multi-file scans from the history tab.
