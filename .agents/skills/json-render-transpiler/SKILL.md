---
name: json-render-transpiler
description: Deterministic transpiler that converts ui-manifest.json component trees into lightweight runtime JSON-render specs natively prioritizing the verified components from @json-render/shadcn.
---

# Skill: JSON-Render Transpiler

## ℹ️ Objective
Converts a validated UI Manifest directly into the flat spec tree consumed by `<Renderer spec={spec} />`, strictly prioritizing components verified to exist in **`@json-render/shadcn`**. Custom registry keys are generated only for composite business components (e.g., `DataTable`, charts) that are genuinely absent from the preset library.

---

## 🔍 Step 0 — Verify the Actual Component Catalog FIRST

**Before resolving any component key**, you MUST confirm what `@json-render/shadcn` actually exports by reading the package type definitions. Do NOT assume — always verify.

Run the following to get the authoritative list of available components:

```bash
# 1. All exported component implementations (shadcnComponents keys):
grep -n "^    [A-Z]" node_modules/@json-render/shadcn/dist/index.d.ts

# 2. All Zod-validated prop schemas (shadcnComponentDefinitions keys):
grep -n "^    [A-Z]" node_modules/@json-render/shadcn/dist/catalog.d.ts

# 3. Specific component's prop shape (example: Input):
sed -n '/^    Input:/,/^    [A-Z]/p' node_modules/@json-render/shadcn/dist/catalog.d.ts | head -40

# 4. Specific component's prop shape (example: Dialog):
sed -n '/^    Dialog:/,/^    [A-Z]/p' node_modules/@json-render/shadcn/dist/catalog.d.ts | head -40
```

> **CRITICAL**: If a component name does NOT appear in both `index.d.ts` (runtime) and `catalog.d.ts` (schema), it is NOT available in `@json-render/shadcn`. You MUST NOT map any UI Manifest element to it. Use the custom registry fallback instead.

### ✅ Verified `@json-render/shadcn` Component List (as of v0.19.x)

The following are the **only** components confirmed available in `shadcnComponents` and `shadcnComponentDefinitions`. This list must be re-verified if the package version changes.

| Category | Available Components |
|----------|---------------------|
| Layout | `Card`, `Stack`, `Grid`, `Separator` |
| Navigation | `Tabs`, `Accordion`, `Collapsible`, `Pagination` |
| Overlay | `Dialog`, `Drawer`, `Tooltip`, `Popover` |
| Display | `Carousel`, `Table`, `Heading`, `Text`, `Image`, `Avatar`, `Badge`, `Alert`, `Progress`, `Skeleton`, `Spinner` |
| Form | `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Slider` |
| Action | `Button`, `Link`, `DropdownMenu`, `Toggle`, `ToggleGroup`, `ButtonGroup` |

> ⚠️ **NOT available in `@json-render/shadcn`**: `Breadcrumb`, `AlertDialog`, `Sonner/Toast`, `MultiSelect`, `DatePicker`, `CommandPalette`. These exist in raw shadcn/ui but are **not wrapped** in this package. They require custom implementations in the component registry.

---

## 🗺️ Canonical Mapping Table

Resolve each `abstract_type` + `semantic_variant` to a component key. Always prefer a verified `@json-render/shadcn` preset. Only fall back to `Custom` when the preset genuinely cannot express the semantic.

| abstract_type | semantic_variant | Resolved Key | Source |
|---|---|---|---|
| `Container` | `page` | `"Container:page"` | Custom layout shell |
| `Container` | `card` | `"Card"` | ✅ `@json-render/shadcn` |
| `Container` | `panel` | `"Card"` | ✅ `@json-render/shadcn` |
| `Container` | *(default)* | `"div"` | Native HTML |
| `Section` | `form-section` | `"Card"` | ✅ `@json-render/shadcn` |
| `Section` | `summary-section` | `"div"` | Native HTML — header row with title + action button |
| `Section` | *(default)* | `"div"` | Native HTML |
| `Stack` | `horizontal` | `"Stack"` | ✅ `@json-render/shadcn` — `direction: "horizontal"` |
| `Stack` | `vertical` / *(default)* | `"Stack"` | ✅ `@json-render/shadcn` — `direction: "vertical"` |
| `Grid` | *(any)* | `"Grid"` | ✅ `@json-render/shadcn` |
| `Breadcrumb` | *(any)* | `"Breadcrumb"` | ⚙️ Custom — NOT in `@json-render/shadcn` |
| `Heading` | *(any)* | `"Heading"` | ✅ `@json-render/shadcn` — props: `text` (string), `level` (`h1`\|`h2`\|`h3`\|`h4`\|null) |
| `Text` | *(any)* | `"Text"` | ✅ `@json-render/shadcn` |
| `Metric` | *(any)* | `"MetricCard"` | ⚙️ Custom composite |
| `Chart` | `bar` | `"Chart:bar"` | ⚙️ Custom Recharts wrapper |
| `Chart` | `line` | `"Chart:line"` | ⚙️ Custom Recharts wrapper |
| `Chart` | `pie` | `"Chart:pie"` | ⚙️ Custom Recharts wrapper |
| `Table` | `data-table` | `"DataTable"` | ⚙️ Custom composite (columns/data/row-actions) |
| `Table` | `summary-table` | `"Table"` | ✅ `@json-render/shadcn` |
| `Table` | *(default)* | `"Table"` | ✅ `@json-render/shadcn` |
| `Field` | `text` / `email` / `password` / `number` | `"Input"` | ✅ `@json-render/shadcn` — type enum: `text\|email\|password\|number` only |
| `Field` | `date` | `"DatePicker"` | ⚙️ Custom — NOT in `@json-render/shadcn`; Input type=date is NOT supported by catalog |
| `Field` | `textarea` | `"Textarea"` | ✅ `@json-render/shadcn` |
| `Selection` | `dropdown` | `"Select"` | ✅ `@json-render/shadcn` |
| `Selection` | `radio` | `"Radio"` | ✅ `@json-render/shadcn` |
| `Selection` | `checkbox` | `"Checkbox"` | ✅ `@json-render/shadcn` |
| `Selection` | `multi-select` | `"MultiSelect"` | ⚙️ Custom — NOT in `@json-render/shadcn` |
| `Selection` | *(default)* | `"Select"` | ✅ `@json-render/shadcn` |
| `Switch` | *(any)* | `"Switch"` | ✅ `@json-render/shadcn` |
| `Trigger` | *(any)* | `"Button"` | ✅ `@json-render/shadcn` — variant: `primary\|danger\|secondary\|null` |
| `Overlay` | `modal` | `"Dialog"` | ✅ `@json-render/shadcn` — props: `title`, `description\|null`, `openPath` |
| `Overlay` | `drawer` | `"Drawer"` | ✅ `@json-render/shadcn` |
| `Overlay` | `tooltip` | `"Tooltip"` | ✅ `@json-render/shadcn` |
| `Overlay` | `confirm-dialog` | `"AlertDialog"` | ⚙️ Custom — NOT in `@json-render/shadcn` |
| `Overlay` | *(default)* | `"Dialog"` | ✅ `@json-render/shadcn` |
| `Notification` | `toast` | `"Toaster"` | ⚙️ Custom — requires `sonner` install |
| `Badge` | *(any)* | `"Badge"` | ✅ `@json-render/shadcn` |
| `Alert` | *(any)* | `"Alert"` | ✅ `@json-render/shadcn` |
| `Progress` | *(any)* | `"Progress"` | ✅ `@json-render/shadcn` |
| `Tabs` | *(any)* | `"Tabs"` | ✅ `@json-render/shadcn` |
| `Accordion` | *(any)* | `"Accordion"` | ✅ `@json-render/shadcn` |
| `Pagination` | *(any)* | `"Pagination"` | ✅ `@json-render/shadcn` |
| `Dropdown` | *(any)* | `"DropdownMenu"` | ✅ `@json-render/shadcn` |
| `Avatar` | *(any)* | `"Avatar"` | ✅ `@json-render/shadcn` |
| `Skeleton` | *(any)* | `"Skeleton"` | ✅ `@json-render/shadcn` |

> **Fallback Rule**: Any `abstract_type` not covered above → log a warning and fall back to `"div"` or `"Card"`.

---

## 🛠️ JSON-Render Spec Format

Transform the UI Manifest's `root_element` tree directly into a flat spec tree matching the structure consumed by `<Renderer spec={spec} />`.

### Flat Tree Structure
```jsonc
{
  "root": "semester-list-page",
  "elements": {
    "semester-list-page": {
      "type": "Container:page",
      "props": { "id": "semester-list-page" },
      "children": ["semester-form-modal", "semester-table"]
    },
    "semester-table": {
      "type": "DataTable",
      "props": {
        "id": "semester-table",
        "label": "學期資料表",
        "columns": [{ "field": "name", "label": "學期名稱" }],
        "data": { "$bindState": "/data/listSemesters" }
      },
      "children": ["edit-trigger", "delete-trigger"]
    },
    "semester-form-modal": {
      "type": "Dialog",
      "props": {
        "id": "semester-form-modal",
        "title": "建立 / 編輯學期",
        "description": null,
        "openPath": "/modals/semester-form-modal"
      },
      "children": ["name-field", "submit-btn"],
      "visible": { "$state": "/modals/semester-form-modal" }
    },
    "name-field": {
      "type": "Input",
      "props": {
        "id": "name-field",
        "label": "學期名稱",
        "name": "name-field",
        "type": "text",
        "placeholder": null,
        "value": { "$bindState": "/form/name-field" },
        "checks": null,
        "validateOn": null
      },
      "children": []
    },
    "submit-btn": {
      "type": "Button",
      "props": {
        "id": "submit-btn",
        "label": "儲存",
        "variant": "primary",
        "disabled": null
      },
      "on": {
        "press": [
          { "action": "executeBehavior", "params": { "ref": "CreateSemester", "id": "submit-btn" } }
        ]
      },
      "children": []
    }
  }
}
```

### Transpilation Rules

- **Flat Elements Tree**: Flatten the hierarchy into an `elements` dictionary. The `root` key points to the root element's `id`.
- **Component Types**: Resolve using the Canonical Mapping Table.  Always verify the resolved key actually exists in `@json-render/shadcn` before outputting it.
- **Children Array**: Flat array of string IDs referencing sibling nodes. Empty nodes get `"children": []`.
- **Zod Prop Compliance**: For each element using a `@json-render/shadcn` component, ALL props MUST pass the Zod schema in `catalog.d.ts`. Non-optional nullable fields (e.g., `Dialog.description`, `Input.checks`, `Input.validateOn`, `Button.disabled`) MUST be explicitly `null`, never `undefined` or omitted.
- **Button Variants**: The `Button` catalog accepts `"primary" | "danger" | "secondary" | null`. Do NOT map to Shadcn's internal `"default"` or `"destructive"` — those are internal implementation details of the component. Use the catalog-defined values.
- **Declarative Bindings**: State-bound fields use `{ "$bindState": "/path" }` or `{ "$bindItem": "field" }`. Do not implement manual state hooks.
- **Submit Actions**: Every submit/confirm button MUST have a `"on": { "press": [{ "action": "executeBehavior", "params": { "ref": "...", "id": "..." } }] }` handler. Omitting `on` from action buttons is a transpilation error.
- **Tailwind Scoping**: The host `index.css` must scan the package dist:
  ```css
  @import "tailwindcss";
  @source "../node_modules/@json-render/shadcn/dist/**/*.js";
  ```
- **Strip Internal Fields**: Strip `ui_id`, `domain_module` from output.
- **Zod Verification Phase (DoD)**: After generating any `*.render-schema.json`, run the Zod validators from `shadcnComponentDefinitions` against every element using a `@json-render/shadcn` preset. Any validation failure = transpilation failure.

---

## 🛠️ Component Registry Spec

File: `src/json-render/component-registry.tsx`

### Architecture: Adapter Pattern (REQUIRED)

`@json-render/react`'s `<Renderer />` calls components with `ComponentRenderProps`:
```ts
{ element: { type, props, ... }, children, emit, on, bindings, loading }
```

`@json-render/shadcn` components expect `BaseComponentProps`:
```ts
{ props, children, emit, on, bindings, loading }
```

**These signatures are incompatible.** The `adapt()` function bridges this gap. `...shadcnComponents` spread directly into the registry is WRONG — it will receive `element` instead of `props` and silently fail.

```typescript
// AUTO-GENERATED by Frontend Engineer workflow — DO NOT EDIT MANUALLY
import React from 'react';
import { shadcnComponents } from '@json-render/shadcn';
import { useStateStore } from '@json-render/react';
import type { ComponentType } from 'react';

// ── Adapter: ComponentRenderProps → BaseComponentProps ──────────────────────
function adapt(Comp: ComponentType<any>): ComponentType<any> {
  const Adapted: ComponentType<any> = ({ element, children, emit, on, bindings, loading }: any) => {
    let store: any;
    try { store = useStateStore(); } catch { store = null; }

    // Intercept button press to auto-close modals and trigger toasts
    const customEmit = (eventName: string, ...args: any[]) => {
      if (eventName === 'press' && store) {
        const id = element?.props?.id ?? '';
        const label = element?.props?.label ?? '';
        const isClosingAction =
          label === '取消' || label === '儲存' || label === '確認刪除' ||
          id.includes('cancel') || id.includes('submit') || id.includes('confirm');
        if (isClosingAction) {
          const modals = store.get('/modals') || {};
          store.set('/modals', Object.fromEntries(Object.keys(modals).map(k => [k, false])));
        }
      }
      if (emit) emit(eventName, ...args);
    };

    return React.createElement(Comp, {
      props: element?.props ?? {},
      children,
      emit: customEmit,
      on,
      bindings,
      loading,
    });
  };
  Adapted.displayName = `Adapted(${(Comp as any).displayName || Comp.name || 'Component'})`;
  return Adapted;
}

// ── Custom Components (using ComponentRenderProps directly) ─────────────────
// Only implement custom components for capabilities NOT available in @json-render/shadcn:
// - DataTable: columns/data/row-action-children composite
// - Breadcrumb: NOT in @json-render/shadcn, implement with <nav><ol>
// - AlertDialog: NOT in @json-render/shadcn, implement with fixed overlay
// - MetricCard: NOT in @json-render/shadcn, custom KPI card
// - Chart:bar/line/pie: NOT in @json-render/shadcn, Recharts wrappers

export const componentRegistry: Record<string, ComponentType<any>> = {
  // ── 1. All @json-render/shadcn presets, adapted ─────────────────────────
  ...Object.fromEntries(
    Object.entries(shadcnComponents).map(([key, Comp]) => [key, adapt(Comp as ComponentType<any>)])
  ),

  // ── 2. Custom layout shell ───────────────────────────────────────────────
  'Container:page': ({ children }) => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">{children}</div>
  ),

  // ── 3. Custom composites (not available in @json-render/shadcn) ──────────
  'DataTable':   DataTable,    // columns/data/row-actions
  'Breadcrumb':  Breadcrumb,   // <nav><ol> wrapper
  'AlertDialog': AlertDialog,  // confirm dialog overlay
  'MetricCard':  MetricCard,   // KPI metric card

  // ── 4. Chart wrappers ────────────────────────────────────────────────────
  'Chart:bar':  ChartPlaceholder('Bar'),
  'Chart:line': ChartPlaceholder('Line'),
  'Chart:pie':  ChartPlaceholder('Pie'),

  // ── 5. Native HTML passthrough ───────────────────────────────────────────
  'div': ({ element, children }) => (
    <div className={element?.props?.className}>{children}</div>
  ),
};
```

> **Additive Rule**: When updating an existing registry, ONLY append new keys. Never remove existing custom keys — removing breaks already-deployed screen layouts.

---

## ⚠️ Output Requirements

- **Format**: Pure JSON (render spec) + pure TypeScript (registry). Zero custom layout engines.
- **Catalog Verification**: Every `@json-render/shadcn` component key used MUST be verified against `index.d.ts` and `catalog.d.ts` before output.
- **Native Alignment**: Maximize reuse of `@json-render/shadcn` presets. Only create custom components for capabilities genuinely absent from the preset library.
- **Submit Completeness**: Every Button with a mutating intent (save, delete, confirm) MUST have an `on.press` handler. Missing `on` = transpilation error.
- **Idempotency**: Identical manifest structures MUST yield structurally identical JSON output.
- **Zod Compliance**: All emitted JSON schema properties MUST pass the Zod validators from `shadcnComponentDefinitions`. Any validation error = Definition of Done failure.
