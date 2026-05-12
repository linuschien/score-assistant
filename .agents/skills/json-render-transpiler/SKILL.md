---
name: json-render-transpiler
description: Deterministic transpiler that converts ui-manifest.json component trees into lightweight runtime JSON-render specs natively prioritizing the 36 pre-built components from @json-render/shadcn.
---

# Skill: JSON-Render Transpiler

## ℹ️ Objective
Converts a validated UI Manifest directly into the recursive spec tree consumed by `<Renderer />`, strictly prioritizing the **36 pre-built components from `@json-render/shadcn`** out of the box. Custom registry keys are generated only to merge custom business components or composite visualizations (e.g., tailored metrics, advanced composite charts) that extend beyond the standard presets.

---

## 🗺️ Canonical Mapping Table: Prioritizing `@json-render/shadcn` Presets

Whenever an `abstract_type` maps to a standard component, resolve its component key directly to the pre-built string identifier provided by `@json-render/shadcn`.

| abstract_type | semantic_variant | Resolved Component Key | Source / Notes |
|---|---|---|---|
| `Container` | `page` | `"Container:page"` | Custom layout shell |
| `Container` | `card` | `"Card"` | `@json-render/shadcn` preset |
| `Container` | `panel` | `"Card"` | `@json-render/shadcn` preset (pass variant props) |
| `Container` | *(default)* | `"div"` | Native HTML wrapper |
| `Section` | `form-section` | `"Card"` | `@json-render/shadcn` preset |
| `Section` | `list-section` | `"div"` | Native HTML wrapper |
| `Section` | `summary-section` | `"div"` | Native HTML wrapper |
| `Section` | *(default)* | `"div"` | Native HTML wrapper |
| `Grid` | *(any)* | `"div"` | Native HTML wrapper (pass grid classes via props) |
| `Stack` | `breadcrumb` | `"Breadcrumb"` | `@json-render/shadcn` preset |
| `Stack` | *(default)* | `"div"` | Native HTML wrapper |
| `Heading` | *(any)* | `"h1"` / `"h2"` / `"h3"` | Native HTML element |
| `Text` | *(any)* | `"p"` | Native HTML element |
| `Metric` | *(any)* | `"MetricCard"` | Custom composite component |
| `Chart` | `bar` | `"Chart:bar"` | Custom composite Recharts wrapper |
| `Chart` | `line` | `"Chart:line"` | Custom composite Recharts wrapper |
| `Chart` | `pie` | `"Chart:pie"` | Custom composite Recharts wrapper |
| `Chart` | *(default)* | `"ChartContainer"` | Custom composite Recharts wrapper |
| `Table` | `data-table` | `"DataTable"` | Custom composite data-table |
| `Table` | `summary-table` | `"Table"` | `@json-render/shadcn` preset |
| `Table` | *(default)* | `"Table"` | `@json-render/shadcn` preset |
| `Field` | *(any)* | `"Input"` | `@json-render/shadcn` preset |
| `Selection` | `dropdown` | `"Select"` | `@json-render/shadcn` preset |
| `Selection` | `radio` | `"RadioGroup"` | `@json-render/shadcn` preset |
| `Selection` | `checkbox` | `"Checkbox"` | `@json-render/shadcn` preset |
| `Selection` | `multi-select` | `"MultiSelect"` | Custom composite component |
| `Selection` | *(default)* | `"Select"` | `@json-render/shadcn` preset |
| `Switch` | *(any)* | `"Switch"` | `@json-render/shadcn` preset |
| `Trigger` | *(any)* | `"Button"` | `@json-render/shadcn` preset (pass variant as prop) |
| `Overlay` | `modal` | `"Dialog"` | `@json-render/shadcn` preset |
| `Overlay` | `drawer` | `"Drawer"` | `@json-render/shadcn` preset |
| `Overlay` | `tooltip` | `"Tooltip"` | `@json-render/shadcn` preset |
| `Overlay` | `confirm-dialog` | `"AlertDialog"` | `@json-render/shadcn` preset |
| `Overlay` | *(default)* | `"Dialog"` | `@json-render/shadcn` preset |

> **Fallback Rule**: If an element type is not standardly present in the preset library, fall back to a generic wrapper or log a warning in the output report.

---

## 🛠️ JSON-Render Spec Format

Transform the UI Manifest's `root_element` tree directly into a native JSON-render spec tree matching the structure consumed by `<Renderer spec={spec} />`.

### Recursive Node Structure
```jsonc
{
  "component": "Card", // Leverages @json-render/shadcn preset key directly
  "props": {
    "id": "<element.id>",
    "label": "<label>",          // Include only if present in manifest
    "dataRef": "<operationId>",  // Include only if data_ref is present
    "behaviorRef": "<scenario>", // Include only if behavior_ref is present
    "variant": "<semantic_variant>" // Maps semantic_variant to native variant props
  },
  // Pass declarative event interactions via props
  "interactions": [
    {
      "on": "<on_event>",
      "targetId": "<target_id>",
      "behaviorRef": "<behavior_ref>"
    }
  ],
  // Retain recursive component layouts directly
  "children": [
    {
      "component": "Button",
      "props": { "id": "submit-btn", "label": "Submit", "variant": "default" }
    }
  ]
}
```

### Transpilation Rules
- Keep the exact recursive layout defined in the UI Manifest. Do not flatten.
- Component keys map directly to the simple string names exported by `@json-render/shadcn` (e.g., `"Button"`, `"Input"`, `"Select"`, `"Card"`, `"Dialog"`).
- Strip out schema validation properties (`ui_id`, `domain_module`) from the node payload.
- Omit `children` or `interactions` keys entirely if their arrays are empty.

---

## 🛠️ Component Registry Spec

File: `src/json-render/component-registry.ts`

Provide a unified mapping dictionary that directly imports the base presets from `@json-render/shadcn` and merges any custom composite components required by the project.

```typescript
// AUTO-GENERATED by Frontend Engineer workflow — DO NOT EDIT MANUALLY
import { presetComponents } from '@json-render/shadcn';
import type { ComponentType } from 'react';

// Import custom composite components for complex visualizations/metrics
import { MetricCard } from '@/components/metric-card';
import { DataTable } from '@/components/data-table';
import { MultiSelect } from '@/components/multi-select';
import { CustomChartContainer } from '@/components/custom-chart-container';

export type RegistryKey = string;
export type ComponentEntry = ComponentType<any>;

export const componentRegistry: Record<RegistryKey, ComponentEntry> = {
  // ── 1. Inherit all 36 pre-built components natively ────────────────────────
  ...presetComponents,

  // ── 2. Extend with custom layouts and composite wrappers ──────────────────
  'Container:page': ({ children }) => <div className="container mx-auto py-6">{children}</div>,
  'MetricCard':     MetricCard,
  'DataTable':      DataTable,
  'MultiSelect':    MultiSelect,
  'Chart:bar':      (props) => <CustomChartContainer {...props} type="bar" />,
  'Chart:line':     (props) => <CustomChartContainer {...props} type="line" />,
  'Chart:pie':      (props) => <CustomChartContainer {...props} type="pie" />,
};
```

> **Additive Rule**: When updating an existing registry file, ONLY append new component keys to the merged object. Never remove existing custom keys to prevent runtime rendering crashes for already deployed screen layouts.

---

## ⚠️ Output Requirements
- **Format**: Pure JSON (render spec) and pure TypeScript (registry mapping). Zero custom layout engines.
- **Native Alignment**: Maximize the reuse of `@json-render/shadcn` components out of the box.
- **Idempotency**: Identical manifest structures MUST yield structurally identical JSON output trees.
