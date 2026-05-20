---
name: json-render-transpiler
description: Deterministic transpiler that converts ui-manifest.json component trees into lightweight runtime JSON-render specs natively prioritizing the 36 pre-built components from @json-render/shadcn.
---

# Skill: JSON-Render Transpiler

## ℹ️ Objective
Converts a validated UI Manifest directly into the flat spec tree consumed by `<Renderer spec={spec} />`, strictly prioritizing the **36 pre-built components from `@json-render/shadcn`** out of the box. Custom registry keys are generated only to merge custom business components or composite visualizations (e.g., tailored metrics, advanced composite charts) that extend beyond the standard presets.

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

Transform the UI Manifest's `root_element` tree directly into a flat elements spec tree matching the structure consumed by `<Renderer spec={spec} />` as defined by `@json-render/react`'s official schema.

### Flat Tree Structure
```jsonc
{
  "root": "semester-list-page",
  "elements": {
    "semester-list-page": {
      "type": "Card", // Leverages @json-render/shadcn preset key directly
      "props": {
        "id": "semester-list-page",
        "label": "Semester List",
        "variant": "default"
      },
      "children": ["semester-input", "submit-btn"]
    },
    "semester-input": {
      "type": "Input",
      "props": {
        "id": "semester-input",
        "placeholder": "Enter Semester Name",
        "value": { "$bindState": "/form/semesterName" }
      },
      "children": []
    },
    "submit-btn": {
      "type": "Button",
      "props": {
        "id": "submit-btn",
        "label": "Submit",
        "variant": "default"
      },
      "on": {
        "press": [
          { "action": "setState", "params": { "path": "/activeTab", "value": "classes" } }
        ]
      },
      "children": []
    }
  }
}
```

### Transpilation Rules
- **Flat Elements Tree**: Do NOT output recursive layouts. Instead, flatten the hierarchy into an `elements` dictionary mapping each element's unique `id` to its representation: `{ type: string, props: Record<string, any>, children: string[], visible?: any, on?: Record<string, any[]> }`. The `root` key must point to the unique `id` of the root element.
- **Component Types**: Resolve `abstract_type` keys using the Canonical Mapping Table directly to the string component name (e.g., `"Button"`, `"Card"`, `"Select"`).
- **Children Array**: Instead of nesting child objects, the `children` key in each element must be a flat array of string IDs referencing child nodes in the `elements` dictionary. If a node has no children, provide an empty array `[]` or omit it.
- **Tailwind Scoping Integration**: Since `@json-render/shadcn` is styling-agnostic and relies on host Tailwind CSS compiling styles, the host application's `index.css` must configure scanning using the `@source` directive:
  ```css
  @import "tailwindcss";
  @source "../node_modules/@json-render/shadcn/dist/**/*.js";
  ```
  No other custom CSS compilation or class injections are needed.
- **Two-Way Binding with `useBoundProp`**: State-bound fields utilize standard `{ "$bindState": "/path" }` or `{ "$bindItem": "field" }` expressions. Implementations of standard input components consume these bindings using `@json-render/react`'s native hook: `const [value, setValue] = useBoundProp<string>(props.value, bindings?.value)`. Do not re-implement or wrap inputs with manual state hooks.
- **Declarative Values & Dynamic State**: Standard components (like `DataTable`, `Select`, `Input`) are strictly declarative presenter components. They handle state, selections, and validation natively and declaratively using UI Schema bindings (e.g., matching a field component's `props.name` or `props.value` to state paths). Do NOT write custom code-based API-hook integrations or custom state handlers inside standard component wrappers in `component-registry.ts`.
- **Built-in Actions**: Standard interaction behaviors (e.g., resetting form, triggering a state update) utilize the built-in actions (`setState`, `pushState`, `removeState`, `validateForm`) natively handled by `@json-render/react`'s state/action provider context, declared directly in the UI Schema.
- **Component Signatures & Adaptation**: The `<Renderer />` calls the components in the registry with a standard `ComponentRenderProps` signature: `{ element, children, emit, on, bindings, loading }` (where the actual properties are under `element.props`). Presenter components from `@json-render/shadcn` expect the standard implementation signature `BaseComponentProps` (`{ props, children, emit, on, bindings, loading }`). Thus, standard presenters in the registry must either be passed through `@json-render/react`'s official `defineRegistry` or adapted (e.g., matching `props = element.props`) to ensure runtime property access is successful.
- **Strip Schema Validation Properties**: Strip out schema validation properties (`ui_id`, `domain_module`) from the element node payload.

---

## 🛠️ Component Registry Spec

File: `src/json-render/component-registry.ts`

Provide a unified mapping dictionary that directly imports the base presets from `@json-render/shadcn` and merges any custom composite components required by the project.

```typescript
// AUTO-GENERATED by Frontend Engineer workflow — DO NOT EDIT MANUALLY
import { shadcnComponents } from '@json-render/shadcn';
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
  ...shadcnComponents,

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
