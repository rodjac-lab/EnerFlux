# Guide Utilisateur — Mode Coach Prédictif

**Date de création** : 31 octobre 2025  
**Version** : 1.0  
**Audience** : Utilisateurs finaux

---

## 🎯 Qu'est-ce que le Mode Coach Prédictif ?

Le **Mode Coach Prédictif** est votre assistant personnel pour optimiser votre autoconsommation solaire sur **la semaine à venir**. 

Contrairement au Mode Laboratoire qui compare des stratégies réactives, le Mode Coach **anticipe** :
- 🌤️ La météo de votre région (production PV prévue)
- 💰 Les tarifs Tempo (jours BLEU/BLANC/ROUGE)
- 🏠 Vos besoins énergétiques (deadlines ECS, sessions VE, confort chauffage)

**Résultat** : Économies de **20-35%** vs stratégies qui ne regardent pas au-delà de l'instant présent.

---

## 🚀 Démarrage Rapide (5 minutes)

### Étape 1 : Accéder au Mode Coach

1. Ouvrez EnerFlux : https://rodjac-lab.github.io/EnerFlux/
2. Cliquez sur l'onglet **"Coach Prédictif"** 🧭

### Étape 2 : Configurer votre installation

Dans le panneau **"Configuration de la simulation"** :

**Stratégie MPC** :
- Laissez **"Équilibrée (recommandé)"** pour commencer
- (Vous pourrez tester les autres stratégies plus tard)

**Source de données** :
- Laissez **"🤖 Auto (recommandé)"**
- Le système détecte automatiquement les meilleures APIs disponibles

**Localisation** :
- Sélectionnez votre ville dans le dropdown (Paris, Marseille, Lyon...)
- Les coordonnées GPS s'affichent automatiquement dessous

**Puissance crête PV** :
- Entrez la puissance de vos panneaux solaires en kWc (ex: 6.0 kWc)

### Étape 3 : Lancer la simulation

1. Cliquez sur **"Lancer la simulation"**
2. Attendez 2-5 secondes (animations de chargement)
3. Les résultats s'affichent avec animations fluides ✨

---

## 📊 Comprendre les Résultats

Après la simulation, vous voyez **4 sections animées** :

### 1. Calendrier de la Semaine (en haut)

**7 cartes météo** affichant pour chaque jour :
- 📅 **Jour** (Lun, Mar, Mer...)
- ☀️ **Icône météo** (Ensoleillé, Nuageux, Pluie...)
- ⚡ **Production PV** prévue en kWh
- 🔵/⚪/🔴 **Badge Tempo** (BLEU, BLANC, ROUGE)

**Interaction** : Cliquez sur un jour pour voir les détails (fonctionnalité à venir Phase 6)

### 2. Indicateurs Clés (KPIs)

**4 cartes KPI** affichant :
- 💰 **Coût total semaine** (€)
- 🔋 **Autoconsommation** (%)
- ⚡ **Import réseau** (kWh)
- 🌞 **Export PV** (kWh)

**Astuce** : Comparez les valeurs MPC vs Baseline pour voir les économies réalisées

### 3. Graphique Comparatif Animé

**Courbe Baseline (gris)** vs **Courbe MPC (vert)** :
- Coûts cumulés jour par jour
- Zone verte = économies MPC
- Badge total économies en €

**Animation** : Les courbes se dessinent progressivement (3s), puis les étiquettes apparaissent

### 4. Insights du Coach IA

**Cards narratives** expliquant les décisions du MPC :
- 💰 **Opportunités** : Économies réalisées (ex: "Jour ROUGE évité grâce à batterie chargée en HC")
- ⚠️ **Alertes** : Risques évités (ex: "Batterie réservée avant soirée VE")
- 🏆 **Réussites** : Objectifs atteints (ex: "Deadline ECS 21h respectée 7/7 jours")
- 💡 **Conseils** : Optimisations possibles

**Nombre d'insights** : Généralement 5-10 par semaine selon la complexité du scénario

---

## ⚙️ Configuration Avancée

### Sources de Données (Dropdown)

**🤖 Auto (recommandé)** :
- Essaye d'abord les APIs gratuites (PVGIS + RTE Tempo)
- Fallback automatique sur données de test si APIs indisponibles
- **Badge vert** indique quelle source est réellement utilisée

**🌍 Gratuit (PVGIS + RTE Tempo)** :
- Force l'utilisation des APIs gratuites
- PVGIS : Données météo Commission Européenne (historiques multi-années)
- RTE Tempo : Couleurs Tempo officielles J+1
- **Note** : Peut échouer si APIs bloquées par votre réseau

**💳 Payant (OpenWeather + RTE)** :
- Prévisions météo 15 jours (OpenWeather Solar Irradiance API)
- Requiert une clé API OpenWeather (gratuit jusqu'à 1000 appels/jour)
- Plus précis que PVGIS pour les prévisions courte durée

**🧪 Test (données simulées)** :
- Presets déterministes pour tests
- Identique à chaque exécution (utile pour comparer stratégies)
- Ignore la localisation sélectionnée

### Stratégies MPC Disponibles

**⚖️ Équilibrée (recommandé)** :
- Équilibre entre les 4 heuristiques MPC
- Convient à la majorité des installations
- Bon compromis coût/confort

**☀️ Soleil demain** :
- Priorité ECS si demain très ensoleillé (≥20 kWh PV prévu)
- Idéal si vous avez un gros ballon ECS (250-300L)
- Profite du surplus PV du lendemain

**☁️ Nuageux demain** :
- Priorité batterie si demain nuageux (≤10 kWh PV prévu)
- Idéal si vous avez une grosse batterie (≥10 kWh)
- Sécurise l'autonomie pour le lendemain

**🔴 Garde Tempo Rouge** :
- Réserve batterie (90%) si demain Tempo ROUGE
- Économise jusqu'à 3€/jour en hiver (0.76€/kWh HP vs 0.16€/kWh HC)
- Indispensable si vous êtes en contrat Tempo

---

## 🏙️ Sélecteur de Ville

### 20 villes françaises disponibles

Le dropdown affiche les grandes villes avec leurs coordonnées GPS précises :

**Régions représentées** :
- **Île-de-France** : Paris, Villeurbanne
- **Sud** : Marseille, Nice, Toulon, Montpellier, Nîmes
- **Rhône-Alpes** : Lyon, Grenoble, Saint-Étienne
- **Occitanie** : Toulouse
- **Nouvelle-Aquitaine** : Bordeaux
- **Pays de la Loire** : Nantes, Angers
- **Bretagne** : Rennes
- **Hauts-de-France** : Lille
- **Grand Est** : Strasbourg, Reims
- **Normandie** : Le Havre
- **Bourgogne** : Dijon

### Impact de la localisation

**Production PV** :
- Nice : +25% vs Lille (ensoleillement méditerranéen)
- Toulouse : +15% vs Paris
- Strasbourg : -10% vs Lyon (continental)

**Température ambiante** :
- Influence les pertes thermiques ECS
- Influence la consommation chauffage

**Note** : En mode Test (Mock), la localisation est ignorée (presets fixes)

---

## 💡 Cas d'Usage

### Cas 1 : Optimiser ma facture Tempo

**Contexte** : Vous avez un contrat Tempo et voulez éviter les jours ROUGE (0.76€/kWh HP)

**Configuration** :
- Stratégie : **Garde Tempo Rouge**
- Source : **Auto** (pour avoir les vraies couleurs Tempo)
- Batterie : ≥10 kWh recommandé

**Résultat attendu** :
- Batterie chargée en heures creuses (0.16€/kWh) veille des jours ROUGE
- Import réseau limité pendant les HP ROUGE
- Économies : **2-4€/jour ROUGE**

### Cas 2 : Préparer ma semaine VE

**Contexte** : Vous chargez votre VE tous les soirs (19h-23h, 20 kWh requis)

**Configuration** :
- Activez l'équipement VE dans Paramètres avancés
- Heure d'arrivée : 19h
- Heure de départ : 8h (lendemain)
- Énergie requise : 20 kWh

**Résultat attendu** :
- MPC réserve la batterie pour les soirées VE
- ECS chauffée prioritairement en journée (surplus PV)
- Deadline VE respectée 7/7 jours

### Cas 3 : Confort ECS garanti

**Contexte** : Vous voulez de l'eau chaude à 55°C tous les soirs à 21h

**Configuration** :
- Stratégie : **Équilibrée**
- Contrat ECS : Must-hit soir activé (21h, 55°C)
- Ballon : 200-250L

**Résultat attendu** :
- MPC anticipe les puisages du soir
- Chauffe l'ECS en journée si PV disponible
- Utilise la batterie ou le réseau HC si nécessaire
- **Hit rate : 100%** (température cible atteinte)

---

## ❓ FAQ

### Pourquoi la météo est-elle identique pour toutes les villes ?

**Réponse** : Vous êtes en mode **Auto** qui fallback sur les données de test (Mock) car les APIs externes (PVGIS, RTE) sont bloquées par votre navigateur pour des raisons de sécurité (CORS).

**Solution** : C'est normal et attendu. Le Mode Coach fonctionne parfaitement avec les presets de test. Pour avoir de vraies prévisions météo, une solution proxy backend sera ajoutée en Phase 7.

### Le badge affiche "Mock (fallback)", est-ce un problème ?

**Non !** C'est le comportement normal en mode Auto. Le système a détecté que les APIs gratuites ne sont pas accessibles et a automatiquement basculé sur des données de test fiables.

### Quelle différence entre Mode Labo et Mode Coach ?

**Mode Laboratoire** :
- Compare 10 stratégies **réactives** (décisions instant présent)
- Simulations 24h (1 journée)
- Scénarios reproductibles

**Mode Coach** :
- 1 stratégie **prédictive** (anticipe 24-48h)
- Simulations 7j (1 semaine)
- Prévisions météo/tarifs dynamiques (ou presets)

**Gains MPC vs stratégies réactives** : +20-35% d'économies

### Comment obtenir une clé API OpenWeather ?

1. Créer un compte sur https://openweathermap.org/api
2. S'inscrire au plan "Solar Irradiance API" (gratuit jusqu'à 1000 appels/jour)
3. Copier la clé API
4. Dans EnerFlux : Source de données → **Payant** → Coller la clé

**Note** : Pas nécessaire pour la plupart des usages, le mode Auto suffit.

### Puis-je simuler l'hiver avec chauffage ?

**Oui !** Dans l'onglet **Paramètres avancés** :
1. Cocher **"Activer le chauffage"**
2. Configurer les températures de confort (jour/nuit)
3. Puissance max chauffage (ex: 6 kW pour pompe à chaleur)
4. Retourner à l'onglet Coach et lancer la simulation

Le MPC intégrera le chauffage dans ses décisions d'allocation.

### Les insights IA sont-ils personnalisés ?

**Oui !** Le narrateur IA analyse **votre simulation spécifique** et génère des insights selon :
- Vos équipements activés (ECS, chauffage, VE, piscine, batterie)
- Les décisions MPC prises (anticipations, réserves, arbitrages)
- Les événements de la semaine (jours ROUGE, ensoleillement, deadlines)

Chaque simulation produit des insights différents.

### Puis-je exporter les résultats ?

**Pas encore en Phase 5**, mais prévu en Phase 6 :
- Export JSON de la simulation hebdomadaire
- Export CSV des flux quotidiens
- Partage URL avec paramètres simulation

---

## 🔧 Dépannage

### Erreur "Clé API OpenWeather requise"

**Cause** : Mode Payant sélectionné mais champ clé API vide

**Solution** : 
- Soit entrer une clé API OpenWeather valide
- Soit repasser en mode **Auto** ou **Gratuit**

### Simulation bloque à "Chargement..."

**Causes possibles** :
1. Navigateur bloque JavaScript (vérifier extensions)
2. Connexion Internet coupée (mode Auto ne peut pas fallback)

**Solutions** :
- Recharger la page (Ctrl+R)
- Vérifier la console navigateur (F12) pour voir les erreurs
- Essayer en mode **Test** (Mock) qui ne requiert pas Internet

### Calendrier affiche des dates incorrectes

**Cause** : Cache navigateur obsolète

**Solution** : Vider le cache (Ctrl+Shift+R) ou navigation privée

### Badge "Utilisé" n'apparaît pas

**Cause** : Simulation pas encore lancée

**Solution** : Cliquer sur **"Lancer la simulation"** d'abord

---

## 📚 Pour Aller Plus Loin

### Documentation Technique

**Vision produit** :
- [vision.md](vision.md) - Problématique, solution MPC, objectifs

**Architecture technique** :
- [architecture.md](architecture.md) - Heuristiques MPC, narrateur IA, providers APIs

**Implémentation** :
- [implementation/phase5_implementation_summary.md](implementation/phase5_implementation_summary.md) - Détails UI Phase 5

### Comprendre le MPC (Model Predictive Control)

**Principe** : Optimisation avec horizon de prévision

**4 heuristiques EnerFlux** :
1. **Tempo Guard** : Anticiper jours chers (ROUGE/BLANC)
2. **Weather Anticipation** : Différer charges si soleil demain
3. **EV Deadline** : Sécuriser charge VE avant départ
4. **Night Charge** : Charger batterie en HC si jour cher demain

**Avantages vs stratégies fixes** :
- Adaptation dynamique au contexte
- Utilisation optimale de la batterie
- Confort garanti (deadlines ECS/VE respectées)

### Contribuer

**Feedback** : https://github.com/rodjac-lab/EnerFlux/issues  
**Documentation** : [Docs/](../../)

---

**Auteurs** : Rodolphe + Claude (Anthropic)  
**Licence** : Open Source  
**Version** : 1.0 (31 octobre 2025)
