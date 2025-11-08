---
title: "EnerFlux — Dark-First UI Theme + Chart Theme + Internal Preview"
type: "PR Dev Brief"
target: "Claude Code / Codex"
status: "ready-for-execution"
---

# 🧠 EnerFlux — Dark-First UI & Chart Theme + Preview Page  
**Scope:** UI only — no logic or data changes  

---

## 🎯 Objective
Introduce a **dark-first design system** (Amplitude / Vercel / Railway style), unify chart visuals (axes, grid, tooltip, series), and create a `/preview` page to validate the new visual identity before rollout.

---

## ⚙️ Step 1 — Add global theme tokens
Create `src/ui/theme/theme.css` and import it globally (e.g. in `src/ui/App.tsx` or `src/ui/index.css`):

```css
:root {
  --bg:#0B0B0D; --surface:#111113; --text:#F8FAFC; --muted:#A1A1AA;
  --border:#1E1E20; --accent:#6366F1; --accent-2:#06B6D4;
  --success:#10B981; --warn:#FBBF24; --error:#EF4444;
  --radius-sm:6px; --radius-md:10px; --radius-lg:16px;
}
html,body{background:var(--bg);color:var(--text);}
⚙️ Step 2 — Extend Tailwind config
Edit tailwind.config.js:

js
Copier le code
export default {
  darkMode:'class',
  theme:{
    extend:{
      colors:{
        bg:'var(--bg)',
        surface:'var(--surface)',
        text:'var(--text)',
        muted:'var(--muted)',
        border:'var(--border)',
        accent:'var(--accent)',
        accent2:'var(--accent-2)',
        success:'var(--success)',
        warn:'var(--warn)',
        error:'var(--error)',
      },
      borderRadius:{
        sm:'var(--radius-sm)',
        md:'var(--radius-md)',
        lg:'var(--radius-lg)',
      },
    },
  },
  plugins:[],
};
Root container should enforce dark mode:

html
Copier le code
<div id="root" class="dark bg-bg text-text">
⚙️ Step 3 — Add reusable primitives
src/ui/components/primitives/Button.tsx

tsx
Copier le code
export function Button({className='',...props}:React.ButtonHTMLAttributes<HTMLButtonElement>){
  return(
    <button
      className={`rounded-md px-5 py-3 font-semibold text-white transition-transform ${className}`}
      style={{background:'linear-gradient(90deg,var(--accent),var(--accent-2))'}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 0 24px rgba(99,102,241,0.35)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='0 0 0 rgba(0,0,0,0)'}
      {...props}
    />
  );
}
src/ui/components/primitives/Card.tsx

tsx
Copier le code
export function Card({className='',...props}:React.HTMLAttributes<HTMLDivElement>){
  return(
    <div
      className={`rounded-lg border p-6 ${className}`}
      style={{
        background:'rgba(255,255,255,0.03)',
        borderColor:'var(--border)',
        boxShadow:'0 0 40px rgba(0,0,0,0.25)',
        backdropFilter:'blur(12px)',
      }}
      {...props}
    />
  );
}
⚙️ Step 4 — Unified chart visuals
src/ui/charts/chartTheme.ts

ts
Copier le code
export const chartTheme={
  bg:'#0B0B0D',
  grid:'rgba(255,255,255,0.06)',
  axis:'rgba(255,255,255,0.45)',
  label:'#F8FAFC',
  tooltipBg:'rgba(17,17,19,0.95)',
  tooltipBorder:'rgba(255,255,255,0.08)',
  series:['#818CF8','#22D3EE','#10B981','#F59E0B','#F472B6'],
}as const;
src/ui/charts/withDarkDefaults.tsx

tsx
Copier le code
import {chartTheme}from'./chartTheme';
export const tooltipStyle={
  background:chartTheme.tooltipBg,
  border:`1px solid ${chartTheme.tooltipBorder}`,
  color:chartTheme.label,
};
export const axisStroke=chartTheme.axis;
export const gridStroke=chartTheme.grid;
export const labelColor=chartTheme.label;
export const series=chartTheme.series;
Refactor charts under src/ui/charts/** to use these constants (no hardcoded hex).

⚙️ Step 5 — Add internal preview page
Create src/ui/preview/DarkPreview.tsx and paste the validated mockup:

Hero section with CTA

Stats cards

Two charts (PV vs Load, Battery)

Framer Motion animations

Recharts styled with chartTheme

Expose route /preview so it’s viewable at http://localhost:5173/preview.

✅ Step 6 — Verification checklist
 Dark theme enforced

 Charts use chartTheme

 /preview renders correctly

 No changes under /core, /devices, /workers

 Tailwind build succeeds

 Contrast & accessibility OK

🧩 PR Title & Description
Title:
feat(ui): add dark-first design system + chart theme + preview page

Description:

Adds dark-first CSS-variable theme

Extends Tailwind with design tokens

Adds Button + Card primitives

Introduces unified chart visuals

Adds /preview page to validate theme

No business logic or data change
