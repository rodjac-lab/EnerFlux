export const formatPercent = (value: number, fractionDigits = 1): string =>
  `${(value * 100).toFixed(fractionDigits)} %`;

export const formatCycles = (value: number, fractionDigits = 2): string =>
  value.toFixed(fractionDigits);

export const formatKWh = (value: number, fractionDigits = 1): string =>
  `${value.toFixed(fractionDigits)} kWh`;

export const formatTemperature = (value: number, fractionDigits = 1): string =>
  `${value.toFixed(fractionDigits)} °C`;

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
