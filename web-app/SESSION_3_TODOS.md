# Session 3 Todos

**Created:** 2026-05-03
**Source:** Code review followups + Session 3 feature plan

This file tracks two streams: (1) deferred items from the post-Session-2 code review that weren't done in the cleanup pass, and (2) the Session 3 feature work already on deck.

---

## Review Followups (deferred from cleanup pass)

These were called out during code review but skipped because they're each meatier than a small refactor.

### Production hardening

- [ ] **Set up tests** — add Vitest + React Testing Library. At minimum:
  - smoke test on `App` (renders upload view with empty history, renders dashboard when history exists)
  - render test on `DashboardShell` with `MOCK_ANALYSIS_RESULT`
  - unit tests for `lib/format.ts` (currency formatting with negative amounts, date range parsing)
  - unit tests for `lib/storage.ts` (loadHistory handles malformed JSON, saveHistory caps at 20)
- [ ] **Error boundary** — wrap `DashboardShell` in an error boundary so a render crash inside any chart/list doesn't blank the whole page. Show a "Something went wrong with this analysis" card with a "go back to upload" button.
- [ ] **Loading state** — once real CSV parsing lands, parsing a multi-MB file is not instant. Add a spinner/progress indicator between `handleFileUpload` being called and the dashboard appearing. State machine: `upload → parsing → dashboard | error`.
- [ ] **localStorage quota toast** — `saveHistory` currently swallows errors with `console.error`. When quota is exceeded (real analysis results will be much larger than mock), surface a toast: "Storage full. Delete old analyses to save new ones."
- [ ] **Replace boilerplate README** — `web-app/README.md` is still the Vite template. Replace with: project description, dev/build/lint commands, folder structure, link to `PROJECT_STATUS.md`.

### Verify privacy claim

- [ ] Once CSV parsing runs locally (Session 3 feature work), the "your data stays on your device" claim in `UploadComponent` becomes truthful. Confirm before deploy: no network calls fire on upload, no analytics SDK leaks transaction data.

### Nice-to-have UX polish

- [ ] **Loading skeleton** for dashboard cards while parsing (instead of spinner only).
- [ ] **Mobile sidebar** — currently `hidden md:block`. On mobile, expose a "History" button in the header that opens a drawer.
- [ ] **Compare two files** — multi-file is supported but there's no compare view. Side-by-side category bars across two analyses would be a strong feature.
- [ ] **Trend with text alternative** — `aria-label` on trend icons added in cleanup pass; consider also showing the word ("up 12%") so it's not icon-only for sighted users either.

---

## Session 3 Feature Work (from PROJECT_STATUS.md)

Already-planned work. Reproduced here so it lives next to the review followups.

### Architecture decision (do first)

- [ ] Choose CSV parsing + analysis approach:
  - **Option A:** Port Python agents (`parser.py`, `categorizer.py`, `analyzer.py`) to TypeScript. Keeps everything in-browser, preserves privacy story, but doubles the code.
  - **Option B:** Call a Python backend API. Simpler but breaks the "data stays on your device" claim unless self-hosted.
  - **Option C:** Bundle Python as WASM (Pyodide). Privacy preserved but heavy bundle.

  Recommendation: Option A. The Python parser/categorizer logic is small enough (~1700 lines combined) and the privacy claim is the product differentiator.

### CSV parsing

- [ ] Create `src/lib/parsers/` with one module per format: `wellsFargo.ts`, `amex.ts`, `standard.ts`.
- [ ] Detect format from CSV headers (no user prompt).
- [ ] Return `Transaction[]` matching the existing `Transaction` interface in `src/types/index.ts`.
- [ ] Add `transactions: Transaction[]` to `AnalysisResult` (currently missing from the type).
- [ ] Replace `MOCK_ANALYSIS_RESULT` use in `App.tsx` with real parsed data.

### Categorization + analysis

- [ ] Port `categorizer.py` rules to TS (or import a JSON ruleset).
- [ ] Port `analyzer.py` aggregation: by-category totals, top merchants, anomaly detection (currently the mock has hardcoded values; real flow needs the math).
- [ ] Recompute `percentage` at the analyzer level so `CategoryBreakdown` doesn't have to recalculate. (Right now it recalculates because the mock had `percentage: 0`.)

### Transaction detail UI

- [ ] Build a `TransactionDetailModal` component. Click a category row → modal opens with that category's transactions.
- [ ] Add per-row category dropdown for recategorization.
- [ ] Persist user category overrides to localStorage (separate key, e.g. `pennypincher_category_overrides`).
- [ ] Re-run analysis client-side when categories change (or just update aggregates in-place).

### Files to touch

- `src/types/index.ts` — add `transactions: Transaction[]` to `AnalysisResult`
- `src/lib/parsers/` — new folder
- `src/lib/analyzer.ts` — new file (TS port of `analyzer.py`)
- `src/lib/categorizer.ts` — new file (TS port of `categorizer.py`)
- `src/components/dashboard/CategoryBreakdown.tsx` — wire onClick to open modal
- `src/components/dashboard/TransactionDetailModal.tsx` — new component
- `src/App.tsx` — replace mock data path with real parser pipeline

---

## Done in cleanup pass (May 3, 2026)

For reference, the items that were already addressed:

- ✅ Extracted `src/lib/format.ts` (formatCurrency, formatShortDate, formatDateRange, generateId with UUID fallback)
- ✅ Added `@/*` path alias in `vite.config.ts` and `tsconfig.app.json`
- ✅ Dropped redundant `percentage` field and duplicate `summary.account_type` from types + mock
- ✅ Fixed drop-zone click handler + drag-leave flicker (counter-based) + inline error replacing `alert()`
- ✅ Added keyboard support and aria labels to drop zone
- ✅ Removed stray `console.log` from `App.tsx`
- ✅ Lazy-initialized state in `App.tsx` (fixes `react-hooks/set-state-in-effect` lint error)
- ✅ Added per-row delete button to `FileHistoryPanel` + `handleDeleteRecord` in `App.tsx`
- ✅ Made `FileHistoryPanel` `hidden md:block` so it doesn't break mobile
- ✅ Removed duplicate `min-h-screen` in `DashboardShell`
- ✅ `getTrendIcon` now handles `insufficient_data` and exposes aria labels
- ✅ All dashboard components use the shared format helpers
- ✅ `npm run lint` and `npm run build` both pass
