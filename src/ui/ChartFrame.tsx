import React, { useId } from 'react';
import { Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { chartFont } from './chartTheme';

interface ChartFrameProps {
  title: string;
  subtitle?: string;
  legend?: boolean;
  height?: number | string;
  minHeight?: number;
  children: React.ReactElement;
}

const hasLegendChild = (child: React.ReactElement): boolean => {
  const children = React.Children.toArray(child.props.children);
  return children.some(
    (element) => React.isValidElement(element) && element.type === Legend
  );
};

const injectLegend = (child: React.ReactElement): React.ReactElement => {
  const children = React.Children.toArray(child.props.children);
  const nextChildren = [
    ...children,
    <Legend
      key="chart-legend"
      verticalAlign="bottom"
      iconType="circle"
      wrapperStyle={{
        paddingTop: 12,
        fontFamily: chartFont.family,
        fontSize: chartFont.sizes.legend
      }}
    />
  ];
  return React.cloneElement(child, { children: nextChildren });
};

export const DefaultTooltip: React.FC<TooltipProps<number | string, string>> = (props) => {
  const { active, payload, label, formatter, labelFormatter } = props;

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const formattedLabel = labelFormatter
    ? labelFormatter(label, payload)
    : label;
  const labelText = Array.isArray(formattedLabel)
    ? formattedLabel.join(' ')
    : formattedLabel;

  const entries = payload.map((entry, index) => {
    let value: React.ReactNode = entry.value;
    let name: React.ReactNode = entry.name ?? entry.dataKey;

    if (formatter) {
      const entryName = String(entry.name ?? entry.dataKey ?? '');
      const entryValue = entry.value as string | number;
      const formatted = formatter(entryValue, entryName, entry, index, payload);
      if (Array.isArray(formatted)) {
        const [formattedValue, formattedName] = formatted as [React.ReactNode, React.ReactNode];
        value = formattedValue;
        if (formattedName != null) {
          name = formattedName;
        }
      } else if (formatted != null) {
        value = formatted;
      }
    }

    return {
      key: `${entry.dataKey ?? index}`,
      color: entry.color,
      name,
      value
    };
  });

  const extra = (payload[0]?.payload as { reason?: string } | undefined)?.reason;

  return (
    <div className="rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-md">
      {labelText != null && labelText !== '' ? (
        <div
          className="font-semibold text-slate-900"
          style={{ fontFamily: chartFont.family }}
        >
          {labelText}
        </div>
      ) : null}
      <ul className="mt-2 space-y-1">
        {entries.map((entry) => (
          <li
            key={entry.key}
            className="flex items-center gap-2 text-[11px] text-slate-700 tabular-nums"
            style={{ fontFamily: chartFont.family }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color ?? '#475569' }}
              aria-hidden="true"
            />
            <span className="flex-1">{entry.name}</span>
            <span>{entry.value}</span>
          </li>
        ))}
      </ul>
      {extra ? (
        <div className="mt-2 text-[10px] text-slate-500" style={{ fontFamily: chartFont.family }}>
          {extra}
        </div>
      ) : null}
    </div>
  );
};

const ChartFrame: React.FC<ChartFrameProps> = ({
  title,
  subtitle,
  legend = true,
  height,
  minHeight,
  children
}) => {
  const baseId = useId();
  const titleId = `${baseId}-chart-title`;
  const subtitleId = subtitle ? `${baseId}-chart-subtitle` : undefined;
  const labelledBy = subtitleId ? `${titleId} ${subtitleId}` : titleId;

  let chartContent = children;
  if (legend && React.isValidElement(children) && !hasLegendChild(children)) {
    chartContent = injectLegend(children);
  }

  const containerStyle: React.CSSProperties = {};
  const effectiveHeight = height ?? (minHeight !== undefined ? minHeight : undefined);

  return (
    <section
      className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      role="group"
      aria-labelledby={labelledBy}
      tabIndex={0}
    >
      <header className="mb-3">
        <h3
          id={titleId}
          className="text-base font-semibold text-slate-900"
          style={{ fontFamily: chartFont.family, fontSize: chartFont.sizes.title }}
        >
          {title}
        </h3>
        {subtitle ? (
          <p
            id={subtitleId}
            className="text-sm text-slate-600"
            style={{ fontFamily: chartFont.family, fontSize: chartFont.sizes.axis }}
          >
            {subtitle}
          </p>
        ) : null}
      </header>
      <div className="relative" style={containerStyle}>
        <ResponsiveContainer width="100%" height={effectiveHeight}>
          {chartContent}
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default ChartFrame;
