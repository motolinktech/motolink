export const ROLE_PERMISSIONS = [
  {
    role: "ADMIN",
    label: "Administrador",
    permissions: [],
  },
  {
    role: "MANAGER",
    label: "Gerente",
    permissions: [
      "users.view",
      "users.create",
      "users.edit",
      "users.delete",
      "groups.view",
      "groups.create",
      "groups.edit",
      "groups.delete",
      "regions.view",
      "regions.create",
      "regions.edit",
      "regions.delete",
      "clients.view",
      "clients.create",
      "clients.edit",
      "clients.delete",
      "deliverymen.view",
      "deliverymen.create",
      "deliverymen.edit",
      "deliverymen.delete",
      "payment-requests.view",
      "payment-requests.edit",
    ],
  },
  {
    role: "USER",
    label: "Usuário",
    permissions: ["operational.view", "operational.create", "operational.edit", "payment-requests.view"],
  },
];

export const PERMISSION_MODULES = [
  { key: "users", label: "Colaboradores" },
  { key: "clients", label: "Clientes" },
  { key: "groups", label: "Grupos" },
  { key: "regions", label: "Regiões" },
  { key: "deliverymen", label: "Entregadores" },
  { key: "operational", label: "Operacional" },
  { key: "payment-requests", label: "Solicitações de Pagamento" },
] as const;

export const PERMISSION_ACTIONS = [
  { key: "view", label: "Visualizar" },
  { key: "create", label: "Criar" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Excluir" },
] as const;

export type PermissionModuleKey = (typeof PERMISSION_MODULES)[number]["key"];
export type PermissionActionKey = (typeof PERMISSION_ACTIONS)[number]["key"];

export const buildPermissionKey = (module: PermissionModuleKey, action: PermissionActionKey) => `${module}.${action}`;
