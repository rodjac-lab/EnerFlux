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
    selfConsumption: "AUTOCONSOMMATION : Part du PV consommee directement sur place (sans passer par le reseau). Formule : (PV consomme sur site) / (PV total produit). Exemple : 80% signifie que 80% de votre production solaire est utilisee immediatement, et 20% est exportee vers le reseau. Plus c'est eleve, mieux c'est (moins de dependance au reseau).",
    selfProduction: "AUTOPRODUCTION : Part de vos besoins energetiques couverts par votre PV. Formule : (PV consomme sur site) / (Consommation totale). Exemple : 70% signifie que 70% de votre consommation provient de votre production solaire, et 30% doit etre importe du reseau. Plus c'est eleve, plus vous etes autonome.",
    cycles: "CYCLES BATTERIE : Approximation du nombre de cycles complets charge-decharge de la batterie sur la periode. Formule : (Energie totale chargee) / (2 × Capacite batterie). Exemple : 0.5 cycles/jour = la batterie fait un demi-cycle quotidien. Important pour estimer la duree de vie (typiquement 3000-6000 cycles garantis).",
    netCost: "COUT NET : Cout d'import d'electricite MOINS revenu de l'export, en euros. Formule : (Import × Prix import) - (Export × Prix export). VALEUR NEGATIVE = GAIN (vous vendez plus que vous n'achetez). VALEUR POSITIVE = COUT (vous achetez plus que vous ne vendez). Exemple : -15€ signifie un gain de 15€ sur la periode.",
    investment: "INVESTISSEMENT ESTIME : Estimation grossiere du cout d'installation PV + batterie (prix catalogue residentiel typique, hors aides et subventions). Utilise pour calculer le temps de retour. Ordre de grandeur : 1500-2000€/kWc pour le PV, 500-800€/kWh pour la batterie.",
    gridOnlyCost: "COUT SANS PV : Facture theorique si vous n'aviez ni panneaux PV ni batterie et que vous achetiez 100% de vos besoins au reseau. Sert de reference pour calculer les economies realisees grace a votre installation solaire.",
    deltaGrid: "ECONOMIE vs RESEAU SEUL : Economies nettes par rapport au scenario 'tout reseau' (sans PV ni batterie). Formule : (Cout sans PV) - (Cout net actuel). VALEUR POSITIVE = ECONOMIES realisees. Exemple : +150€ signifie 150€ d'economies sur la periode grace au PV/batterie.",
    savingsRate: "TAUX D'ECONOMIE : Pourcentage du cout reseau evite grace au PV/batterie sur la periode. Formule : (Economies) / (Cout sans PV) × 100. Exemple : 65% signifie que vous economisez 65% de votre facture d'electricite grace a votre installation solaire.",
    payback: "TEMPS DE RETOUR : Duree estimee pour amortir l'investissement PV/batterie via les economies d'electricite. Formule simplifiee : (Investissement) / (Economies annualisees). ATTENTION : calcul simplifie qui ne prend pas en compte les aides, la maintenance, ni l'inflation. Exemple : 8.5 ans signifie qu'apres 8.5 ans, l'installation est rentabilisee.",
    heatingComfort:
      "CONFORT CHAUFFAGE : Pourcentage du temps ou la temperature interieure reste dans la zone de confort (consigne ± hysteresis). Formule : (Temps dans zone confort) / (Temps total) × 100. Exemple : 95% signifie que le chauffage maintient le confort 95% du temps.",
    poolCompletion:
      "COMPLETION PISCINE : Ratio entre les heures de filtration reellement effectuees et l'objectif quotidien cumule sur la periode. Formule : (Heures filtration reelles) / (Heures filtration requises) × 100. Exemple : 100% signifie que l'objectif de filtration est totalement respecte.",
    evCompletion:
      "CHARGE VEHICULE ELECTRIQUE : Pourcentage de l'energie demandee qui a ete effectivement fournie au VE. Formule : (Energie delivree) / (Energie demandee) × 100. Exemple : 85% signifie que 85% de la charge demandee a ete completee (le reste n'a pas pu etre delivre par manque de disponibilite).",
    ecsTargetUptime:
      "TEMPS ECS ≥ CIBLE : Pourcentage du temps ou la temperature du ballon d'eau chaude reste au-dessus de la temperature cible. Formule : (Temps T ≥ cible) / (Temps total) × 100. Exemple : 92% signifie que l'eau est a bonne temperature 92% du temps.",
    costImport:
      "COUT IMPORT : Montant total paye pour l'electricite importee du reseau. Formule : (Energie importee kWh) × (Prix import €/kWh). Ce cout apparait sur votre facture d'electricite.",
    revenueExport:
      "REVENU EXPORT : Montant total recu pour l'electricite solaire excedentaire vendue au reseau. Formule : (Energie exportee kWh) × (Prix export €/kWh). Typiquement 0.08-0.13€/kWh selon le contrat de rachat.",
    netCostWithPenalties:
      "COUT NET (avec penalites) : Cout net incluant les penalites eventuelles pour non-respect des objectifs de confort (ECS, chauffage). Formule : (Cout net) + (Penalites). Les penalites refletent l'inconfort ou le recours au secours electrique."
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
