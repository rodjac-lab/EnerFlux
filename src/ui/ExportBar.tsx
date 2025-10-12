import React from 'react';
import { buildCSVContent, serializeJSON } from '../core/exporter';
import type { ExportV1 } from '../types/export';
import { WindowFilter } from '../data/series';
import { buildWindowedExport } from '../data/kpis';

interface ExportBarProps {
  trace: ExportV1;
  window?: WindowFilter;
}

const formatFilename = (meta: ExportV1['meta'], window?: WindowFilter, ext: 'json' | 'csv'): string => {
  const start = window?.startH ?? 0;
  const end = window?.endH ?? 24;
  const now = new Date();
  const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `${meta.scenario}_${start}-${end}_${isoDate}.${ext}`;
};

const ExportBar: React.FC<ExportBarProps> = ({ trace, window }) => {
  const handleExport = (format: 'json' | 'csv') => {
    const scoped = buildWindowedExport(trace, window);
    const filename = formatFilename(trace.meta, window, format);
    if (format === 'json') {
      const content = serializeJSON(scoped);
      const blob = new Blob([content], { type: 'application/json' });
      triggerDownload(filename, blob);
    } else {
      const content = buildCSVContent(scoped);
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(filename, blob);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => handleExport('json')}
        className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
      >
        Export JSON (A+B)
      </button>
      <button
        type="button"
        onClick={() => handleExport('csv')}
        className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        Export CSV (A+B)
      </button>
    </div>
  );
};

const triggerDownload = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default ExportBar;

