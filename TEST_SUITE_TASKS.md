# Test Suite Tasks

## Broken Suites

- [x] Fix `work-shift-slots` suite failures in [test/modules/work-shift-slots/work-shift-slots-service.spec.ts](/home/jv77/Documents/dev/motolink/test/modules/work-shift-slots/work-shift-slots-service.spec.ts)
  - Failing tests:
    - `should create a work shift slot when id is undefined`
    - `should create a work shift slot with a deliveryman`
    - `should update the work shift slot when id is provided`
  - Root cause:
    - [src/modules/work-shift-slots/work-shift-slots-service.ts:26](/home/jv77/Documents/dev/motolink/src/modules/work-shift-slots/work-shift-slots-service.ts:26) and [src/modules/work-shift-slots/work-shift-slots-service.ts:42](/home/jv77/Documents/dev/motolink/src/modules/work-shift-slots/work-shift-slots-service.ts:42) pass the DTO directly into Prisma `update()` and `create()`.
    - The DTO still includes `isFreelancer` at [src/modules/work-shift-slots/work-shift-slots-types.ts:13](/home/jv77/Documents/dev/motolink/src/modules/work-shift-slots/work-shift-slots-types.ts:13), but the Prisma model no longer has that field at [prisma/schema.prisma:228](/home/jv77/Documents/dev/motolink/prisma/schema.prisma:228).
    - The update path also fails on scalar relation fields like `clientId`, where Prisma expects relation input.
  - Done:
    - Added explicit Prisma payload mappers in the service and stopped passing the raw DTO directly into `create()` and `update()`.
    - Dropped the stale `isFreelancer` field from the Prisma write payload.
    - Verified with `pnpm exec vitest run test/modules/work-shift-slots/work-shift-slots-service.spec.ts` (`24` tests passed).

- [x] Fix `planning` date-range failure in [test/modules/planning/planning-service.spec.ts:212](/home/jv77/Documents/dev/motolink/test/modules/planning/planning-service.spec.ts:212)
  - Failing test:
    - `should filter by date range (startAt and endAt)`
  - Root cause:
    - [src/modules/planning/planning-service.ts:15](/home/jv77/Documents/dev/motolink/src/modules/planning/planning-service.ts:15) and [src/modules/planning/planning-service.ts:52](/home/jv77/Documents/dev/motolink/src/modules/planning/planning-service.ts:52) convert date-only values with `dayjs(...).toISOString()`.
    - [src/modules/planning/planning-transformer.ts:4](/home/jv77/Documents/dev/motolink/src/modules/planning/planning-transformer.ts:4) formats back with local-time `dayjs(...).format("YYYY-MM-DD")`.
    - Current behavior produces an off-by-one-day result in local time for date-only values.
  - Done:
    - Normalized planning date-only parsing, querying, and formatting to UTC in the planning module.
    - Verified with `pnpm exec vitest run test/modules/planning/planning-service.spec.ts` (`9` tests passed).

## Test Infrastructure

- [x] Refactor database cleanup helper at [test/helpers/clean-database.ts:22](/home/jv77/Documents/dev/motolink/test/helpers/clean-database.ts:22)
  - Every suite creates a new `pg.Pool`, truncates the full database, and closes the pool in `beforeEach`.
  - This is the main cross-suite performance and maintenance issue.
  - Done:
    - Replaced per-test pool creation with a shared module-level `pg.Pool`.
    - Kept the cleanup contract unchanged while removing the per-test pool churn.

- [x] Remove obsolete Docker Compose config warning from `docker-compose.yml`
  - Test setup logs that the `version` attribute is obsolete.
  - Done:
    - Removed the obsolete top-level `version` key from `docker-compose.yml`.

- [x] Investigate test teardown network warning
  - Teardown logs `Network motolink_default Resource is still in use`.
  - Done:
    - Changed test teardown to stop and remove only the `test-db` service instead of running `docker compose down`, which was trying to remove a shared network.
    - Added `--no-deps` to test startup so setup only brings up the test database service.

## Suite Refactors

- [ ] Refactor [test/modules/work-shift-slots/work-shift-slots-service.spec.ts:120](/home/jv77/Documents/dev/motolink/test/modules/work-shift-slots/work-shift-slots-service.spec.ts:120)
  - Break the suite into clearer sections.
  - Move nested `.getById` and `.listAll` blocks out of `.upsert`.
  - Reduce monolithic fixture setup and duplicated DTO usage.

- [ ] Strengthen date-only coverage in [test/modules/planning/planning-service.spec.ts](/home/jv77/Documents/dev/motolink/test/modules/planning/planning-service.spec.ts)
  - Add explicit boundary tests for `startAt`, `endAt`, persisted date-only values, and transformed output.

- [ ] Revisit contract expectations in [test/modules/sessions/sessions-service.spec.ts:180](/home/jv77/Documents/dev/motolink/test/modules/sessions/sessions-service.spec.ts:180)
  - The suite currently locks in `500` for deleting a non-existent token.
  - Confirm whether this is intended business behavior or just an implementation leak.

- [ ] Split phone-normalization concerns from transport behavior in [test/modules/whatsapp/whatsapp-service.spec.ts:103](/home/jv77/Documents/dev/motolink/test/modules/whatsapp/whatsapp-service.spec.ts:103)
  - Keep one HTTP contract test.
  - Move phone-format assertions into smaller formatter-focused tests.

- [ ] Make monitoring assertions less order-sensitive in [test/modules/monitoring/monitoring-service.spec.ts:123](/home/jv77/Documents/dev/motolink/test/modules/monitoring/monitoring-service.spec.ts:123)
  - In particular, review order-coupled expectations like [test/modules/monitoring/monitoring-service.spec.ts:179](/home/jv77/Documents/dev/motolink/test/modules/monitoring/monitoring-service.spec.ts:179).

- [ ] Reduce repetition in [test/modules/clients/clients-service.spec.ts](/home/jv77/Documents/dev/motolink/test/modules/clients/clients-service.spec.ts)
  - Extract shared builders/factories.
  - Convert repeated filter assertions into table-driven cases.

- [ ] Improve isolation in [test/modules/history-traces/history-traces-service.spec.ts](/home/jv77/Documents/dev/motolink/test/modules/history-traces/history-traces-service.spec.ts)
  - Avoid using the same service path under test to seed fixtures for other tests when possible.

- [ ] Convert mask suites to table-driven cases where useful
  - Candidate files:
    - [test/utils/masks/money-mask.spec.ts](/home/jv77/Documents/dev/motolink/test/utils/masks/money-mask.spec.ts)
    - [test/utils/masks/phone-mask.spec.ts](/home/jv77/Documents/dev/motolink/test/utils/masks/phone-mask.spec.ts)
    - [test/utils/masks/date-mask.spec.ts](/home/jv77/Documents/dev/motolink/test/utils/masks/date-mask.spec.ts)
    - [test/utils/masks/cpf-mask.spec.ts](/home/jv77/Documents/dev/motolink/test/utils/masks/cpf-mask.spec.ts)
    - [test/utils/masks/clean-mask.spec.ts](/home/jv77/Documents/dev/motolink/test/utils/masks/clean-mask.spec.ts)
