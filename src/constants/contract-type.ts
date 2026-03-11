export const contractTypeConst = {
  FREELANCER: "FREELANCER",
  INDEPENDENT_COLLABORATOR: "INDEPENDENT_COLLABORATOR",
} as const;

export type ContractType = (typeof contractTypeConst)[keyof typeof contractTypeConst];

export const ContractTypeOptions = [
  { label: "Freelancer", value: contractTypeConst.FREELANCER },
  {
    label: "Colaborador Independente",
    value: contractTypeConst.INDEPENDENT_COLLABORATOR,
  },
];
