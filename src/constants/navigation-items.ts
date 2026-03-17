import { CirclePlus, DollarSignIcon, Home, Target } from "lucide-react";

export const navigationItems = [
  {
    title: "Dashboard",
    icon: Home,
    url: "/dashboard",
    requiredPermission: null,
  },
  {
    title: "Operacional",
    icon: Target,
    items: [
      {
        title: "Planejamento",
        url: "/operacional/planejamento",
        requiredPermission: "operational.view",
      },
      {
        title: "Monitoramento Diario",
        url: "/operacional/monitoramento/diario",
        requiredPermission: "operational.view",
      },
      {
        title: "Monitoramento Semanal",
        url: "/operacional/monitoramento/semanal",
        requiredPermission: "operational.view",
      },
    ],
  },
  {
    title: "Financeiro",
    icon: DollarSignIcon,
    items: [
      {
        title: "Freelancer",
        url: "/financeiro/freelancer",
        requiredPermission: "payment-requests.view",
      },
      {
        title: "Colaborador Independente",
        url: "/financeiro/colaborador-independente",
        requiredPermission: "payment-requests.view",
      },
    ],
  },
  {
    title: "Gestão",
    icon: CirclePlus,
    items: [
      {
        title: "Clientes",
        url: "/gestao/clientes",
        requiredPermission: "clients.view",
      },
      {
        title: "Entregadores",
        url: "/gestao/entregadores",
        requiredPermission: "deliverymen.view",
      },
      {
        title: "Grupos",
        url: "/gestao/grupos",
        requiredPermission: "groups.view",
      },
      {
        title: "Regiões",
        url: "/gestao/regioes",
        requiredPermission: "regions.view",
      },
      {
        title: "Colaboradores",
        url: "/gestao/colaboradores",
        requiredPermission: "users.view",
      },
    ],
  },
];
