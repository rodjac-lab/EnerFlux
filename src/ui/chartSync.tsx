import React, { createContext, useContext, useMemo, useState } from 'react';

type Domain = [number, number] | null;

interface ChartSyncValue {
  hoverTs: number | null;
  setHoverTs: (ts: number | null) => void;
  domain: Domain;
  setDomain: (domain: Domain) => void;
}

const ChartSyncContext = createContext<ChartSyncValue | undefined>(undefined);

interface ProviderProps {
  children: React.ReactNode;
}

export const ChartSyncProvider: React.FC<ProviderProps> = ({ children }) => {
  const [hoverTs, setHoverTs] = useState<number | null>(null);
  const [domain, setDomain] = useState<Domain>(null);
  const value = useMemo(
    () => ({
      hoverTs,
      setHoverTs,
      domain,
      setDomain
    }),
    [hoverTs, domain]
  );
  return <ChartSyncContext.Provider value={value}>{children}</ChartSyncContext.Provider>;
};

export const useChartSync = (): ChartSyncValue => {
  const ctx = useContext(ChartSyncContext);
  if (!ctx) {
    throw new Error('useChartSync must be used within a ChartSyncProvider');
  }
  return ctx;
};

