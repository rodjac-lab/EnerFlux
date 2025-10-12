import React, { useState } from 'react';

interface CollapsibleCardProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const baseButtonClasses =
  'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700';

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  description,
  defaultOpen = false,
  children
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        className={baseButtonClasses}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
          {description ? <p className="text-xs font-normal text-slate-500">{description}</p> : null}
        </div>
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7 5l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div className="border-t border-slate-200 px-4 py-4 text-sm">
          <div className="space-y-4">{children}</div>
        </div>
      ) : null}
    </section>
  );
};

export default CollapsibleCard;
