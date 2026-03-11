# Plano: Interface CRUD de Entregadores

## Context

Criar a interface completa de CRUD para o módulo de entregadores (`deliverymen`), seguindo o padrão estabelecido pelo fluxo de `colaboradores`. O módulo de serviço e tipos já existem em `src/modules/deliverymen/`. Faltam: as 4 páginas de rota, o componente de formulário, o componente de tabela, e o arquivo de actions.

---

## Arquivos a Criar (8 arquivos)

### 1. `src/modules/deliverymen/deliverymen-actions.ts` — Server Actions

- `mutateDeliverymanAction` — safeAction com schema de formulário (novo schema `deliverymanFormSchema` nos types)
  - Lê `loggedUserId` e `branchId` dos cookies
  - Limpa máscaras de phone e document com `cleanMask()`
  - Upload de arquivos é feito no client (padrão do user-form)
  - Se `id` existe → `deliverymenService().update()`, senão → `deliverymenService().create()`
  - Revalida `/gestao/entregadores` e `/gestao/entregadores/${id}`
- `deleteDeliverymanAction(id)` — função async server
  - Chama `deliverymenService().delete(id, loggedUserId)`
  - Revalida `/gestao/entregadores`
- `toggleBlockDeliverymanAction(id)` — função async server
  - Chama `deliverymenService().toggleBlock(id, loggedUserId)`
  - Revalida `/gestao/entregadores` e `/gestao/entregadores/${id}`

Referência: `src/modules/regions/regions-actions.ts`, `src/modules/users/users-actions.ts`

### 2. `src/modules/deliverymen/deliverymen-types.ts` — Adicionar form schema

Adicionar `deliverymanFormSchema` (para uso no formulário client-side) ao arquivo existente:
```ts
export const deliverymanFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  document: z.string().min(1, "Documento é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  contractType: z.string().min(1, "Tipo de contrato é obrigatório"),
  mainPixKey: z.string().min(1, "Chave Pix principal é obrigatória"),
  secondPixKey: z.string().optional(),
  thridPixKey: z.string().optional(),
  agency: z.string().optional(),
  account: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleColor: z.string().optional(),
  files: z.array(z.string()).default([]),
  regionId: z.string().optional(),
});
export type DeliverymanFormInput = z.infer<typeof deliverymanFormSchema>;
```

### 3. `src/app/(private)/gestao/entregadores/page.tsx` — Lista

- Server Component
- Lê `searchParams`: page, pageSize, search
- Lê branchId do cookie
- Chama `deliverymenService().listAll({ page, pageSize, search, branchId })`
- Renderiza: ContentHeader (`[{ title: "Entregadores" }]`), TextSearch, Button "Adicionar entregador" → `/gestao/entregadores/novo`, DeliverymenTable, TablePagination
- Alert destructive se erro

Referência: `src/app/(private)/gestao/colaboradores/page.tsx`

### 4. `src/app/(private)/gestao/entregadores/novo/page.tsx` — Criar

- Server Component
- Busca regiões: `regionsService().listAll({ page: 1, pageSize: 100, branchId })`
- Breadcrumbs: `[{ title: "Entregadores", href: "/gestao/entregadores" }, { title: "Novo Entregador" }]`
- Renderiza DeliverymanForm com `regions`, `redirectTo="/gestao/entregadores"`

Referência: `src/app/(private)/gestao/colaboradores/novo/page.tsx`

### 5. `src/app/(private)/gestao/entregadores/[id]/page.tsx` — Detalhes

- Server Component
- Busca entregador por ID + regiões (para mapear nome da região)
- `notFound()` se não encontrar
- Seções:
  - **Header**: Nome, status badge (Ativo/Bloqueado baseado em `isBlocked`), botões de ação (editar, excluir, bloquear/desbloquear)
  - **Informações Pessoais**: Nome, Documento, Telefone
  - **Dados Financeiros**: Chave Pix principal/secundária/terciária, Conta, Agência
  - **Veículo**: Modelo, Placa, Cor
  - **Documentos**: Links de arquivo
  - **Metadata**: Criado em, Atualizado em
- Componente `DeliverymanDetailActions` inline ou separado para editar/excluir/bloquear

Referência: `src/app/(private)/gestao/colaboradores/[id]/page.tsx`

### 6. `src/app/(private)/gestao/entregadores/[id]/editar/page.tsx` — Editar

- Server Component
- Busca entregador + regiões em paralelo com `Promise.all`
- `notFound()` se não encontrar
- Monta `defaultValues` aplicando máscaras (applyPhoneMask, applyCpfMask)
- Breadcrumbs: `[Entregadores → nome → Editar]`
- Renderiza DeliverymanForm com `isEditing`, `defaultValues`, `regions`, `redirectTo`

Referência: `src/app/(private)/gestao/colaboradores/[id]/editar/page.tsx`

### 7. `src/components/forms/deliveryman-form.tsx` — Formulário

- Client Component (`"use client"`)
- Props: `regions: { id, name }[]`, `defaultValues?`, `isEditing?`, `redirectTo?`
- `useForm` + `zodResolver(deliverymanFormSchema)`
- `useAction(mutateDeliverymanAction)`
- Seções (FieldSet/FieldLegend):
  - **Informações Pessoais**: name, document (CPF mask), phone (phone mask), contractType (Select com ContractTypeOptions)
  - **Dados Financeiros**: mainPixKey, secondPixKey (visível se mainPixKey preenchido), thridPixKey (visível se secondPixKey preenchido), conta, agência
  - **Veículo**: vehicleModel (Select com vehicleTypesConst), vehicleColor (Select com colorsConst), vehiclePlate
  - **Documentos**: FileInput (multi-file upload com Firebase storage "deliverymen")
  - **Localização**: regionId (Select com regiões)
- Lógica de visibilidade condicional para chaves pix via `watch()`
- Alert inline para erros de servidor
- Toast para sucesso/erro
- Botão: "Salvar Alterações" / "Criar Entregador"

Referência: `src/components/forms/user-form.tsx`

### 8. `src/components/tables/deliverymen-table.tsx` — Tabela

- Client Component (`"use client"`)
- Props: `deliverymen: Deliveryman[]` (id, name, phone, document, isBlocked)
- Colunas: Nome, Telefone (com máscara), Documento (com máscara), Status (badge Ativo/Bloqueado)
- Ações por linha:
  - **Visualizar** (EyeIcon) → link `/gestao/entregadores/{id}`
  - **Editar** (PencilIcon) → link `/gestao/entregadores/{id}/editar`
  - **Bloquear/Desbloquear** (ShieldBanIcon/ShieldCheckIcon) → AlertDialog de confirmação → `toggleBlockDeliverymanAction`
  - **Excluir** (Trash2Icon) → AlertDialog de confirmação → `deleteDeliverymanAction`
- Empty state: Alert info "Nenhum entregador cadastrado ainda."
- TooltipProvider envolvendo tudo
- TableCaption com total

Referência: `src/components/tables/users-table.tsx`

---

## Arquivos Existentes a Reutilizar

| Arquivo | Uso |
|---|---|
| `src/modules/deliverymen/deliverymen-service.ts` | Já tem create, update, getById, listAll, delete, toggleBlock |
| `src/modules/deliverymen/deliverymen-types.ts` | Editar para adicionar deliverymanFormSchema |
| `src/modules/regions/regions-service.ts` | Buscar regiões para o select |
| `src/constants/vehicle-type.ts` | vehicleTypesConst para select de modelo |
| `src/constants/colors.ts` | colorsConst para select de cor |
| `src/constants/contract-type.ts` | ContractTypeOptions para select de tipo de contrato |
| `src/utils/masks/cpf-mask.ts` | applyCpfMask |
| `src/utils/masks/phone-mask.ts` | applyPhoneMask |
| `src/utils/masks/clean-mask.ts` | cleanMask (nas actions) |
| `src/components/composite/content-header.tsx` | Breadcrumbs |
| `src/components/composite/text-search.tsx` | Busca na listagem |
| `src/components/composite/table-pagination.tsx` | Paginação |
| `src/components/composite/file-input.tsx` | Upload de arquivos |
| `src/components/composite/status-badge.tsx` | Badge de status (se compatível com Ativo/Bloqueado) |
| `src/lib/firebase.ts` | storage("deliverymen") para upload |
| `src/lib/safe-action.ts` | safeAction wrapper |

---

## Verificação

1. Rodar `npx next build` ou `npx next dev` e navegar para `/gestao/entregadores`
2. Testar criação: `/gestao/entregadores/novo` — preencher formulário, verificar máscaras, verificar visibilidade condicional das chaves pix
3. Testar listagem: verificar busca, paginação, colunas com máscaras
4. Testar detalhes: clicar em "Ver detalhes" na tabela
5. Testar edição: verificar que defaultValues são carregados com máscaras
6. Testar bloqueio/desbloqueio: confirmar dialog, verificar mudança de status
7. Testar exclusão: confirmar dialog, verificar remoção da lista
8. Verificar que todos os textos visíveis estão em Português
