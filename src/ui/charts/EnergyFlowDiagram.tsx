import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { SeriesForRun } from '../../data/series';

interface EnergyFlowDiagramProps {
  series: SeriesForRun['energy'];
  variant: 'A' | 'B';
}

interface FlowData {
  pvToHouse: number;
  pvToBattery: number;
  pvToGrid: number;
  batteryToHouse: number;
  gridToHouse: number;
}

const EnergyFlowDiagram: React.FC<EnergyFlowDiagramProps> = ({ series, variant }) => {
  const [currentHour, setCurrentHour] = useState(12); // Start at noon
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  // Map hour to index (since data might not start at 0h)
  const hourToIndex = useMemo(() => {
    const map = new Map<number, number>();
    series.forEach((point, index) => {
      map.set(Math.floor(point.hour), index);
    });
    return map;
  }, [series]);

  // Get min and max hours from data
  const minHour = useMemo(() => Math.floor(series[0]?.hour || 0), [series]);
  const maxHour = useMemo(() => Math.floor(series[series.length - 1]?.hour || 23), [series]);

  // Calculate flow data for each hour
  const flowByHour = useMemo<FlowData[]>(() => {
    return series.map((point) => {
      const totalConsumption = point.baseLoad_kW + point.dhw_power_kW;

      // Following the engine's waterfall logic (engine.ts lines 462-508):
      // 1. PV goes first to consumption (house + devices), then to battery, then exported
      // 2. Battery discharges to cover deficit after PV
      // 3. Grid imports to cover remaining deficit

      // pvUsedOnSite_kW = total PV used locally (not exported)
      // It splits between: direct consumption + battery charging (from PV only)

      // PV to house (direct consumption) = min of PV used and total consumption
      const pvToHouse = Math.min(point.pvUsedOnSite_kW, totalConsumption);

      // PV to battery = remainder of PV after consumption (if surplus)
      const pvToBattery = Math.max(0, point.pvUsedOnSite_kW - totalConsumption);

      // PV to grid = exported surplus
      const pvToGrid = point.gridExport_kW;

      // Battery discharge to house (covers deficit after PV)
      const batteryToHouse = point.batt_discharge_kW;

      // Grid import to house (covers deficit after PV + battery)
      const gridToHouse = point.gridImport_kW;

      return {
        pvToHouse,
        pvToBattery,
        pvToGrid,
        batteryToHouse,
        gridToHouse,
      };
    });
  }, [series]);

  // Get index from hour
  const currentIndex = hourToIndex.get(currentHour) ?? 0;
  const currentFlow = flowByHour[currentIndex] || flowByHour[0];
  const currentPoint = series[currentIndex];

  // Verify energy balance (for debugging)
  if (typeof window !== 'undefined' && currentFlow && currentPoint) {
    const pvTotal = currentPoint.pv_kW;
    const pvFlows = currentFlow.pvToHouse + currentFlow.pvToBattery + currentFlow.pvToGrid;
    const consumption = currentPoint.baseLoad_kW + currentPoint.dhw_power_kW;
    const supply = currentFlow.pvToHouse + currentFlow.batteryToHouse + currentFlow.gridToHouse;

    const pvError = Math.abs(pvTotal - pvFlows);
    const balanceError = Math.abs(consumption - supply);

    if (pvError > 0.01 || balanceError > 0.01) {
      console.warn(
        `⚠️ Energy balance error at ${currentHour}h:`,
        `PV: ${pvTotal.toFixed(2)} vs flows: ${pvFlows.toFixed(2)} (Δ=${pvError.toFixed(3)})`,
        `Consumption: ${consumption.toFixed(2)} vs supply: ${supply.toFixed(2)} (Δ=${balanceError.toFixed(3)})`
      );
    }
  }

  // Auto-play animation
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        setCurrentHour((prev) => {
          const next = prev + 1;
          return next > maxHour ? minHour : next;
        });
      }, 1000); // 1 second = 1 hour
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const title = `Flux énergétique — ${variant}`;
  const variantColor = variant === 'A' ? 'text-green-700' : 'text-purple-700';

  // SVG dimensions
  const width = 400;
  const height = 400;

  // Node positions - Layout en croix
  const centerX = width / 2;
  const centerY = height / 2;
  const offset = 100; // Distance from center
  const nodeRadius = 25; // Rayon du cercle de nœud

  const nodes = {
    pv: { x: centerX, y: centerY - offset, label: 'PV', icon: '☀️' },
    house: { x: centerX - offset, y: centerY, label: 'Maison', icon: '🏠' },
    battery: { x: centerX + offset, y: centerY, label: 'Batterie', icon: '🔋' },
    grid: { x: centerX, y: centerY + offset, label: 'Réseau', icon: '⚡' },
  };

  // Calcul des points de départ sur le cercle PV (comme un cadran d'horloge)
  // Sur un cercle trigonométrique: 0° = 3h (droite), 90° = 12h (haut), 180° = 9h (gauche), 270° = 6h (bas)
  // Pour convertir horloge → trigo: angle_trigo = 90° - (heure × 30°)
  // 7h horloge = 90° - (7 × 30°) = 90° - 210° = -120° = 240° (en positif)
  // 6h horloge = 90° - (6 × 30°) = 90° - 180° = -90° = 270°
  // 5h horloge = 90° - (5 × 30°) = 90° - 150° = -60° = 300°
  const angle7h = (240 * Math.PI) / 180; // 7h sur horloge = 240° trigo
  const angle6h = (270 * Math.PI) / 180; // 6h sur horloge = 270° trigo
  const angle5h = (300 * Math.PI) / 180; // 5h sur horloge = 300° trigo

  const pv7h = {
    x: nodes.pv.x + nodeRadius * Math.cos(angle7h),
    y: nodes.pv.y + nodeRadius * Math.sin(angle7h),
  };
  const pv6h = {
    x: nodes.pv.x + nodeRadius * Math.cos(angle6h),
    y: nodes.pv.y + nodeRadius * Math.sin(angle6h),
  };
  const pv5h = {
    x: nodes.pv.x + nodeRadius * Math.cos(angle5h),
    y: nodes.pv.y + nodeRadius * Math.sin(angle5h),
  };

  // Helper function to get path opacity based on flow
  const getOpacity = (flow: number) => {
    if (flow === 0) return 0.1;
    if (flow < 1) return 0.3;
    if (flow < 3) return 0.6;
    return 1;
  };

  // Helper function to get stroke width based on flow
  const getStrokeWidth = (flow: number) => {
    if (flow === 0) return 1;
    if (flow < 2) return 2;
    if (flow < 5) return 3;
    return 4;
  };

  // Helper function to calculate animation duration based on flow (inverse: higher flow = faster)
  const getAnimationDuration = (flow: number) => {
    if (flow === 0) return 6; // slowest
    if (flow < 2) return 4;
    if (flow < 5) return 2;
    return 1; // fastest
  };

  // Helper function to get number of particles based on flow intensity
  const getParticleCount = (flow: number) => {
    if (flow === 0) return 0;
    if (flow < 1) return 1;
    if (flow < 3) return 2;
    if (flow < 6) return 3;
    return 4;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${variantColor}`}>{title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600">
            {currentHour}h | PV: {currentPoint?.pv_kW.toFixed(1)}kW
          </span>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={minHour}
          max={maxHour}
          value={currentHour}
          onChange={(e) => setCurrentHour(Number(e.target.value))}
          className="flex-1"
          aria-label="Timeline hour selector"
        />
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="bg-slate-50 rounded-lg"
      >
        {/* PV to House - Part de 7h sur le cercle PV */}
        <polyline
          points={`${pv7h.x},${pv7h.y} ${pv7h.x},${nodes.house.y} ${nodes.house.x + nodeRadius},${nodes.house.y}`}
          fill="none"
          stroke="#F0E442"
          strokeWidth={getStrokeWidth(currentFlow.pvToHouse)}
          opacity={getOpacity(currentFlow.pvToHouse)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* PV to Battery - Part de 5h sur le cercle PV */}
        <polyline
          points={`${pv5h.x},${pv5h.y} ${pv5h.x},${nodes.battery.y} ${nodes.battery.x - nodeRadius},${nodes.battery.y}`}
          fill="none"
          stroke="#009E73"
          strokeWidth={getStrokeWidth(currentFlow.pvToBattery)}
          opacity={getOpacity(currentFlow.pvToBattery)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* PV to Grid - Part de 6h sur le cercle PV */}
        <line
          x1={pv6h.x}
          y1={pv6h.y}
          x2={nodes.grid.x}
          y2={nodes.grid.y - nodeRadius}
          stroke="#94a3b8"
          strokeWidth={getStrokeWidth(currentFlow.pvToGrid)}
          opacity={getOpacity(currentFlow.pvToGrid)}
          strokeLinecap="round"
        />

        {/* Battery to House - straight horizontal */}
        <line
          x1={nodes.battery.x - nodeRadius}
          y1={nodes.battery.y}
          x2={nodes.house.x + nodeRadius}
          y2={nodes.house.y}
          stroke="#22c55e"
          strokeWidth={getStrokeWidth(currentFlow.batteryToHouse)}
          opacity={getOpacity(currentFlow.batteryToHouse)}
          strokeLinecap="round"
        />

        {/* Grid to House - L inversé (monte puis va à gauche) */}
        <polyline
          points={`${nodes.grid.x},${nodes.grid.y - nodeRadius} ${nodes.grid.x},${nodes.house.y} ${nodes.house.x + nodeRadius},${nodes.house.y}`}
          fill="none"
          stroke="#64748b"
          strokeWidth={getStrokeWidth(currentFlow.gridToHouse)}
          opacity={getOpacity(currentFlow.gridToHouse)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Nodes */}
        {Object.entries(nodes).map(([key, node]) => (
          <g key={key}>
            <circle cx={node.x} cy={node.y} r="25" fill="white" stroke="#cbd5e1" strokeWidth="2" />
            <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central" fontSize="20">
              {node.icon}
            </text>
            <text
              x={node.x}
              y={node.y + 40}
              textAnchor="middle"
              fontSize="11"
              fill="#475569"
              fontWeight="600"
            >
              {node.label}
            </text>
          </g>
        ))}

        {/* Flow values - lower threshold to show small flows */}
        {currentFlow.pvToHouse > 0.01 && (
          <text x={nodes.pv.x - 40} y={(nodes.pv.y + nodes.house.y) / 2} fontSize="10" fill="#F0E442" fontWeight="600">
            {currentFlow.pvToHouse.toFixed(1)}kW
          </text>
        )}
        {currentFlow.pvToBattery > 0.01 && (
          <text x={nodes.pv.x + 35} y={(nodes.pv.y + nodes.battery.y) / 2} fontSize="10" fill="#009E73" fontWeight="600">
            {currentFlow.pvToBattery.toFixed(1)}kW
          </text>
        )}
        {currentFlow.pvToGrid > 0.01 && (
          <text x={nodes.pv.x + 15} y={(nodes.pv.y + nodes.grid.y) / 2} fontSize="10" fill="#94a3b8" fontWeight="600">
            {currentFlow.pvToGrid.toFixed(1)}kW
          </text>
        )}
        {currentFlow.batteryToHouse > 0.01 && (
          <text x={(nodes.battery.x + nodes.house.x) / 2} y={nodes.house.y - 10} fontSize="10" fill="#22c55e" fontWeight="600">
            {currentFlow.batteryToHouse.toFixed(1)}kW
          </text>
        )}
        {currentFlow.gridToHouse > 0.01 && (
          <text x={nodes.grid.x - 40} y={(nodes.grid.y + nodes.house.y) / 2} fontSize="10" fill="#64748b" fontWeight="600">
            {currentFlow.gridToHouse.toFixed(1)}kW
          </text>
        )}

        {/* Animated Particles - PV to House - Part de 7h */}
        {Array.from({ length: getParticleCount(currentFlow.pvToHouse) }).map((_, i) => (
          <circle key={`pv-house-${i}`} r="3" fill="#F0E442" opacity="0.8">
            <animateMotion
              path={`M ${pv7h.x} ${pv7h.y} L ${pv7h.x} ${nodes.house.y} L ${nodes.house.x + nodeRadius} ${nodes.house.y}`}
              dur={`${getAnimationDuration(currentFlow.pvToHouse)}s`}
              repeatCount="indefinite"
              begin={`${i * 0.3}s`}
            />
            <animate attributeName="opacity" values="0;0.8;0" dur={`${getAnimationDuration(currentFlow.pvToHouse)}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} />
          </circle>
        ))}

        {/* Animated Particles - PV to Battery - Part de 5h */}
        {Array.from({ length: getParticleCount(currentFlow.pvToBattery) }).map((_, i) => (
          <circle key={`pv-battery-${i}`} r="3" fill="#009E73" opacity="0.8">
            <animateMotion
              path={`M ${pv5h.x} ${pv5h.y} L ${pv5h.x} ${nodes.battery.y} L ${nodes.battery.x - nodeRadius} ${nodes.battery.y}`}
              dur={`${getAnimationDuration(currentFlow.pvToBattery)}s`}
              repeatCount="indefinite"
              begin={`${i * 0.3}s`}
            />
            <animate attributeName="opacity" values="0;0.8;0" dur={`${getAnimationDuration(currentFlow.pvToBattery)}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} />
          </circle>
        ))}

        {/* Animated Particles - PV to Grid - Part de 6h */}
        {Array.from({ length: getParticleCount(currentFlow.pvToGrid) }).map((_, i) => (
          <circle key={`pv-grid-${i}`} r="3" fill="#94a3b8" opacity="0.8">
            <animateMotion
              path={`M ${pv6h.x} ${pv6h.y} L ${nodes.grid.x} ${nodes.grid.y - nodeRadius}`}
              dur={`${getAnimationDuration(currentFlow.pvToGrid)}s`}
              repeatCount="indefinite"
              begin={`${i * 0.3}s`}
            />
            <animate attributeName="opacity" values="0;0.8;0" dur={`${getAnimationDuration(currentFlow.pvToGrid)}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} />
          </circle>
        ))}

        {/* Animated Particles - Battery to House */}
        {Array.from({ length: getParticleCount(currentFlow.batteryToHouse) }).map((_, i) => (
          <circle key={`battery-house-${i}`} r="3" fill="#22c55e" opacity="0.8">
            <animateMotion
              path={`M ${nodes.battery.x - nodeRadius} ${nodes.battery.y} L ${nodes.house.x + nodeRadius} ${nodes.house.y}`}
              dur={`${getAnimationDuration(currentFlow.batteryToHouse)}s`}
              repeatCount="indefinite"
              begin={`${i * 0.3}s`}
            />
            <animate attributeName="opacity" values="0;0.8;0" dur={`${getAnimationDuration(currentFlow.batteryToHouse)}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} />
          </circle>
        ))}

        {/* Animated Particles - Grid to House - L inversé */}
        {Array.from({ length: getParticleCount(currentFlow.gridToHouse) }).map((_, i) => (
          <circle key={`grid-house-${i}`} r="3" fill="#64748b" opacity="0.8">
            <animateMotion
              path={`M ${nodes.grid.x} ${nodes.grid.y - nodeRadius} L ${nodes.grid.x} ${nodes.house.y} L ${nodes.house.x + nodeRadius} ${nodes.house.y}`}
              dur={`${getAnimationDuration(currentFlow.gridToHouse)}s`}
              repeatCount="indefinite"
              begin={`${i * 0.3}s`}
            />
            <animate attributeName="opacity" values="0;0.8;0" dur={`${getAnimationDuration(currentFlow.gridToHouse)}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} />
          </circle>
        ))}
      </svg>
    </div>
  );
};

export default EnergyFlowDiagram;
