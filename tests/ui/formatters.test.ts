import { fmt } from '../../src/ui/chartTheme';

describe('chart formatters', () => {
  it('formats watts to kW with one decimal', () => {
    expect(fmt.kw(5000)).toBe('5.0 kW');
    expect(fmt.kw(2450)).toBe('2.5 kW');
    expect(fmt.kw(2.34)).toBe('2.3 kW');
  });

  it('formats kWh with two decimals', () => {
    expect(fmt.kwh(0)).toBe('0.00 kWh');
    expect(fmt.kwh(12.345)).toBe('12.35 kWh');
  });

  it('formats euros as rounded integer', () => {
    expect(fmt.eur(4.2)).toBe('4 €');
    expect(fmt.eur(4.6)).toBe('5 €');
  });

  it('formats percentages between 0 and 1', () => {
    expect(fmt.pct(0)).toBe('0%');
    expect(fmt.pct(0.456)).toBe('46%');
    expect(fmt.pct(1)).toBe('100%');
  });

  it('formats time inputs consistently', () => {
    expect(fmt.time(8.5)).toBe('08:30');
    expect(fmt.time('6:05')).toBe('06:05');
    expect(fmt.time(new Date(2023, 0, 1, 21, 15))).toBe('21:15');
  });
});
