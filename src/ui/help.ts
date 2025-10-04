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
  },
  strategy: {
    ecsFirst: 'Priorité ECS pure : aucun helper, utile comme scénario de référence.',
    ecsHysteresis:
      'Active l’hystérésis ECS pour lisser les déclenchements : on recharge seulement après avoir suffisamment refroidi.',
    deadlineHelper:
      'Combine hystérésis et préchauffe anticipée dans la dernière fenêtre avant la deadline afin de limiter secours ou pénalités.',
    batteryFirst: 'Recharge d’abord la batterie ; l’ECS passe ensuite ou en cas d’urgence (deadline).',
    mixSoc: 'Bascule batterie→ECS selon un seuil de SOC ajustable.'
  }
} as const;

export type HelpConfig = typeof HELP;
