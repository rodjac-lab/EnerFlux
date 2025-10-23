export const HELP = {
  battery: {
    socMin: "Niveau de reserve minimal: on arrete la decharge en dessous.",
    socMax: "Niveau maximal: on arrete la charge au-dessus."
  },
  ecs: {
    target: "Temperature d'eau souhaitee.",
    pRes: "Puissance de la resistance electrique (kW)."
  },
  heating: {
    capacity: "Represente l'inertie thermique du logement: plus elle est elevee, plus la temperature varie lentement.",
    losses: "Coefficient de pertes vers l'exterieur (W/K). Des valeurs elevees exigent davantage d'appoint pour tenir la consigne.",
    hysteresis: "Marge autour de la consigne pour eviter les cycles marche/arret rapides (ex: 0.5 K)."
  },
  pool: {
    power: "Puissance fixe de la pompe pendant la filtration.",
    minHours: "Nombre d'heures a assurer chaque jour (rattrapage hors plage si besoin).",
    window: "Plage horaire privilegiee pour profiter du surplus PV.",
    catchUp: "Heure a partir de laquelle on force le fonctionnement pour terminer les heures manquantes."
  },
  ev: {
    session:
      "La borne repartit la puissance demandee entre l'heure d'arrivee et de depart. Si le depart est avant l'arrivee, la session se poursuit le lendemain."
  },
  kpi: {
    selfConsumption: "Part du PV consommee directement sur place.",
    selfProduction: "Part des besoins couverts par le PV.",
    cycles: "Approximation du nombre de cycles de batterie.",
    netCost: "Cout d'import moins revenu exporte, en euros.",
    investment: "Estimation grossiere du cout d'installation PV + batterie (prix catalogue residentiel, hors aides).",
    gridOnlyCost: "Facture si l'on alimentait 100 % des besoins via le reseau (sans PV ni batterie).",
    deltaGrid: "Economie nette par rapport au scenario 'tout reseau'. Valeur positive = economies.",
    savingsRate: "Part du cout reseau evitee grace au PV/batterie sur la periode simulee.",
    payback: "Temps de retour simplifie: investissement estime divise par les economies annualisees (hors aides et maintenance).",
    heatingComfort:
      "Part des pas de temps ou la temperature du logement reste dans la bande de confort (consigne moins l'hysteresis).",
    poolCompletion:
      "Heures de filtration effectuees par rapport a l'objectif quotidien cumule sur la periode simulee.",
    evCompletion:
      "Energie delivree au VE par rapport au besoin total des sessions ayant effectivement demarre."
  },
  strategy: {
    ecsFirst: "Priorite ECS pure: aucun helper, utile comme scenario de reference.",
    ecsHysteresis: "Active l'hysteresis ECS pour lisser les declenchements: on recharge seulement apres avoir suffisamment refroidi.",
    deadlineHelper: "Combine hysteresis et prechauffe anticipee juste avant la deadline afin de limiter secours ou penalites.",
    batteryFirst: "Recharge d'abord la batterie; l'ECS passe ensuite ou en cas d'urgence (deadline).",
    mixSoc: "Bascule batterie/ECS selon un seuil de SOC ajustable.",
    reserveEvening: "Construit une reserve de SOC avant la pointe du soir, puis redonne la priorite a l'ECS quand la fenetre critique approche.",
    evDepartureGuard:
      "Preserve une marge de batterie avant la fenetre VE puis accelere la charge quand le depart approche pour eviter l'import reseau tardif.",
    multiEquipment:
      "Priorise l'ECS puis le chauffage selon l'ecart a la consigne tout en honorant les fenetres critiques VE/piscine avant de charger la batterie.",
    noControlOffpeak: "Aucune optimisation PV: chauffe-eau heures creuses classique (2h-6h), surplus PV exporte au reseau. Baseline de reference pour mesurer les gains.",
    noControlHysteresis: "Aucune optimisation PV: thermostat simple ON/OFF sans consideration de l'heure, surplus PV exporte. Comportement pre-pilotage intelligent."
  },
  compare: {
    overview: "Comparaison directe des deux strategies sur le meme scenario. Les indicateurs condensés permettent de visualiser rapidement les differences de performance."
  }
} as const;

export type HelpConfig = typeof HELP;
