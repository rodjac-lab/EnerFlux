export const formatPct = (value: number, fractionDigits = 1): string =>
  `${(value * 100).toFixed(fractionDigits)} %`;

export const formatKWh = (value: number, fractionDigits = 1): string =>
  `${value.toFixed(fractionDigits)} kWh`;

export const formatDelta = (value: number, fractionDigits = 1, suffix = ''): string => {
  const trimmedSuffix = suffix.trim();
  const suffixPart = trimmedSuffix ? ` ${trimmedSuffix}` : '';
  if (value === 0) {
    return `±${Math.abs(value).toFixed(fractionDigits)}${suffixPart}`;
  }
  const sign = value > 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(fractionDigits)}${suffixPart}`;
};

export const formatEUR = (value: number, fractionDigits = 2): string => {
  const sign = value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(fractionDigits)} €`;
};

export const formatPrice = (value: number, fractionDigits = 3): string =>
  `${value.toFixed(fractionDigits)} €/kWh`;

export const formatPercent = (value: number, fractionDigits = 1): string =>
  formatPct(value, fractionDigits);

export const formatCycles = (value: number, fractionDigits = 2): string =>
  value.toFixed(fractionDigits);

export const formatTemperature = (value: number, fractionDigits = 1): string =>
  `${value.toFixed(fractionDigits)} °C`;

export const formatYears = (value: number, fractionDigits = 1): string => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const unit = Math.abs(value) >= 2 ? 'ans' : 'an';
  return `${value.toFixed(fractionDigits)} ${unit}`;
};

const download = (filename: string, blob: Blob) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const downloadJSON = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  download(filename, blob);
};

export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escape = (value: string | number) => {
    const str = String(value);
    if (str.includes(';') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.join(';'), ...rows.map((row) => row.map(escape).join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  download(filename, blob);
};
