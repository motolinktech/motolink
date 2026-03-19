# Optimization Opportunities

## Summary

`pnpm run build` succeeded on Next.js `16.1.6`, and the build output shows that nearly every authenticated route is rendered dynamically (`ƒ`). That is not automatically wrong for a cookie-authenticated internal app, but the current code still leaves important first-load work to the browser and ships avoidable client-side logic on some routes. Exact per-route bundle sizes could not be verified from the available Turbopack build output, because this run did not emit the old byte table and the generated analyzer diagnostics were not directly machine-readable enough to attribute route KB precisely.

## Build signals

- Build status: success
- Static routes from build output:
  - `/login`
  - `/_not-found`
  - `/apple-icon.png`
  - `/icon.png`
- Dynamic routes from build output: all authenticated app routes plus API routes
- Middleware/proxy is active in the build output

## High-impact opportunities

### 1. Monitoring pages are server-rendered shells, but their primary data still loads in the browser

- **What**: The page components resolve selected filter labels on the server, but the actual monitoring payload is fetched in client `useEffect()` hooks through `/api/monitoring` and `/api/monitoring/weekly`.
- **Why it matters**: These routes are already dynamic. Deferring the main dataset to the browser adds an extra network hop, repeats auth/validation in route handlers, and delays meaningful content on first load.
- **Where**:
  - Server pages:
    - `src/app/(private)/operacional/monitoramento/diario/page.tsx:18-57`
    - `src/app/(private)/operacional/monitoramento/semanal/page.tsx:21-63`
  - Client fetches:
    - `src/components/composite/monitoring-daily-content.tsx:207-261`
    - `src/components/composite/monitoring-weekly-content.tsx:190-245`
  - Route handlers:
    - `src/app/api/monitoring/route.ts:10-30`
    - `src/app/api/monitoring/weekly/route.ts:10-30`
- **How to improve**: Fetch the initial daily/weekly payload in the page RSC with `monitoringService()`, pass it as initial props, and keep the client fetch only for refresh/polling after first paint.
- **Priority**: High

### 2. Per-request auth/user resolution is duplicated across layout and pages

- **What**: The private layout resolves the logged-in user, and many pages repeat user reads via `checkPagePermission()` and page-specific lookups.
- **Why it matters**: The app is already fully dynamic. Repeating the same user query multiple times per request adds avoidable latency and database load without improving correctness.
- **Where**:
  - `src/components/composite/app-layout/index.tsx:11-34`
  - `src/utils/check-page-permission.ts:8-13`
  - `src/app/(private)/dashboard/page.tsx:66-82`
  - `src/app/(private)/gestao/colaboradores/page.tsx:36-45`
- **How to improve**: Cache a shared “current user/session” resolver for the lifetime of the request and pass the resolved user down where needed.
- **Priority**: High

### 3. Filter pagination bug causes redundant reloads and incorrect result sets

- **What**: Pagination links only preserve `search`, not the full query state.
- **Why it matters**: Changing pages after applying filters forces a different dataset than the user asked for, which is both a correctness bug and a source of unnecessary re-fetching.
- **Where**:
  - `src/components/composite/table-pagination.tsx:34-39`
  - `src/app/(private)/gestao/colaboradores/page.tsx:77-90`
  - `src/components/composite/financeiro-content.tsx:125-138,254-258`
- **How to improve**: Preserve the whole current query string when generating pagination links.
- **Priority**: High

## Medium-impact opportunities

### 4. Firebase storage is loaded eagerly in form routes that may never upload a file

- **What**: The Firebase storage helper is imported at module scope in client form components.
- **Why it matters**: Upload code becomes part of the initial client chunk for those forms, even when the user never touches file upload.
- **Where**:
  - `src/components/forms/deliveryman-form.tsx:20`
  - `src/components/forms/user-form.tsx:20`
  - Firebase helper: `src/lib/firebase.ts:1-30`
- **How to improve**: Lazy-load the upload helper inside the submit path or isolate upload logic in a separate dynamically imported client module.
- **Priority**: Medium

### 5. `package.json` is imported into client code for a single version string

- **What**: The app-layout actions dropdown imports `package.json` directly.
- **Why it matters**: This is unnecessary client bundle surface for a tiny display concern.
- **Where**: `src/components/composite/app-layout/app-layout-actions.tsx:17,65-68`
- **How to improve**: Inject the version from a server component or environment variable.
- **Priority**: Medium

### 6. Option-loading logic is repeated instead of centralized

- **What**: Searchable option fetching is duplicated across monitoring, planning, finance, and work-shift forms.
- **Why it matters**: Multiple slightly different loaders mean repeated client logic, repeated bugs, and inconsistent retry/error behavior.
- **Where**:
  - `src/components/composite/monitoring-daily-content.tsx:23-85`
  - `src/components/composite/monitoring-weekly-content.tsx:19-81`
  - `src/components/composite/planning-week-view.tsx:40-102`
  - `src/components/composite/financeiro-content.tsx:26-88`
  - `src/components/forms/work-shift-slot-form.tsx:146-230`
- **How to improve**: Extract a shared hook and standardize fetch behavior, error treatment, and cacheability.
- **Priority**: Medium

### 7. Edit-mode deliveryman hydration performs a low-limit search instead of a direct fetch

- **What**: Work-shift edit mode searches by deliveryman name with `pageSize=5` and then tries to locate the target ID in that short list.
- **Why it matters**: The selected deliveryman can fail to hydrate, which forces additional user work and can break derived payment fields.
- **Where**: `src/components/forms/work-shift-slot-form.tsx:299-314`
- **How to improve**: Fetch by ID, or pass the full deliveryman object down with the page payload.
- **Priority**: Medium

## Low-impact opportunities

### 8. Public layout images are not fully optimized

- **What**: The hero image uses `fill` without `sizes`, and the main logo is rendered in the login layout without an explicit loading hint.
- **Why it matters**: `/login` is one of the few static routes, so image optimization is easier to benefit from here than in the authenticated app shell.
- **Where**: `src/app/(public)/layout.tsx:7,12-18`
- **How to improve**: Add `sizes` to the `fill` image and consider `priority` for the actual LCP image.
- **Priority**: Low

### 9. History traces are fetched on-demand with no visible error state

- **What**: Opening a detail sheet triggers a fetch, and failures collapse into empty history.
- **Why it matters**: This is not a build-breaker, but it wastes network work and makes debugging harder when the route fails.
- **Where**:
  - `src/components/composite/payment-request-detail-sheet.tsx:55-63`
  - `src/components/composite/monitoring-work-shift-detail-sheet.tsx:171-179`
- **How to improve**: Cache recent history lookups per entity or show an explicit “failed to load history” state instead of empty results.
- **Priority**: Low

### 10. Query-state components rely on client routing even on already-dynamic pages

- **What**: `TextSearch`, `SelectSearch`, and related filter controls drive URL state from the client with `router.push()`.
- **Why it matters**: This is fine for interaction, but combined with the rest of the code it means many routes are effectively “dynamic on the server and dynamic again on the client”.
- **Where**:
  - `src/components/composite/text-search.tsx:48-66`
  - `src/components/composite/select-search.tsx:35-53`
  - `src/components/composite/financeiro-content.tsx:125-163`
- **How to improve**: Keep the client URL state, but pair it with stronger server-first initial payloads so first render does not wait on client fetches.
- **Priority**: Low

## What could not be verified

- Exact per-route JavaScript byte size from the current `next build` output
- Exact module-level contribution to the client bundle from the generated Turbopack analyzer files

Those limits are why the findings above focus on code-level bundle drivers and rendering behavior rather than invented size numbers.

## TODO

- [ ] Move the initial daily and weekly monitoring fetches into the server page layer and keep client fetches only for refresh/polling.
- [ ] Cache the current user/session lookup once per request and reuse it across layout, permission checks, and pages.
- [ ] Fix `TablePagination` so page changes preserve all active filters.
- [ ] Lazy-load Firebase upload code in `deliveryman-form` and `user-form`.
- [ ] Remove the `package.json` import from client code and inject the version more cheaply.
- [ ] Extract a shared searchable option-loading hook from the repeated `useFetchOptions` implementations.
- [ ] Replace the name-based `pageSize=5` deliveryman lookup with a direct by-ID fetch.
- [ ] Add `sizes` and, where appropriate, `priority` to the public layout images.
- [ ] Distinguish “history fetch failed” from “history is empty” in the detail sheets.
- [ ] If exact bundle sizes are needed later, add a repeatable analyzer workflow that exports route/module byte summaries in a consumable format.
