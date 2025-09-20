export const HELP = {
  battery: {
    socMin: 'Niveau de réserve minimal : on arrête la décharge en dessous.',
    socMax: 'Niveau maximal : on arrête la charge au-delà.'
  },
  ecs: {
    target: 'Température d’eau souhaitée.',
    pRes: 'Puissance de la résistance électrique (kW).'
  },
  kpi: {
    selfConsumption: 'Part du PV consommée directement sur place.',
    selfProduction: 'Part des besoins couverts par le PV.',
    cycles: 'Approximation du nombre de cycles de batterie.',
    netCost: 'Coût d’import moins revenu exporté, en euros.'
  }
} as const;

export type HelpConfig = typeof HELP;
