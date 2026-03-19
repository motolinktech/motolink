# Test Coverage Review

## Summary

`pnpm run test` passed with `27` test files and `286` tests in `37.96s`, and the suite correctly bootstrapped a real PostgreSQL test database before execution. Even so, the run did not produce a coverage report, so numerical coverage cannot be verified; the best evidence available is file-to-test mapping plus inspection of what each spec actually asserts.

## Test run signals

- `pnpm run test`: passed.
- Final summary: `27` files, `286` tests, duration `37.96s`.
- Test setup started Dockerized Postgres, ran `prisma generate`, and applied migrations before executing tests.
- Coverage output: **not available** from this run.

## What is covered well

### 1. Every service module has a matching integration spec

A source-to-test comparison showed:

- `14` service files in `src/modules/**/*-service.ts`
- `14` matching specs in `test/modules/**/*-service.spec.ts`
- Missing service specs: **none**

Covered services include:

- `branches`
- `client-blocks`
- `clients`
- `deliverymen`
- `groups`
- `history-traces`
- `monitoring`
- `payment-requests`
- `planning`
- `regions`
- `sessions`
- `users`
- `whatsapp`
- `work-shift-slots`

This is the strongest part of the suite. The service layer is not superficially tested: the specs use the real database, create related records, and validate behavior across create/list/update/filter scenarios.

### 2. Several shared auth/permission utilities are directly tested

Direct utility specs exist for:

- `src/utils/check-page-permission.ts`
- `src/utils/verify-session.ts`
- `src/utils/has-permission.ts`
- `src/utils/convert-decimals.ts`
- `src/utils/generate-secure-token.ts`
- `src/utils/password-regex.ts`

That coverage matters because those helpers sit on critical request/auth paths.

## Coverage gaps

### 1. `/src/utils` is **not** fully covered

A source-to-test comparison showed:

- `17` utility source files in `src/utils`
- `12` utility spec files in `test/utils`
- Untested utility files:
  - `src/utils/client-cookie.ts`
  - `src/utils/format-work-shift-check-time.ts`
  - `src/utils/masks/cep-mask.ts`
  - `src/utils/masks/cnpj-mask.ts`
  - `src/utils/masks/time-mask.ts`

Because of that gap, coverage for `/utils` is **not** effectively 100%.

### 2. Auxiliary module helpers are not directly tested

The service layer is covered, but some non-service module helpers are not:

- `src/modules/history-traces/history-traces-formatter.ts`
- `src/modules/planning/planning-transformer.ts`

That matters because `history-traces-formatter.ts` is used directly in client detail sheets:

- `src/components/composite/payment-request-detail-sheet.tsx:13`
- `src/components/composite/monitoring-work-shift-detail-sheet.tsx:42`

If formatting regresses, the UI can silently misrender change history even while service tests stay green.

### 3. No direct tests were found for server actions

No direct test files target `src/modules/*-actions.ts`.

Examples of action files with logic that is currently unverified at the action layer:

- `src/modules/clients/clients-actions.ts`
- `src/modules/deliverymen/deliverymen-actions.ts`
- `src/modules/payment-requests/payment-requests-actions.ts`
- `src/modules/work-shift-slots/work-shift-slots-actions.ts`
- `src/modules/users/users-actions.ts`

This does **not** mean action behavior is completely untested indirectly, but it does mean cookie handling, `redirect()`, `revalidatePath()`, and action-level branching are not explicitly protected by focused tests.

## Gaps in behavior coverage

### 1. `monitoring-service.spec.ts` covers `getDaily`, but not `getWeekly`

- `test/modules/monitoring/monitoring-service.spec.ts` contains `describe(".getDaily", ...)`
- Search found no `getWeekly` coverage in that file

That leaves the weekly aggregation path relying on indirect confidence only, even though the route handler exists:

- `src/app/api/monitoring/weekly/route.ts:24`

### 2. `money-mask.spec.ts` covers `applyMoneyMask` only

- `test/utils/masks/money-mask.spec.ts:2-51` imports and tests only `applyMoneyMask`
- No direct spec for `formatMoneyDisplay`

That is a useful gap because `formatMoneyDisplay` is used throughout the UI, including:

- `src/modules/history-traces/history-traces-formatter.ts:8,95`
- `src/components/composite/payment-request-detail-sheet.tsx:15,105`
- `src/components/composite/monitoring-work-shift-detail-sheet.tsx:50`

### 3. `date-time.spec.ts` is very thin for a widely reused helper

- `test/utils/date-time.spec.ts:4-16` contains only two tests

But the source utility is used broadly across:

- dashboard/date rendering
- planning transformers
- history formatting
- work-shift-slot forms

This is meaningful coverage, not fake coverage, but it is not deep coverage.

## Brittle or weak tests

### 1. One test file carries all current lint warnings

- `pnpm run lint` reported `16` warnings
- All warnings are in `test/modules/work-shift-slots/work-shift-slots-service.spec.ts`

Examples:

- `test/modules/work-shift-slots/work-shift-slots-service.spec.ts:197`
- `test/modules/work-shift-slots/work-shift-slots-service.spec.ts:208`
- `test/modules/work-shift-slots/work-shift-slots-service.spec.ts:820-835`
- `test/modules/work-shift-slots/work-shift-slots-service.spec.ts:866`
- `test/modules/work-shift-slots/work-shift-slots-service.spec.ts:893`
- `test/modules/work-shift-slots/work-shift-slots-service.spec.ts:910`

The repeated `!` assertions weaken the signal from an otherwise valuable integration suite.

### 2. History-trace assertions rely on polling

- `test/modules/work-shift-slots/work-shift-slots-service.spec.ts:138-153`

The helper retries up to 10 times with a timer to wait for a fire-and-forget history trace. That makes the suite more timing-sensitive than the rest of the repository.

## What could not be verified

- Exact percentage coverage for the repository
- Exact percentage coverage for `/src/utils`
- Any branch/function/statement coverage target, because the current `pnpm run test` output does not include a coverage report

## Notes on repository structure

The request referenced `/tests`, but the repository uses `/test`. Review conclusions in this file are based on the actual `test/` directory present in the repo.

## TODO

- [ ] Add direct specs for the five untested utility files: `client-cookie`, `format-work-shift-check-time`, `cep-mask`, `cnpj-mask`, and `time-mask`.
- [ ] Add direct tests for `formatMoneyDisplay`, not just `applyMoneyMask`.
- [ ] Expand `date-time.spec.ts` with more edge cases because the helper is reused across multiple modules.
- [ ] Add focused tests for `history-traces-formatter.ts` and `planning-transformer.ts`.
- [ ] Add direct tests for high-value server actions, especially `payment-requests-actions.ts`, `work-shift-slots-actions.ts`, and `users-actions.ts`.
- [ ] Add explicit weekly-path tests for `monitoringService().getWeekly()`.
- [ ] Remove the 16 non-null assertions from `work-shift-slots-service.spec.ts` and replace them with safer assertions.
- [ ] Reduce timing sensitivity in history-trace assertions by avoiding ad hoc polling where possible.
- [ ] Add a coverage command/report if 100% claims are expected in future reviews.
