export interface ExportMetaV1 {
  version: '1.0';
  scenario: string;
  dt_s: number;
  tariffs: {
    mode: 'fixed' | 'tou';
    import_EUR_per_kWh: number;
    export_EUR_per_kWh: number;
    tou?: {
      onpeak_hours: number[];
      offpeak_hours: number[];
      onpeak_price: number;
      offpeak_price: number;
    };
  };
  batteryConfig: {
    socMin_kWh: number;
    socMax_kWh: number;
    maxCharge_kW: number;
    maxDischarge_kW: number;
    efficiency: number;
  };
  dhwConfig: {
    mode: 'force' | 'penalize' | 'off';
    targetCelsius: number;
    deadlineHour?: number;
    hysteresis_K?: number;
  };
  strategyA: { id: string };
  strategyB: { id: string };
}

export interface ExportStep {
  t_s: number;
  pv_kW: number;
  baseLoad_kW: number;
  surplus_A_kW: number;
  deficit_A_kW: number;
  battery_power_A_kW: number;
  battery_soc_A_kWh: number;
  dhw_power_A_kW: number;
  dhw_temp_A_C: number;
  gridImport_A_kW: number;
  gridExport_A_kW: number;
  pvUsedOnSite_A_kW: number;
  decision_reason_A: string;
  surplus_B_kW: number;
  deficit_B_kW: number;
  battery_power_B_kW: number;
  battery_soc_B_kWh: number;
  dhw_power_B_kW: number;
  dhw_temp_B_C: number;
  gridImport_B_kW: number;
  gridExport_B_kW: number;
  pvUsedOnSite_B_kW: number;
  decision_reason_B: string;
}

export interface ExportKPIs {
  autoconsumption_pct: number;
  autoproduct_pct: number;
  import_kWh: number;
  export_kWh: number;
  cost_EUR: number;
  ecs_time_at_or_above_target_pct: number;
}

export interface ExportV1 {
  meta: ExportMetaV1;
  steps: ExportStep[];
  kpis: { A: ExportKPIs; B: ExportKPIs };
}
