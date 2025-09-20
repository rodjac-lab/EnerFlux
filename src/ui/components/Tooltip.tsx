import React, { useId, useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const childProps: Partial<React.DOMAttributes<HTMLElement>> & {
    'aria-describedby': string;
  } = {
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      if (children.props.onMouseEnter) {
        children.props.onMouseEnter(event);
      }
      show();
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      if (children.props.onMouseLeave) {
        children.props.onMouseLeave(event);
      }
      hide();
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      if (children.props.onFocus) {
        children.props.onFocus(event);
      }
      show();
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      if (children.props.onBlur) {
        children.props.onBlur(event);
      }
      hide();
    },
    'aria-describedby': [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')
  };

  return (
    <span className="relative inline-flex">
      {React.cloneElement(children, childProps)}
      <span
        role="tooltip"
        id={tooltipId}
        className={`pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white shadow transition-opacity duration-150 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden={!visible}
      >
        {content}
      </span>
    </span>
  );
};

export default Tooltip;
