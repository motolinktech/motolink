# Code Patterns and Best Practices Review

## Summary

`pnpm exec tsc --noEmit` passed, and `pnpm run lint` reported only 16 warnings in one test file. The highest-signal source issues are an invalid root layout structure, query-state loss in pagination, repeated per-request user lookups, duplicated client fetch hooks, and a few unstable or opaque patterns around `proxy.ts` and browser-side fetches.

## Validation baseline

- `pnpm exec tsc --noEmit`: passed with no output.
- `pnpm run lint`: 16 warnings, all in `test/modules/work-shift-slots/work-shift-slots-service.spec.ts`.
- `pnpm run build`: passed on Next.js 16.1.6; almost every authenticated route rendered as dynamic (`ƒ`).

## High priority

### 1. Invalid root layout markup

- **What**: The root layout renders `<TooltipProvider>` as a direct child of `<html>`, with `<body>` nested inside the provider.
- **Why it is a problem**: App Router layouts are expected to render `<html>` with a direct `<body>` child. Wrapping `<body>` with a client component produces invalid document structure and risks hydration quirks and browser re-parenting.
- **Where**: `src/app/layout.tsx:27-35`
- **How to improve**: Move `<TooltipProvider>` inside `<body>`, alongside `ThemeProvider` and `Toaster`.
- **Priority**: High

### 2. Pagination drops active filters

- **What**: `TablePagination` rebuilds links from scratch with only `page`, `pageSize`, and optional `search`.
- **Why it is a problem**: Any other active filters are lost when the user changes pages. This is a behavior bug, not just a UX nit.
- **Where**:
  - `src/components/composite/table-pagination.tsx:34-39`
  - `src/app/(private)/gestao/colaboradores/page.tsx:77-90` (`status` filter is active)
  - `src/components/composite/financeiro-content.tsx:125-138,254-258` (`deliveryman`, `client`, `date`, `status` filters are active)
- **How to improve**: Preserve the full current query string, or pass the full current params object into `TablePagination` instead of only `currentSearch`.
- **Priority**: High

## Medium priority

### 3. Repeated authenticated user lookups on the same request

- **What**: The private app layout fetches the current user, `checkPagePermission()` fetches the same user again, and some pages fetch it a third time.
- **Why it is a problem**: This adds avoidable database work to already-dynamic requests and scatters auth state resolution across layout and page code.
- **Where**:
  - `src/components/composite/app-layout/index.tsx:11-34`
  - `src/utils/check-page-permission.ts:8-13`
  - `src/app/(private)/dashboard/page.tsx:66-82`
  - `src/app/(private)/gestao/colaboradores/page.tsx:36-45`
- **How to improve**: Introduce a cached server-side `getCurrentUser()` helper (for example via React `cache()`), and reuse it from layout, permission checks, and pages.
- **Priority**: Medium

### 4. The same debounced option-fetching hook is duplicated in several client components

- **What**: Very similar `useFetchOptions` logic appears in multiple files, each managing abort controllers, debouncing, loading state, and search behavior.
- **Why it is a problem**: This increases maintenance cost and makes error handling drift likely. The copies are already not identical.
- **Where**:
  - `src/components/composite/monitoring-daily-content.tsx:23-85`
  - `src/components/composite/monitoring-weekly-content.tsx:19-81`
  - `src/components/composite/planning-week-view.tsx:40-102`
  - `src/components/composite/financeiro-content.tsx:26-88`
  - Similar specialized version: `src/components/forms/work-shift-slot-form.tsx:146-230`
- **How to improve**: Extract a shared client hook for searchable option loading, with explicit error semantics and consistent cancellation behavior.
- **Priority**: Medium

### 5. `proxy.ts` uses an internal Next.js type and a brittle matcher

- **What**: The file imports `ReadonlyRequestCookies` from `next/dist/...`, and the matcher excludes only `.png` and `.jpg`.
- **Why it is a problem**: Internal `next/dist/*` imports are not stable APIs. The matcher still runs the proxy for other static assets such as `/favicon.ico`, and will also catch future `.svg`, `.webp`, and other files unless they are manually added.
- **Where**: `src/proxy.ts:1,42-43`
- **How to improve**: Remove the internal import and rely on public request/response cookie APIs. Widen the asset exclusion pattern to something generic like `.*\\..*` if that matches intended behavior.
- **Priority**: Medium

### 6. Browser-side third-party lookups are silent and privacy-sensitive

- **What**: The client form auto-fetches CNPJ and CEP data directly from BrasilAPI from the user’s browser, and silently ignores failures.
- **Why it is a problem**: User-entered identifiers are sent directly to a third party, availability of the form depends on that external API, and failures are indistinguishable from “no data found”.
- **Where**: `src/components/forms/client-form.tsx:168-228`
- **How to improve**: Move the lookup behind a server-side route handler or server action, add visible non-blocking feedback, and keep the external integration optional rather than silent.
- **Priority**: Medium

### 7. Several client fetch flows swallow errors and turn them into empty state

- **What**: A few components catch fetch failures and either do nothing or replace errors with empty arrays.
- **Why it is a problem**: This hides operational problems and makes broken data loading look like valid empty data.
- **Where**:
  - `src/components/forms/client-form.tsx:175-223`
  - `src/components/composite/payment-request-detail-sheet.tsx:58-62`
  - `src/components/composite/monitoring-work-shift-detail-sheet.tsx:174-178`
  - `src/components/forms/work-shift-slot-form.tsx:303-313`
- **How to improve**: Surface a lightweight error state, or at least log enough context and separate “fetch failed” from “no records”.
- **Priority**: Medium

### 8. Edit-mode deliveryman lookup can miss the current deliveryman

- **What**: Edit mode reloads the assigned deliveryman by searching by name with `pageSize=5`, then tries to find the wanted ID in that small result set.
- **Why it is a problem**: If more than five similar names exist, the current deliveryman may not be returned, and payment metadata/badges will render incomplete state.
- **Where**: `src/components/forms/work-shift-slot-form.tsx:299-314`
- **How to improve**: Fetch by ID through a dedicated endpoint or pass the full deliveryman payload from the server instead of a name-based search.
- **Priority**: Medium

### 9. Authenticated API routes expose raw Zod error structure

- **What**: Invalid query parsing responses include `z.treeifyError(parsed.error)` in JSON.
- **Why it is a problem**: That leaks internal validation structure into client-facing responses and couples API consumers to schema internals.
- **Where**:
  - `src/app/api/clients/route.ts:21-23`
  - `src/app/api/groups/route.ts:20-22`
  - `src/app/api/monitoring/route.ts:20-22`
  - `src/app/api/monitoring/weekly/route.ts:20-22`
  - `src/app/api/payment-requests/route.ts:20-22`
- **How to improve**: Return a flatter user-facing message and log detailed validation info server-side.
- **Priority**: Medium

## Low priority

### 10. Document language metadata is inconsistent with the actual UI language

- **What**: The main layout declares `lang="en"`, while the UI text is Portuguese and `global-error.tsx` uses `pt-BR`.
- **Why it is a problem**: This weakens accessibility and language-aware browser/screen-reader behavior.
- **Where**:
  - `src/app/layout.tsx:27`
  - `src/app/global-error.tsx:13`
- **How to improve**: Standardize the document language to `pt-BR`.
- **Priority**: Low

### 11. Public layout images are missing key optimization props

- **What**: The hero image uses `fill` without `sizes`, and the logo is above the fold without an explicit loading hint.
- **Why it is a problem**: Without `sizes`, the browser may download a larger image than necessary. The login experience is one of the few static routes, so its image loading behavior matters more.
- **Where**: `src/app/(public)/layout.tsx:7,12-18`
- **How to improve**: Add `sizes` for the `fill` image and consider `priority` for the actual LCP image.
- **Priority**: Low

### 12. `package.json` is imported into client code just to show the version

- **What**: The profile/actions dropdown imports `package.json` from a client component.
- **Why it is a problem**: This is unnecessary client-bundle surface for a single string.
- **Where**: `src/components/composite/app-layout/app-layout-actions.tsx:17,65-68`
- **How to improve**: Inject the version via environment variable or pass it from a server component.
- **Priority**: Low

### 13. Unused read-oriented payment-request actions appear to be dead code

- **What**: In-repo search found definitions for `listPaymentRequestsAction` and `getPaymentRequestByIdAction`, but no call sites.
- **Why it is a problem**: Unused server actions increase maintenance surface and make the read path harder to reason about.
- **Where**:
  - Definitions: `src/modules/payment-requests/payment-requests-actions.ts:13-41`
  - Search result: only definitions were found in `src/`
- **How to improve**: Delete them if they are truly unused, or document the intended consumer.
- **Priority**: Low

## TODO

- [ ] Move `TooltipProvider` inside `<body>` in `src/app/layout.tsx`.
- [ ] Refactor `TablePagination` to preserve all active query parameters, not just `search`.
- [ ] Add a cached shared server helper for “current user + permissions” instead of refetching the user in layout, permission checks, and pages.
- [ ] Extract a shared searchable option-loading hook from the repeated `useFetchOptions` implementations.
- [ ] Replace the internal `next/dist/*` import in `src/proxy.ts` and broaden static-asset exclusions in the matcher.
- [ ] Move BrasilAPI lookups behind a server boundary or at least surface visible error feedback in `client-form`.
- [ ] Fix edit-mode deliveryman hydration to fetch by ID instead of a five-result name search.
- [ ] Stop returning raw `z.treeifyError()` payloads from authenticated API routes.
- [ ] Change the root document language to `pt-BR`.
- [ ] Add `sizes`/`priority` where appropriate in `src/app/(public)/layout.tsx`.
- [ ] Replace the `package.json` client import with a lighter version source.
