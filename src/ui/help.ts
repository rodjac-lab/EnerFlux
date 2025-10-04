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
    netCost: 'Coût d’import moins revenu exporté, en euros.',
    investment:
      'Estimation grossière du coût d’installation PV + batterie (prix catalogue résidentiel, hors aides).',
    gridOnlyCost: 'Facture si l’on alimentait 100 % des besoins via le réseau (sans PV ni batterie).',
    deltaGrid: 'Économie nette par rapport au scénario « tout réseau ». Valeur positive = économies.',
    savingsRate: 'Part du coût réseau évitée grâce au PV/batterie sur la période simulée.',
    payback:
      'Temps de retour simplifié : investissement estimé divisé par les économies annualisées (hors aides et maintenance).'
  },
  strategy: {
    ecsFirst: 'Priorité ECS pure : aucun helper, utile comme scénario de référence.',
    ecsHysteresis:
      'Active l’hystérésis ECS pour lisser les déclenchements : on recharge seulement après avoir suffisamment refroidi.',
    deadlineHelper:
      'Combine hystérésis et préchauffe anticipée dans la dernière fenêtre avant la deadline afin de limiter secours ou pénalités.',
    batteryFirst: 'Recharge d’abord la batterie ; l’ECS passe ensuite ou en cas d’urgence (deadline).',
    mixSoc: 'Bascule batterie→ECS selon un seuil de SOC ajustable.',
    reserveEvening:
      'Construit une réserve de SOC avant la pointe du soir, puis redonne la priorité à l’ECS quand la fenêtre critique approche.'
  },
  compare: {
    overview:
      'Les cartes et tableaux ci-dessous regroupent les indicateurs clés des stratégies A et B pour une lecture rapide, même lorsque plusieurs métriques sont affichées simultanément.',
    condensedView:
      'Les cartes présentent les ratios énergétiques (autoconsommation, autoproduction, cycles, service ECS) avec un badge Δ qui met en avant la stratégie la plus performante.',
    financeView:
      'Le tableau financier rassemble les coûts/recettes et indicateurs de rentabilité afin de suivre l’impact économique de chaque stratégie.'
  }
} as const;

export type HelpConfig = typeof HELP;
