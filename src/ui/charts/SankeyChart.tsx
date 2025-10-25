import React, { useRef, useEffect, useState } from 'react';
import {
  sankey,
  sankeyLinkHorizontal,
  sankeyLeft,
  type SankeyGraph,
  type SankeyNode as D3SankeyNode,
  type SankeyLink as D3SankeyLink
} from 'd3-sankey';
import type { SankeyData } from '../utils/sankeyData';

interface SankeyChartProps {
  data: SankeyData;
  variant: 'A' | 'B';
  width?: number;
  height?: number;
}

interface ExtendedSankeyNode extends D3SankeyNode<{}, {}> {
  name?: string;
}

interface ExtendedSankeyLink extends D3SankeyLink<ExtendedSankeyNode, {}> {
  value: number;
}

const SankeyChart: React.FC<SankeyChartProps> = ({ data, variant, width = 600, height = 400 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);

  // Color schemes for variants A and B
  const colors = {
    A: {
      node: '#10b981', // green-500
      link: '#059669', // green-600
      linkHover: '#047857' // green-700
    },
    B: {
      node: '#8b5cf6', // violet-500
      link: '#7c3aed', // violet-600
      linkHover: '#6d28d9' // violet-700
    }
  };

  const theme = colors[variant];

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) {
      return;
    }

    const svg = svgRef.current;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create sankey layout
    const sankeyGenerator = sankey<ExtendedSankeyNode, ExtendedSankeyLink>()
      .nodeWidth(15)
      .nodePadding(20)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom]
      ])
      .nodeAlign(sankeyLeft);

    // Prepare data with proper typing
    const graph: SankeyGraph<ExtendedSankeyNode, ExtendedSankeyLink> = {
      nodes: data.nodes.map(n => ({ ...n })),
      links: data.links.map(l => ({ ...l }))
    };

    // Generate layout
    const { nodes, links } = sankeyGenerator(graph);

    // Clear previous content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Create main group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);

    // Draw links
    const linkGenerator = sankeyLinkHorizontal();
    links.forEach((link, index) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pathData = linkGenerator(link as any);
      if (pathData) {
        path.setAttribute('d', pathData);
      }
      path.setAttribute('stroke', theme.link);
      path.setAttribute('stroke-width', String(Math.max(1, link.width ?? 1)));
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', hoveredLink === index ? '0.8' : '0.4');
      path.style.cursor = 'pointer';
      path.style.transition = 'opacity 0.2s';

      // Add hover events
      path.addEventListener('mouseenter', () => setHoveredLink(index));
      path.addEventListener('mouseleave', () => setHoveredLink(null));

      // Add title for tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      const sourceNode = link.source as ExtendedSankeyNode;
      const targetNode = link.target as ExtendedSankeyNode;
      title.textContent = `${sourceNode.name} → ${targetNode.name}: ${link.value.toFixed(2)} kWh`;
      path.appendChild(title);

      g.appendChild(path);

      // Add value label on the link (only if significant value and wide enough)
      if (link.value >= 0.1 && (link.width ?? 0) >= 3) {
        const sourceNode = link.source as ExtendedSankeyNode;
        const targetNode = link.target as ExtendedSankeyNode;

        // Calculate label position at the middle of the link
        const x0 = sourceNode.x1 ?? 0;
        const x1 = targetNode.x0 ?? 0;
        const y0 = link.y0 ?? 0;
        const y1 = link.y1 ?? 0;

        const midX = (x0 + x1) / 2;
        const midY = (y0 + y1) / 2;

        // Create text label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(midX));
        text.setAttribute('y', String(midY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '0.35em');
        text.setAttribute('font-size', '10px');
        text.setAttribute('font-weight', '600');
        text.setAttribute('fill', '#1e293b'); // slate-900
        text.setAttribute('pointer-events', 'none');
        text.textContent = link.value.toFixed(1);

        // Add white background for readability
        // Must append text first to get bbox
        g.appendChild(text);
        const bbox = text.getBBox();
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(bbox.x - 2));
        rect.setAttribute('y', String(bbox.y - 1));
        rect.setAttribute('width', String(bbox.width + 4));
        rect.setAttribute('height', String(bbox.height + 2));
        rect.setAttribute('fill', 'white');
        rect.setAttribute('opacity', '0.9');
        rect.setAttribute('rx', '2');
        rect.setAttribute('pointer-events', 'none');

        // Insert rect before text so text appears on top
        g.insertBefore(rect, text);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      if (node.x0 === undefined || node.x1 === undefined || node.y0 === undefined || node.y1 === undefined) {
        return;
      }

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(node.x0));
      rect.setAttribute('y', String(node.y0));
      rect.setAttribute('width', String(node.x1 - node.x0));
      rect.setAttribute('height', String(node.y1 - node.y0));
      rect.setAttribute('fill', theme.node);
      rect.setAttribute('opacity', '0.8');

      // Add title for tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = node.name ?? '';
      rect.appendChild(title);

      g.appendChild(rect);

      // Add node label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const isLeftSide = (node.x0 ?? 0) < width / 2;
      text.setAttribute('x', String(isLeftSide ? (node.x0 ?? 0) - 6 : (node.x1 ?? 0) + 6));
      text.setAttribute('y', String(((node.y0 ?? 0) + (node.y1 ?? 0)) / 2));
      text.setAttribute('dy', '0.35em');
      text.setAttribute('text-anchor', isLeftSide ? 'end' : 'start');
      text.setAttribute('font-size', '12px');
      text.setAttribute('fill', '#475569'); // slate-600
      text.textContent = node.name ?? '';

      g.appendChild(text);
    });
  }, [data, width, height, variant, hoveredLink, theme]);

  if (data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-500">
        Aucun flux énergétique significatif détecté
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="overflow-visible"
      role="img"
      aria-label={`Diagramme de Sankey des flux énergétiques - Stratégie ${variant}`}
    />
  );
};

export default SankeyChart;
