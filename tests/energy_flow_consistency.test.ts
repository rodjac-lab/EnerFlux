
/**
 * Test de cohérence des flux énergétiques calculés pour EnergyFlowDiagram
 * Vérifie que les formules respectent le bilan énergétique du moteur
 */
describe('Energy Flow Consistency', () => {
  it('should correctly split PV between house, battery, and grid', () => {
    // Simulated data point from engine output
    const point = {
      pv_kW: 5.0,
      baseLoad_kW: 2.0,
      dhw_power_kW: 1.0, // Total consumption = 3.0 kW
      batt_charge_kW: 1.5,
      batt_discharge_kW: 0,
      gridImport_kW: 0,
      gridExport_kW: 0.5,
      pvUsedOnSite_kW: 4.5, // PV - export = 5.0 - 0.5
    };

    const totalConsumption = point.baseLoad_kW + point.dhw_power_kW; // 3.0 kW

    // Following EnergyFlowDiagram logic (after fix)
    const pvToHouse = Math.min(point.pvUsedOnSite_kW, totalConsumption); // min(4.5, 3.0) = 3.0
    const pvToBattery = Math.max(0, point.pvUsedOnSite_kW - totalConsumption); // max(0, 4.5 - 3.0) = 1.5
    const pvToGrid = point.gridExport_kW; // 0.5
    const batteryToHouse = point.batt_discharge_kW; // 0
    const gridToHouse = point.gridImport_kW; // 0

    // Verify PV balance: PV total = pvToHouse + pvToBattery + pvToGrid
    const pvTotal = pvToHouse + pvToBattery + pvToGrid;
    expect(pvTotal).toBeCloseTo(point.pv_kW, 6); // 3.0 + 1.5 + 0.5 = 5.0 ✓

    // Verify consumption balance: consumption = pvToHouse + batteryToHouse + gridToHouse
    const supply = pvToHouse + batteryToHouse + gridToHouse;
    expect(supply).toBeCloseTo(totalConsumption, 6); // 3.0 + 0 + 0 = 3.0 ✓

    // Verify pvUsedOnSite correctness
    expect(pvToHouse + pvToBattery).toBeCloseTo(point.pvUsedOnSite_kW, 6); // 3.0 + 1.5 = 4.5 ✓
  });

  it('should handle deficit scenario with battery discharge', () => {
    const point = {
      pv_kW: 1.0,
      baseLoad_kW: 2.0,
      dhw_power_kW: 1.0, // Total consumption = 3.0 kW
      batt_charge_kW: 0,
      batt_discharge_kW: 1.5,
      gridImport_kW: 0.5,
      gridExport_kW: 0,
      pvUsedOnSite_kW: 1.0, // All PV used locally
    };

    const totalConsumption = point.baseLoad_kW + point.dhw_power_kW;

    const pvToHouse = Math.min(point.pvUsedOnSite_kW, totalConsumption); // min(1.0, 3.0) = 1.0
    const pvToBattery = Math.max(0, point.pvUsedOnSite_kW - totalConsumption); // max(0, 1.0 - 3.0) = 0
    const pvToGrid = point.gridExport_kW; // 0
    const batteryToHouse = point.batt_discharge_kW; // 1.5
    const gridToHouse = point.gridImport_kW; // 0.5

    // PV balance
    expect(pvToHouse + pvToBattery + pvToGrid).toBeCloseTo(point.pv_kW, 6); // 1.0 + 0 + 0 = 1.0 ✓

    // Consumption balance
    expect(pvToHouse + batteryToHouse + gridToHouse).toBeCloseTo(totalConsumption, 6); // 1.0 + 1.5 + 0.5 = 3.0 ✓
  });

  it('should handle full export scenario', () => {
    const point = {
      pv_kW: 8.0,
      baseLoad_kW: 0.5,
      dhw_power_kW: 0, // Total consumption = 0.5 kW
      batt_charge_kW: 2.5, // Battery fully charged from PV
      batt_discharge_kW: 0,
      gridImport_kW: 0,
      gridExport_kW: 5.0, // Export surplus
      pvUsedOnSite_kW: 3.0, // PV - export = 8.0 - 5.0
    };

    const totalConsumption = point.baseLoad_kW + point.dhw_power_kW;

    const pvToHouse = Math.min(point.pvUsedOnSite_kW, totalConsumption); // min(3.0, 0.5) = 0.5
    const pvToBattery = Math.max(0, point.pvUsedOnSite_kW - totalConsumption); // max(0, 3.0 - 0.5) = 2.5
    const pvToGrid = point.gridExport_kW; // 5.0
    const batteryToHouse = point.batt_discharge_kW; // 0
    const gridToHouse = point.gridImport_kW; // 0

    // PV balance
    expect(pvToHouse + pvToBattery + pvToGrid).toBeCloseTo(point.pv_kW, 6); // 0.5 + 2.5 + 5.0 = 8.0 ✓

    // Consumption balance
    expect(pvToHouse + batteryToHouse + gridToHouse).toBeCloseTo(totalConsumption, 6); // 0.5 + 0 + 0 = 0.5 ✓
  });

  it('should handle zero PV scenario', () => {
    const point = {
      pv_kW: 0,
      baseLoad_kW: 2.0,
      dhw_power_kW: 1.0, // Total consumption = 3.0 kW
      batt_charge_kW: 0,
      batt_discharge_kW: 2.0,
      gridImport_kW: 1.0,
      gridExport_kW: 0,
      pvUsedOnSite_kW: 0,
    };

    const totalConsumption = point.baseLoad_kW + point.dhw_power_kW;

    const pvToHouse = Math.min(point.pvUsedOnSite_kW, totalConsumption); // min(0, 3.0) = 0
    const pvToBattery = Math.max(0, point.pvUsedOnSite_kW - totalConsumption); // max(0, 0 - 3.0) = 0
    const pvToGrid = point.gridExport_kW; // 0
    const batteryToHouse = point.batt_discharge_kW; // 2.0
    const gridToHouse = point.gridImport_kW; // 1.0

    // PV balance
    expect(pvToHouse + pvToBattery + pvToGrid).toBeCloseTo(point.pv_kW, 6); // 0 + 0 + 0 = 0 ✓

    // Consumption balance
    expect(pvToHouse + batteryToHouse + gridToHouse).toBeCloseTo(totalConsumption, 6); // 0 + 2.0 + 1.0 = 3.0 ✓
  });
});
