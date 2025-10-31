# Phase 4: APIs Réelles - Implementation Summary

**Status**: ✅ COMPLETED
**Date**: 2025-01-26
**Test Coverage**: 19/19 tests passing (160/160 total suite)

---

## Objectif

Intégrer des APIs réelles pour les prévisions météo et les tarifs Tempo, tout en maintenant un système de fallback robuste vers les providers mock de Phase 1-3.

**Résultat**: Architecture extensible avec 3 providers météo (OpenWeather, PVGIS, Mock) et 2 providers tarif (RTE Tempo, Mock), orchestrés par un factory pattern avec chaîne de fallback automatique.

---

## Architecture

### 1. Provider Abstraction

Les interfaces `WeatherProvider` et `TariffProvider` (définies en Phase 1-2) sont implémentées par:

**Weather Providers**:
- `OpenWeatherProvider` (payant, OpenWeather Solar Irradiance API)
- `PVGISProvider` (gratuit, Commission Européenne TMY data)
- `MockWeatherProvider` (presets déterministes)

**Tariff Providers**:
- `RTETempoProvider` (officiel, RTE API gratuite)
- `MockTariffProvider` (presets Tempo)

### 2. DataProviderFactory

Factory pattern avec 3 modes:

```typescript
// Mock mode (Phase 1-3, testing)
const provider = DataProviderFactory.create('mock');

// Real mode (production)
const provider = DataProviderFactory.create('real', {
  openWeatherApiKey: 'sk-abc123',
  pvSystem: { peakPower_kWp: 6, efficiency: 0.75 },
  weatherProvider: 'openweather',
  tariffProvider: 'rte-tempo'
});

// Auto mode (dev/staging, falls back gracefully)
const provider = DataProviderFactory.create('auto', {
  pvSystem: { peakPower_kWp: 6 }
});

// Shortcuts
const provider = DataProviderFactory.createFree({ peakPower_kWp: 6 }); // PVGIS + RTE
const provider = DataProviderFactory.createReal('key', { peakPower_kWp: 6 }); // OpenWeather + RTE
```

### 3. Fallback Chain

**Weather fallback**: OpenWeather → PVGIS → Mock
**Tariff fallback**: RTE Tempo (si échec → BLUE week, fallback sécurisé)

Implémentation via `FallbackWeatherProvider` qui essaye chaque provider séquentiellement:

```typescript
class FallbackWeatherProvider implements WeatherProvider {
  async fetchWeeklyWeather(startDate: string, location?: string) {
    for (const provider of this.providers) {
      try {
        console.log(`[Fallback] Trying ${provider.name}...`);
        const result = await provider.fetchWeeklyWeather(startDate, location);
        console.log(`[Fallback] ✓ Success with ${provider.name}`);
        return result;
      } catch (error) {
        console.warn(`[Fallback] ✗ ${provider.name} failed:`, error);
      }
    }
    throw new Error('All providers failed');
  }
}
```

---

## APIs Intégrées

### 1. RTE Tempo API (Tarifs)

**Endpoint**: `https://digital.iservices.rte-france.com/open_api/tempo_like_supply_contract/v1/tempo_like_calendars`

**Documentation**: [RTE Services Portal](https://www.services-rte.com/en/view-data-published-by-rte/schedule-of-Tempo-type-supply-offerings.html)

**Features**:
- Annonce officielle J-1 à 10h30
- Pré-notification indicative 8h-10h30
- Couleurs BLUE/WHITE/RED avec pricing HP/HC
- Gratuit, aucune clé API requise

**Tarifs 2025** (€/kWh):
| Couleur | Heures Creuses (22h-6h) | Heures Pleines (6h-22h) |
|---------|-------------------------|-------------------------|
| BLUE    | 0.1296                  | 0.1609                  |
| WHITE   | 0.1486                  | 0.1894                  |
| RED     | 0.1568                  | **0.7562** (très cher!) |

**Fallback**: En cas d'échec API, retourne 7 jours BLUE (hypothèse conservative, le tarif le plus bas).

**Implementation**: [src/data/providers/RTETempoProvider.ts](../src/data/providers/RTETempoProvider.ts)

---

### 2. OpenWeather Solar Irradiance API (Météo PV)

**Endpoint**: `https://api.openweathermap.org/energy/1.0/solar/data`

**Documentation**: [OpenWeather Solar API](https://openweathermap.org/api/solar-irradiance)

**Features**:
- GHI/DNI/DHI (Global/Direct/Diffuse Horizontal Irradiance)
- Prévisions 15 jours (hourly ou 15-min resolution)
- Données historiques depuis 1979
- Modèles ciel clair + nuageux

**Pricing**: Abonnement séparé, pay-per-call (typiquement 60 calls/min)

**Conversion GHI → PV**:
```typescript
function ghiToPvPower(ghi_W_m2: number, config: PVSystemConfig): number {
  const efficiency = config.efficiency ?? 0.75;
  const stcIrradiance = 1000; // W/m² at STC
  return (ghi_W_m2 / stcIrradiance) * config.peakPower_kWp * efficiency;
}
```

**Modèle simplifié Phase 4**:
- Facteur d'efficacité global (0.75 par défaut)
- Pas de correction tilt/azimuth (orientation optimale supposée)
- Futures améliorations: PVLIB-like models avec température, inclinaison, salissure

**Fallback**: Modèle clear-sky gaussien (800 W/m² peak, distribution horaire) + message "(estimation)" dans la description.

**Implementation**: [src/data/providers/OpenWeatherProvider.ts](../src/data/providers/OpenWeatherProvider.ts)

---

### 3. PVGIS API (Météo PV - Alternative Gratuite)

**Endpoint**: `https://re.jrc.ec.europa.eu/api/v5_2/seriescalc`

**Documentation**: [PVGIS API Docs](https://joint-research-centre.ec.europa.eu/pvgis-photovoltaic-geographical-information-system/getting-started-pvgis/api-non-interactive-service_en)

**Features**:
- Typical Meteorological Year (TMY) - moyennes historiques
- Simulation PV avec tilt/azimuth
- Données horaires sur multi-années
- Couverture: Europe, Afrique, Asie

**Pricing**: **GRATUIT** (service public EU Joint Research Centre)

**Limitations**:
- ❌ Pas de prévisions temps réel (TMY uniquement)
- ✅ Excellent pour planification long terme
- ✅ Référence scientifique validée

**Use Case**: 
- Fallback gratuit si OpenWeather indisponible
- Estimation de production typique pour un mois donné
- Comparaisons "cette semaine vs semaine type"

**Stratégie d'extraction**:
```typescript
// Extract target month from startDate (e.g., March from "2025-03-17")
const targetMonth = new Date(startDate).getMonth() + 1;

// Find first hour in TMY data matching target month
// Extract 7 days (168 hours) from that point
const weekData = hourly.slice(startIdx, startIdx + 168);
```

**Implementation**: [src/data/providers/PVGISProvider.ts](../src/data/providers/PVGISProvider.ts)

---

## Fichiers Créés

| Fichier | LOC | Description |
|---------|-----|-------------|
| [src/data/providers/RTETempoProvider.ts](../src/data/providers/RTETempoProvider.ts) | 294 | Provider RTE Tempo officiel |
| [src/data/providers/OpenWeatherProvider.ts](../src/data/providers/OpenWeatherProvider.ts) | 314 | Provider OpenWeather Solar |
| [src/data/providers/PVGISProvider.ts](../src/data/providers/PVGISProvider.ts) | 226 | Provider PVGIS gratuit |
| [src/data/providers/DataProviderFactory.ts](../src/data/providers/DataProviderFactory.ts) | 240 | Factory + chaîne de fallback |
| [tests/real_providers.test.ts](../tests/real_providers.test.ts) | 475 | Tests d'intégration (19 tests) |
| **Total** | **1549** | **+1549 LOC** |

---

## Tests

**Suite complète**: 160/160 tests ✅

**Phase 4 tests** (19 nouveaux):

### DataProviderFactory (7 tests)
- ✅ Mock mode selection
- ✅ Real mode with config
- ✅ Auto mode fallback
- ✅ Error handling (missing config)
- ✅ Factory shortcuts (createMock, createReal, createFree)

### RTETempoProvider (3 tests)
- ✅ Fetch weekly Tempo colors from RTE API
- ✅ Parse BLUE/WHITE/RED days correctly
- ✅ Fallback to BLUE week on API failure
- ✅ Handle 401 Unauthorized gracefully

### OpenWeatherProvider (4 tests)
- ✅ Fetch solar irradiance forecast
- ✅ Convert GHI to PV power profiles
- ✅ Validate location format (lat,lon)
- ✅ Fallback to clear-sky model on errors

### PVGISProvider (3 tests)
- ✅ Fetch TMY data from PVGIS
- ✅ Extract typical week matching target month
- ✅ Validate location format
- ✅ Throw error on API failure (no internal fallback)

### Fallback Chain Integration (2 tests)
- ✅ Multi-level fallback (OpenWeather → PVGIS → Mock)
- ✅ Success on first provider (no fallback triggered)

**Test Coverage**:
- API response parsing (mocked responses)
- Error handling (401, 429, 500, network errors)
- Fallback chain behavior
- Location validation
- PV power conversion

---

## Utilisation

### Mode Production (APIs Réelles)

```typescript
import { DataProviderFactory, runWeeklySimulation, resolveMPCStrategy } from './core/mpc';
import { Battery, DHWTank } from './devices';

// 1. Créer le provider avec APIs réelles
const dataProvider = DataProviderFactory.createReal(
  process.env.OPENWEATHER_API_KEY!, // Clé API OpenWeather
  {
    peakPower_kWp: 6,    // Installation 6 kWp
    efficiency: 0.75,    // Rendement global 75%
    tilt_deg: 30,        // Inclinaison 30°
    azimuth_deg: 180     // Plein Sud
  },
  '48.8566,2.3522' // Paris (lat,lon)
);

// 2. Récupérer les prévisions
const forecast = await dataProvider.fetchWeeklyForecast('2025-03-17', {
  location: '48.8566,2.3522',
  tariffType: 'tempo'
});

// 3. Simuler avec MPC
const devices = [
  new Battery({ capacity_kWh: 10, maxCharge_kW: 5, maxDischarge_kW: 5 }),
  new DHWTank({ capacity_L: 200, heatingPower_kW: 3 })
];

const result = runWeeklySimulation({
  dt_s: 900, // 15 min
  forecast,
  devices,
  mpcStrategy: resolveMPCStrategy('mpc_balanced'),
  baseLoadProfile: 'residential',
  ecsService: {
    mode: 'force',
    deadlineHour: 19,
    targetCelsius: 55
  }
});

console.log(`Weekly Cost: ${result.weeklyKPIs.netCostWithPenalties_eur.toFixed(2)} €`);
console.log(`Self-Consumption: ${result.weeklyKPIs.selfConsumption_percent.toFixed(1)} %`);
```

### Mode Gratuit (PVGIS + RTE Tempo)

```typescript
const dataProvider = DataProviderFactory.createFree(
  {
    peakPower_kWp: 6,
    tilt_deg: 30,
    azimuth_deg: 180
  },
  '48.8566,2.3522'
);

// Même API, fallback automatique vers PVGIS (gratuit)
const forecast = await dataProvider.fetchWeeklyForecast('2025-03-17');
```

### Mode Mock (Testing)

```typescript
// Même code que Phase 1-3, aucune API appelée
const dataProvider = DataProviderFactory.createMock();

const forecast = await dataProvider.fetchWeeklyForecast('2025-03-17', {
  location: 'sunny-week', // Preset ID
  tariffType: 'tempo'
});
```

---

## Extensibilité Future

### Météo France API (Phase 5+)

Météo France propose des prévisions GHI via service commercial. Pour intégrer:

1. Créer `src/data/providers/MeteoFranceProvider.ts`
2. Implémenter `WeatherProvider` interface
3. Ajouter au fallback chain dans `DataProviderFactory`:
```typescript
if (weatherPref === 'meteofrance') {
  weatherProviders.push(new MeteoFranceProvider(apiKey, pvSystem));
}
```

### Autres APIs Envisageables

- **Solcast**: Prévisions PV spécialisées (payant, très précis)
- **Forecast.Solar**: API gratuite avec prévisions PV basiques
- **ÉCO2mix RTE**: Données tempo historiques + intensité carbone réseau

---

## Performance et Rate Limits

### OpenWeather
- Rate limit: ~60 calls/min (dépend du tier)
- **Recommandation**: Cache 1-3h, refresh prévisions 2x/jour

### RTE Tempo
- Pas de rate limit publié
- **Recommandation**: Poll 1x/jour à 11h (après annonce J-1)

### PVGIS
- Pas de rate limit officiel, ~1000 requests/day recommandé
- **Recommandation**: Cache TMY par location (données statiques)

### Caching Strategy

```typescript
// Future: Implémenter cache avec TTL
interface CacheConfig {
  weather_ttl_ms: number; // 3 heures
  tariff_ttl_ms: number;  // 24 heures
  tmy_ttl_ms: number;     // Infini (données statiques)
}
```

---

## Limitations Phase 4

**Simplifications Model PV**:
- ❌ Pas de correction température sur rendement
- ❌ Pas de prise en compte salissure/dégradation
- ❌ Orientation optimale supposée (pas de correction tilt/azimuth)
- ✅ Modèle linéaire GHI→PV (STC reference)

**Améliorations Phase 5**:
- Intégrer PVLIB.js pour modèle physique complet
- Correction température cellule (−0.5%/°C au-dessus de 25°C)
- Modèle IAM (Incidence Angle Modifier)
- Calcul optimal tilt/azimuth basé sur lat/lon

**PVGIS Limitations**:
- TMY seulement (pas de prévisions temps réel)
- Bon pour planning, inadapté pour MPC day-ahead

---

## Migration Guide

### De Mock (Phase 1-3) vers Real (Phase 4)

**Avant** (Phase 1-3):
```typescript
import { MockDataProvider } from './data/providers';
const provider = new MockDataProvider();
```

**Après** (Phase 4):
```typescript
import { DataProviderFactory } from './data/providers';

// Mode auto: fallback gracieux mock si config manquante
const provider = DataProviderFactory.create('auto', {
  pvSystem: { peakPower_kWp: 6 }
});

// OU mode explicite:
const provider = DataProviderFactory.createFree({ peakPower_kWp: 6 });
```

**Breaking Changes**: ❌ AUCUN
- Interface `DataProvider` inchangée
- `fetchWeeklyForecast()` signature identique
- Tests Phase 1-3 non affectés (160/160 passent)

---

## Conclusion

Phase 4 fournit une architecture production-ready avec:
- ✅ 3 providers météo (1 payant, 1 gratuit, 1 mock)
- ✅ 2 providers tarif (1 officiel, 1 mock)
- ✅ Chaîne de fallback automatique
- ✅ Factory pattern extensible
- ✅ 19 tests d'intégration (mocked APIs)
- ✅ Zéro breaking change vs Phase 1-3
- ✅ Ready pour Phase 5 (UI Coach)

**Next Steps**:
- Phase 5: UI Mode Coach avec calendar hebdomadaire, narrative cards, KPIs comparatifs
- Phase 6: Polish, documentation utilisateur finale

**Total Phase 4**: +1549 LOC, 19 tests, 100% backward compatible ✅
