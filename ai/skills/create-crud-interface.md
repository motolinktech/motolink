---
name: create-crud-interface
description: Create a CRUD interface for a private module following the colaboradores pattern: listing page, create page, details page, edit page, form component, and table component. Use when the user asks to create a new module interface or scaffold pages/forms/tables for a module.
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

# Skill: create-crud-interface

## Inputs

Before starting, collect the following from the user. If any required input is missing, ask for it in **Portuguese** before writing code.

| Input | Required | Description | Example |
|---|---|---|---|
| **Nome do módulo** | Yes | Internal module name used in files, imports, actions, and service references | `users`, `clients`, `deliverymen` |
| **Rota base** | Yes | Route segment for the CRUD pages | `colaboradores`, `clientes`, `entregadores` |
| **Colunas da tabela** | Yes | Columns to render in the list table, in display order | `nome`, `email`, `status` |
| **Ações da tabela** | Yes | Row actions to render in the table | `visualizar`, `editar`, `excluir` |
| **Campos do formulário** | Yes | Inputs/selects/checks/uploads to render in the form | `nome`, `email`, `telefone`, `status` |

If the user does not provide one or more required inputs, ask only for the missing items and wait for the answer.

Suggested Portuguese prompt:

```text
Antes de criar o código, preciso confirmar alguns pontos:

- Nome do módulo:
- Rota base:
- Colunas da tabela:
- Ações da tabela:
- Campos do formulário:
```

---

## Purpose

Guide an AI agent to create a private CRUD interface that follows the same project pattern used by the `colaboradores` flow.

This skill covers:

- private route pages
- list page with filters/search/pagination
- create page
- details page
- edit page
- table component
- form component
- optional server action wiring inside `src/modules/{module-name}/` when the UI needs submission or row actions

This skill does **not** redesign the project structure. It must reuse the current conventions and components already present in the codebase.

---

## First Step: Analyze the Existing Pattern

Before creating code, inspect these files and mirror their architecture:

- `src/app/(private)/gestao/colaboradores/page.tsx`
- `src/app/(private)/gestao/colaboradores/novo/page.tsx`
- `src/app/(private)/gestao/colaboradores/[id]/page.tsx`
- `src/app/(private)/gestao/colaboradores/[id]/editar/page.tsx`
- `src/components/forms/user-form.tsx`
- `src/components/tables/users-table.tsx`
- `src/components/composite/content-header.tsx`
- `src/components/composite/text-search.tsx`
- `src/components/composite/table-pagination.tsx`

Treat `colaboradores` as the source pattern for:

- route layout
- page responsibilities
- file placement
- breadcrumb usage
- search/filter/table layout
- detail page sectioning
- client/server boundaries
- alert/toast feedback behavior

Do not invent a parallel architecture if the current project already provides a pattern.

---

## Route Structure

Always create these four pages under `src/app/(private)/gestao/{route}/`:

```text
src/app/(private)/gestao/{route}/page.tsx
src/app/(private)/gestao/{route}/novo/page.tsx
src/app/(private)/gestao/{route}/[id]/page.tsx
src/app/(private)/gestao/{route}/[id]/editar/page.tsx
```

Rules:

- The list page is the index route: `/gestao/{route}`
- The create page is always: `/gestao/{route}/novo`
- The details page is always: `/gestao/{route}/[id]`
- The edit page is always: `/gestao/{route}/[id]/editar`
- Follow the same breadcrumb pattern used in `colaboradores`

---

## Component Placement

Create or update interface components in these locations:

```text
src/components/forms/{entity-form-name}.tsx
src/components/tables/{entity-table-name}.tsx
```

Naming rules:

- Use existing project naming conventions, not generic names
- Form components use singular intent when the project already does so:
  `user-form.tsx`
- Table components use plural collection intent when the project already does so:
  `users-table.tsx`
- Prefer names derived from the **module name**, not from the route label, unless the project already uses the route term in code
- Keep file names in `kebab-case`
- Export component names in `PascalCase`
- Do not create barrel files

If there is already a better-aligned existing name in the module or service layer, follow that name consistently across form, table, imports, and actions.

---

## Page Responsibilities

### 1. List Page

The list page must be a **Server Component** by default.

Responsibilities:

- read `searchParams`
- parse pagination/filter params
- call the module service for listing
- render destructive `Alert` when the list request fails
- render `ContentHeader`
- render search/filter actions above the table
- render the table component
- render `TablePagination`
- render the primary action button linking to `/gestao/{route}/novo`

Follow the same structural pattern used in:

- `src/app/(private)/gestao/colaboradores/page.tsx`

Use:

- `TextSearch` for textual search when the module needs search
- `SelectSearch` for status/category filters when applicable
- `Alert`, `AlertTitle`, `AlertDescription` for server-side list errors

### 2. Create Page

The create page must be a **Server Component** by default.

Responsibilities:

- load any supporting data required by the form
- render `ContentHeader`
- render the form component
- pass `redirectTo` back to the module list route

### 3. Details Page

The details page must be a **Server Component** by default.

Responsibilities:

- read async `params`
- fetch the entity by id
- call `notFound()` when data is missing or invalid
- organize details into clear sections
- use the same content rhythm used in `colaboradores`: header, sections, separators, metadata

Prefer existing UI building blocks such as:

- `Heading`
- `Text`
- `Badge`
- `Separator`
- `Avatar` or other project components when the entity needs them

### 4. Edit Page

The edit page must be a **Server Component** by default.

Responsibilities:

- read async `params`
- fetch entity data and supporting form data in parallel when possible
- call `notFound()` if the entity does not exist
- map server data into `defaultValues`
- render the same form component used by create mode
- pass `isEditing`
- pass the detail route as `redirectTo`

---

## Form Pattern

The form component must be a **Client Component**.

Follow the current project standard based on `src/components/forms/user-form.tsx`:

- `react-hook-form`
- `zodResolver(...)`
- `useAction(...)` from `next-safe-action/hooks` when submitting to a server action
- controlled integration only where the UI component requires it
- inline persistent error state for server/business errors
- transient success/error feedback with `sonner`

### Form structure

Organize fields into logical sections using:

- `FieldSet`
- `FieldLegend`
- `Field`
- `FieldLabel`
- `FieldError`

Use project UI components instead of raw HTML inputs whenever equivalents exist:

- `Input`
- `Select`
- `Checkbox`
- `BadgeSelect`
- `FileInput`
- `Button`
- table-based permission/option matrices when the interaction matches that pattern

### Form responsibilities

- receive `defaultValues` for edit mode
- support both create and update flows in the same component
- call the correct module action
- surface validation/server failures inline with `Alert`
- surface success/failure feedback with `toast`
- redirect on success when `redirectTo` exists

### Feedback rules

Use both systems below:

#### `Alert`

Use `src/components/ui/alert.tsx` for persistent inline feedback, especially:

- list page fetch failures
- form submission errors that must remain visible after the toast disappears
- empty states when the table has no data, if the table pattern matches `users-table.tsx`

#### `sonner`

Use the shared toast system from `src/components/ui/sonner.tsx` for:

- create success
- update success
- delete success
- transient action errors
- upload failures

Do not add another toast library.

### User-facing language

All text visible to the user must be in **Portuguese**, including:

- button labels
- placeholders
- breadcrumbs
- section titles
- table headers
- confirmation dialogs
- empty states
- validation messages
- alert messages
- toast messages

The skill instructions themselves may be in English, but every user-facing string in generated code must be in Portuguese.

---

## Table Pattern

The table component must be a **Client Component** when it contains interactive row actions such as delete dialogs or optimistic transitions. If the table is purely presentational, it may remain a Server Component, but prefer the `colaboradores` pattern when actions are present.

Follow the same style used in `src/components/tables/users-table.tsx`.

### Table responsibilities

- receive list data via props
- render only the columns requested by the user
- render only the actions requested by the user
- show a friendly empty state with `Alert` when there is no data
- use `Tooltip` around icon actions when helpful
- use `AlertDialog` for destructive confirmations
- use `toast` for delete/action feedback

### Expected action mapping

When requested by the user, map common actions like this:

- `visualizar` → link to `/gestao/{route}/{id}`
- `editar` → link to `/gestao/{route}/{id}/editar`
- `excluir` → confirmation via `AlertDialog`, then action call, then success/error toast

If the user asks for custom actions, render only those actions and keep their labels/messages in Portuguese.

### Table column rules

- Ask the user which columns must be rendered if they did not specify them
- Keep the display order provided by the user
- Use project components like badges/status chips when the data type already has a shared UI component
- Hide less important columns on smaller screens when the current project pattern already does so

---

## Optional Module Action Wiring

This skill is focused on the interface, but it may require server actions inside the existing module.

When needed:

- place actions in `src/modules/{module-name}/{module-name}-actions.ts`
- follow the existing `safeAction` pattern already used in the project
- keep revalidation aligned with the list/detail routes
- do not create actions if the interface can reuse an existing one

Do not redesign the module layer from this skill. Only add the minimal action surface needed by the interface.

---

## Naming and Consistency Rules

- Route segments are defined by the user-provided **Rota base**
- Internal file/component/module names should align with the user-provided **Nome do módulo**
- Keep route naming and module naming distinct when the codebase already separates them
- Page component names should be descriptive and follow the route intent:
  `ClientesPage`, `NovoClientePage`, `ClientePage`, `EditarClientePage`
- Keep breadcrumbs, titles, buttons, and labels consistent with the singular/plural Portuguese terms chosen for the module
- Reuse existing constants, services, composite components, and UI components whenever possible

---

## Next.js Best Practices For This Project

Apply these rules while generating the interface:

- Default pages to **Server Components**
- Mark form/table/action-heavy interactive components with `"use client"`
- In App Router pages, treat `params` and `searchParams` as async values when following the current project pattern
- Fetch independent data with `Promise.all(...)`
- Keep data fetching in pages and business operations in module services/actions
- Use `notFound()` for missing entity pages
- Do not place `route.ts` next to a `page.tsx` unless there is an actual route-handler need
- Prefer existing shared components over ad-hoc markup
- Keep imports direct; do not introduce barrel exports
- Preserve the existing folder conventions already in the repository

---

## Workflow

1. Inspect the current `colaboradores` implementation and any related shared UI components.
2. Collect missing required inputs from the user in Portuguese.
3. Infer the singular/plural Portuguese labels needed for titles, breadcrumbs, buttons, and empty states.
4. Create the four route pages under `src/app/(private)/gestao/{route}/`.
5. Create the form component under `src/components/forms/`.
6. Create the table component under `src/components/tables/`.
7. Add or reuse the minimal module action wiring if the UI requires submission or destructive row actions.
8. Verify that every visible string is in Portuguese.
9. Verify that `Alert` and `sonner` are both used where appropriate.
10. Verify that the generated structure still matches the `colaboradores` project pattern.

---

## Output Expectations

When using this skill, the generated code should feel like it belongs in the repository already.

It must:

- look consistent with `colaboradores`
- ask for missing inputs before coding
- keep user-facing text in Portuguese
- use `Alert` and `sonner` intentionally for UX
- follow the route/file naming conventions above
- avoid speculative abstractions that the current project does not use
