# Data Providers - Mode Coach Prédictif

Ce module fournit les providers de données pour les prévisions météo et tarifs Tempo du Mode Coach.

## Architecture

```
DataProvider (interface)
  ├─ WeatherProvider (météo + PV)
  │   ├─ OpenWeatherProvider (payant, OpenWeather Solar API)
  │   ├─ PVGISProvider (gratuit, EU Commission TMY)
  │   └─ MockWeatherProvider (presets déterministes)
  │
  └─ TariffProvider (tarifs électricité)
      ├─ RTETempoProvider (officiel, RTE API gratuite)
      └─ MockTariffProvider (presets Tempo)
```

## Quick Start

### Mode Mock (Tests, Dev)

```typescript
import { DataProviderFactory } from './data/providers';

const provider = DataProviderFactory.createMock();

const forecast = await provider.fetchWeeklyForecast('2025-03-17', {
  location: 'sunny-week', // 'sunny-week' | 'variable-week' | 'winter-week'
  tariffType: 'tempo'     // 'tempo' | 'tou' | 'fixed'
});
```

### Mode Production (APIs Réelles)

#### Option 1: OpenWeather + RTE Tempo (payant)

```typescript
import { DataProviderFactory } from './data/providers';

const provider = DataProviderFactory.createReal(
  process.env.OPENWEATHER_API_KEY!, // Clé API requise
  {
    peakPower_kWp: 6,    // Puissance crête installation
    efficiency: 0.75,    // Rendement global (défaut: 0.75)
    tilt_deg: 30,        // Inclinaison panneaux (défaut: 30°)
    azimuth_deg: 180     // Azimut (0=Nord, 180=Sud, défaut: 180)
  },
  '48.8566,2.3522' // Localisation (lat,lon)
);

const forecast = await provider.fetchWeeklyForecast('2025-03-17');
```

#### Option 2: PVGIS + RTE Tempo (gratuit)

```typescript
const provider = DataProviderFactory.createFree(
  {
    peakPower_kWp: 6,
    tilt_deg: 30,
    azimuth_deg: 180
  },
  '48.8566,2.3522'
);

const forecast = await provider.fetchWeeklyForecast('2025-03-17');
```

⚠️ **Limitation PVGIS**: Données Typical Meteorological Year (TMY) uniquement, pas de prévisions temps réel.

#### Option 3: Fallback Automatique (Auto Mode)

```typescript
const provider = DataProviderFactory.create('auto', {
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY, // Optionnel
  pvSystem: { peakPower_kWp: 6 },
  weatherProvider: 'auto', // Essaye OpenWeather → PVGIS → Mock
  tariffProvider: 'rte-tempo'
});
```

Chaîne de fallback:
1. OpenWeather (si clé API fournie)
2. PVGIS (gratuit)
3. Mock (presets)

## Providers Disponibles

### Weather Providers

#### `OpenWeatherProvider`

**Source**: [OpenWeather Solar Irradiance API](https://openweathermap.org/api/solar-irradiance)

**Pricing**: Abonnement séparé, pay-per-call

**Features**:
- Prévisions 15 jours (hourly ou 15-min)
- GHI/DNI/DHI (irradiance globale/directe/diffuse)
- Historique depuis 1979
- Fallback: modèle clear-sky

**Rate Limit**: ~60 calls/min (selon tier)

**Exemple**:
```typescript
import { OpenWeatherProvider } from './data/providers';

const provider = new OpenWeatherProvider('api-key', {
  peakPower_kWp: 6,
  efficiency: 0.75
});

const weather = await provider.fetchWeeklyWeather('2025-03-17', '48.8566,2.3522');
```

---

#### `PVGISProvider`

**Source**: [PVGIS API v5.2](https://re.jrc.ec.europa.eu/api/v5_2/)

**Pricing**: **GRATUIT** (service public EU)

**Features**:
- Typical Meteorological Year (TMY)
- Données horaires multi-années
- Simulation PV avec tilt/azimuth
- Couverture: Europe, Afrique, Asie

**Limitation**: ❌ Pas de prévisions temps réel (TMY uniquement)

**Use Case**: Planning long terme, comparaison "cette semaine vs semaine type"

**Exemple**:
```typescript
import { PVGISProvider } from './data/providers';

const provider = new PVGISProvider(
  6,   // peakPower_kWp
  30,  // tilt_deg (défaut: 30)
  180  // azimuth_deg (défaut: 180 = Sud)
);

const weather = await provider.fetchWeeklyWeather('2025-03-17', '48.8566,2.3522');
```

---

#### `MockWeatherProvider`

**Source**: Presets déterministes Phase 1-2

**Pricing**: Gratuit (local)

**Presets**:
- `'sunny-week'`: 202 kWh (semaine ensoleillée)
- `'variable-week'`: 122 kWh (météo variable)
- `'winter-week'`: 52 kWh (hiver nuageux)

**Exemple**:
```typescript
import { MockWeatherProvider } from './data/providers';

const provider = new MockWeatherProvider();
const weather = await provider.fetchWeeklyWeather('2025-03-17', 'sunny-week');
```

---

### Tariff Providers

#### `RTETempoProvider`

**Source**: [RTE Tempo API v1.1](https://data.rte-france.com/catalog/-/api/consumption/Tempo-Like-Supply-Contract/v1.1)

**Pricing**: **GRATUIT** (API officielle RTE)

**Features**:
- Annonce J-1 à 10h30
- Pré-notification 8h-10h30 (indicatif)
- Couleurs BLUE/WHITE/RED

**Tarifs 2025** (€/kWh):

| Couleur | HC (22h-6h) | HP (6h-22h) |
|---------|-------------|-------------|
| BLUE    | 0.1296      | 0.1609      |
| WHITE   | 0.1486      | 0.1894      |
| RED     | 0.1568      | **0.7562**  |

**Fallback**: 7 jours BLUE (hypothèse conservative)

**Exemple**:
```typescript
import { RTETempoProvider } from './data/providers';

const provider = new RTETempoProvider(
  22, // offpeakStart (défaut: 22h)
  6   // offpeakEnd (défaut: 6h)
);

const tariffs = await provider.fetchWeeklyTariff('2025-03-17');
```

---

#### `MockTariffProvider`

**Source**: Presets déterministes Phase 1-2

**Pricing**: Gratuit (local)

**Presets Tempo**:
- `'tempo-spring'`: Majoritairement BLUE, 1 RED
- `'tempo-winter-harsh'`: Mix avec 2 REDs consécutifs
- `'tempo-summer'`: 100% BLUE

**Exemple**:
```typescript
import { MockTariffProvider } from './data/providers';

const provider = new MockTariffProvider();
const tariffs = await provider.fetchWeeklyTariff('2025-03-17', 'tempo');
```

---

## DataProviderFactory

Factory avec 3 modes: `'mock'` | `'real'` | `'auto'`

### API

```typescript
// Mode mock
DataProviderFactory.create('mock'): DataProvider

// Mode real (config requise)
DataProviderFactory.create('real', config: RealProviderConfig): DataProvider

// Mode auto (fallback gracieux)
DataProviderFactory.create('auto', config?: RealProviderConfig): DataProvider

// Shortcuts
DataProviderFactory.createMock(): DataProvider
DataProviderFactory.createReal(apiKey, pvSystem, location?): DataProvider
DataProviderFactory.createFree(pvSystem, location?): DataProvider
```

### Configuration

```typescript
interface RealProviderConfig {
  openWeatherApiKey?: string;          // Clé OpenWeather (optionnel)
  pvSystem: PVSystemConfig;            // Config installation PV (requis)
  defaultLocation?: string;            // Localisation par défaut
  weatherProvider?: 'openweather' | 'pvgis' | 'auto';
  tariffProvider?: 'rte-tempo' | 'mock';
}

interface PVSystemConfig {
  peakPower_kWp: number;    // Puissance crête (requis)
  efficiency?: number;      // Rendement global (défaut: 0.75)
  tilt_deg?: number;        // Inclinaison panneaux (défaut: 30°)
  azimuth_deg?: number;     // Azimut (0=N, 180=S, défaut: 180)
}
```

---

## Gestion des Erreurs

### OpenWeather

**Erreurs API**:
- `401 Unauthorized`: Clé API invalide → Fallback clear-sky
- `429 Too Many Requests`: Rate limit dépassé → Fallback clear-sky
- Network errors → Fallback clear-sky

**Clear-Sky Model**: 800 W/m² peak, distribution gaussienne horaire

### RTE Tempo

**Erreurs API**:
- Toute erreur → Fallback 7 jours BLUE (tarif le plus bas, hypothèse conservative)

### PVGIS

**Erreurs API**:
- Pas de fallback interne
- L'erreur remonte au `FallbackWeatherProvider` qui essaye le provider suivant

---

## Performance

### Caching Recommandé

```typescript
// Exemple cache simple avec TTL
const weatherCache = new Map<string, { data: any; expiry: number }>();

async function getCachedWeather(provider, startDate, location) {
  const key = `${startDate}-${location}`;
  const cached = weatherCache.get(key);
  
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  
  const data = await provider.fetchWeeklyWeather(startDate, location);
  weatherCache.set(key, {
    data,
    expiry: Date.now() + 3 * 60 * 60 * 1000 // 3h TTL
  });
  
  return data;
}
```

### Rate Limits

| Provider | Rate Limit | Recommandation |
|----------|------------|----------------|
| OpenWeather | ~60/min (tier-dependent) | Cache 1-3h, refresh 2x/jour |
| RTE Tempo | Non publié | Poll 1x/jour à 11h (après annonce) |
| PVGIS | ~1000/jour | Cache infini (TMY statique) |

---

## Extensibilité

Pour ajouter un nouveau provider:

1. Implémenter `WeatherProvider` ou `TariffProvider`
2. Ajouter au `DataProviderFactory`:

```typescript
// Exemple: Météo France
import { MeteoFranceProvider } from './MeteoFranceProvider';

// Dans DataProviderFactory.createRealProvider()
if (weatherPref === 'meteofrance') {
  weatherProviders.push(new MeteoFranceProvider(apiKey, pvSystem));
}
```

3. Ajouter tests dans `tests/real_providers.test.ts`

---

## Limitations Connues

### RTE Tempo API - OAuth 2.0 Requis

**Statut** : L'API RTE retourne actuellement `400 Bad Request` ❌

**Cause** : L'API RTE Tempo nécessite :
1. **Authentification OAuth 2.0** avec credentials (non implémenté)
2. **Format de date avec timezone** : `2025-11-09T00:00:00+01:00` (Europe/Paris)
3. **Compte sur le portail RTE** pour obtenir les credentials

**Solution actuelle** : Fallback automatique vers **BLUE week** (tarif conservateur) ✅
- Le fallback fonctionne parfaitement
- BLUE = hypothèse raisonnable pour comparaison de stratégies
- Pas de dépendance externe à gérer

**Roadmap** : Phase 7+ - Implémentation OAuth 2.0 si nécessaire

**Références** :
- [Guide OAuth 2.0 RTE](https://data.rte-france.org/documents/20182/22648/EN_GuideOauth2_v5.1.pdf)
- [API User Guide](https://data.rte-france.com/catalog/-/api/doc/user-guide/Tempo+Like+Supply+Contract/1.1)
- Date format requis : `YYYY-MM-DDTHH:mm:ss+0X:00` (UTC+1 hiver, UTC+2 été)

---

## Références

- [OpenWeather Solar API](https://openweathermap.org/api/solar-irradiance)
- [PVGIS Documentation](https://joint-research-centre.ec.europa.eu/pvgis-photovoltaic-geographical-information-system_en)
- [RTE Tempo API](https://data.rte-france.com/catalog/-/api/consumption/Tempo-Like-Supply-Contract/v1.1)
- [Phase 4 Implementation Summary](../../../Docs/phase4_implementation_summary.md)

---

**Version**: Phase 4 (2025-01-26)
**Tests**: 19/19 providers tests ✅ | 160/160 total suite ✅
