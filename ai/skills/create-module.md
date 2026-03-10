# Skill: create-module

## Inputs

Before starting, collect the following from the user:

| Input | Description | Example |
|---|---|---|
| **Module name** | The module's kebab-case name | `work-orders` |
| **Prisma models** | One or more existing Prisma model names to use as reference for DB access | `WorkOrder`, `Branch` |
| **Service methods** | List of methods the service must expose, with an optional short description for each | `create`, `getById`, `listAll — paginated, filterable by branchId`, `updateStatus — only changes the status field` |

Use these inputs to drive every decision: file names, Zod schema fields, service method signatures, and `db.*` calls.

---

## Purpose

Guide an AI agent to create a new feature module in the Motolink project, following established architectural patterns: functional factories, neverthrow Result types, Zod validation, and direct Prisma database access.

Do not modify the Prisma schema — use only the models provided as input.

---

## Module File Structure

Create the following files inside `src/modules/{module-name}/`:

```
src/modules/{module-name}/
  {module-name}-types.ts       # Zod schemas and inferred TypeScript types
  {module-name}-service.ts     # Functional factory with business logic
  {module-name}-actions.ts     # (Optional) Next.js server actions
```

**Naming rules:**
- Folder and file names: `kebab-case`
- All files are prefixed with the module name (e.g., `orders-types.ts`, not `types.ts`)
- No barrel `index.ts` — consumers import by direct relative path

---

## 1. Types File (`{module-name}-types.ts`)

Use Zod for all schema definitions. Infer TypeScript types from schemas — do not write types manually.

```typescript
import { z } from "zod";

// Example: mutation schema
export const widgetMutateSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  branchId: z.string().uuid(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type WidgetMutateDTO = z.infer<typeof widgetMutateSchema>;

// Example: list/query schema with pagination
export const widgetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  branchId: z.string().optional(),
});

export type WidgetListQueryDTO = z.infer<typeof widgetListQuerySchema>;
```

**Rules:**
- Use `z.coerce.number()` for query params (they arrive as strings)
- Always set `.default()` on pagination fields
- Cap `pageSize` with `.max(100)`
- Enum arrays from constants use `z.enum(arr as [string, ...string[]])`
- Use `z.input<typeof schema>` when you need the pre-coercion input type
- All Zod validation messages (the `message:` strings in `.min()`, `.max()`, `.regex()`, `.uuid()`, etc.) must be written in **Portuguese**

---

## 2. Service File (`{module-name}-service.ts`)

The service is a **functional factory**: a plain function that returns an object of async methods. No classes, no state.

```typescript
import { errAsync, okAsync } from "neverthrow";
import { db } from "@/lib/database";
import type { WidgetMutateDTO, WidgetListQueryDTO } from "./widgets-types";

export function widgetsService() {
  return {
    async create(body: WidgetMutateDTO, loggedUserId: string) {
      try {
        const widget = await db.widget.create({ data: body });
        return okAsync(widget);
      } catch (error) {
        console.error("Error creating widget:", error);
        return errAsync({ reason: "Could not create widget", statusCode: 500 });
      }
    },

    async getById(id: string) {
      try {
        const widget = await db.widget.findUnique({ where: { id } });

        if (!widget) {
          return errAsync({ reason: "Widget not found", statusCode: 404 });
        }

        return okAsync(widget);
      } catch (error) {
        console.error("Error fetching widget:", error);
        return errAsync({ reason: "Could not fetch widget", statusCode: 500 });
      }
    },

    async listAll(query: WidgetListQueryDTO) {
      try {
        const { page, pageSize, search } = query;
        const skip = (page - 1) * pageSize;

        const where = search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {};

        const [total, data] = await Promise.all([
          db.widget.count({ where }),
          db.widget.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
          }),
        ]);

        return okAsync({
          data,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        });
      } catch (error) {
        console.error("Error listing widgets:", error);
        return errAsync({ reason: "Could not list widgets", statusCode: 500 });
      }
    },

    async update(id: string, body: WidgetMutateDTO, loggedUserId: string) {
      try {
        const existing = await db.widget.findUnique({ where: { id } });

        if (!existing) {
          return errAsync({ reason: "Widget not found", statusCode: 404 });
        }

        const updated = await db.widget.update({ where: { id }, data: body });
        return okAsync(updated);
      } catch (error) {
        console.error("Error updating widget:", error);
        return errAsync({ reason: "Could not update widget", statusCode: 500 });
      }
    },

    async delete(id: string, loggedUserId: string) {
      try {
        const existing = await db.widget.findUnique({ where: { id } });

        if (!existing) {
          return errAsync({ reason: "Widget not found", statusCode: 404 });
        }

        await db.widget.delete({ where: { id } });
        return okAsync({ id });
      } catch (error) {
        console.error("Error deleting widget:", error);
        return errAsync({ reason: "Could not delete widget", statusCode: 500 });
      }
    },
  };
}
```

**Rules:**
- Every method is `async` and wrapped in `try/catch`
- Return `okAsync(value)` on success
- Return `errAsync({ reason: string, statusCode: number })` on all errors
- Business/validation errors: use specific HTTP status codes (400, 401, 403, 404, 422)
- Unexpected/DB errors: always use `statusCode: 500` and `console.error(...)` first
- `reason` strings must be written in **Portuguese** — internal `console.error` messages stay in English
- Use `db.*` directly from `@/lib/database` — no repository layer
- Parallel DB queries: use `Promise.all([...])`
- Services are stateless — each call to `widgetsService()` creates a fresh instance

---

## 3. Cross-Module Dependencies

Call other service factories directly. For **non-critical** side effects (e.g., audit logging), use fire-and-forget:

```typescript
import { historyTracesService } from "../history-traces/history-traces-service";
import { historyTraceActionConst, historyTraceEntityConst } from "@/constants/history-trace";

// Inside a service method, after successful operation:
historyTracesService()
  .create({
    userId: loggedUserId,
    action: historyTraceActionConst.CREATED,
    entityType: historyTraceEntityConst.WIDGET, // add to constants if needed
    entityId: widget.id,
    newObject: widget,
  })
  .catch(() => {}); // fire-and-forget — do not await, do not propagate errors
```

---

## 4. Server Actions (Optional)

Only create `{module-name}-actions.ts` when the module needs Next.js server actions (e.g., form submissions from client components).

```typescript
"use server";

import { safeAction } from "@/lib/safe-action";
import { widgetsService } from "./widgets-service";
import { widgetMutateSchema } from "./widgets-types";

export const createWidgetAction = safeAction
  .inputSchema(widgetMutateSchema)
  .action(async ({ parsedInput }) => {
    const res = await widgetsService().create(parsedInput, "system");

    if (res.isErr()) {
      return res.error;
    }

    const widget = res.value;
    return widget;
  });
```

**Rules:**
- Always add `"use server"` directive at the top
- Use `safeAction` from `@/lib/safe-action` — do not use raw Next.js actions
- Check `res.isErr()` before accessing `res.value`
- Return `res.error` directly on failure (it has the `{ reason, statusCode }` shape)
- Destructure or return `res.value` on success

---

## 5. Consuming the Service

```typescript
// In any server-side code (server component, action, middleware):
const result = await widgetsService().getById(id);

if (result.isErr()) {
  // result.error is { reason: string, statusCode: number }
  console.error(result.error.reason);
  return;
}

const widget = result.value;
```

---

## 6. Key Patterns Cheatsheet

| Concern | Pattern |
|---|---|
| Service shape | `export function fooService() { return { async method() {} } }` |
| Success return | `return okAsync(data)` |
| Known error | `return errAsync({ reason: "...", statusCode: 4xx })` |
| Unexpected error | `console.error(...); return errAsync({ reason: "...", statusCode: 500 })` |
| Database access | `import { db } from "@/lib/database"` — use `db.*` directly |
| Type definitions | Zod schema + `z.infer<typeof schema>` |
| Server actions | `safeAction.inputSchema(schema).action(async ({ parsedInput }) => { ... })` |
| Cross-module call | `otherService().method(args).catch(() => {})` for fire-and-forget |
| Pagination | `skip = (page - 1) * pageSize`, return `{ data, pagination: { page, pageSize, total, totalPages } }` |
| Imports | Always import by direct relative path — no barrel `index.ts` |
