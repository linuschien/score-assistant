#!/usr/bin/env node
// validate-render-schema.mjs
// Usage: node .agents/skills/json-render-transpiler/scripts/validate-render-schema.mjs \
//              <schema-file.json> [frontend-dir]
//
// Validates every element in a *.render-schema.json against the Zod schemas
// exported by shadcnComponentDefinitions. Reports pass/fail per element.
//
// Exit code 0 = all pass, 1 = validation errors found.

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const [,, schemaFile, frontendDir = 'engineers/03-implementations/frontend'] = process.argv;

if (!schemaFile) {
  console.error('Usage: node validate-render-schema.mjs <schema-file.json> [frontend-dir]');
  process.exit(1);
}

// Load the render schema
const schemaPath = resolve(process.cwd(), schemaFile);
let renderSchema;
try {
  renderSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
} catch (e) {
  console.error(`❌ Cannot read schema file: ${schemaPath}\n${e.message}`);
  process.exit(1);
}

// Load shadcnComponentDefinitions from the frontend node_modules
const catalogPath = resolve(
  process.cwd(),
  frontendDir,
  'node_modules/@json-render/shadcn/dist/catalog.mjs'
);

let shadcnComponentDefinitions;
try {
  const mod = await import(pathToFileURL(catalogPath).href);
  shadcnComponentDefinitions = mod.shadcnComponentDefinitions;
} catch (e) {
  console.error(`❌ Cannot load @json-render/shadcn catalog from: ${catalogPath}\n${e.message}`);
  process.exit(1);
}

const availableKeys = new Set(Object.keys(shadcnComponentDefinitions));

console.log('========================================================');
console.log(`  Validating: ${schemaFile}`);
console.log('========================================================\n');

const elements = renderSchema.elements ?? {};
let totalChecked = 0;
let totalErrors = 0;

for (const [elementId, element] of Object.entries(elements)) {
  const componentKey = element.type;

  // Only validate components that are in @json-render/shadcn
  if (!availableKeys.has(componentKey)) {
    console.log(`⏭️  SKIP  [${elementId}] type="${componentKey}" — custom component, no Zod schema`);
    continue;
  }

  totalChecked++;
  const definition = shadcnComponentDefinitions[componentKey];
  const zodSchema = definition?.props;

  if (!zodSchema) {
    console.log(`⚠️  WARN  [${elementId}] type="${componentKey}" — no props schema in catalog`);
    continue;
  }

  // Pre-process: replace $bindState/$bindItem runtime expressions with null
  // to avoid false-positive Zod failures on bound fields.
  const normalizedProps = Object.fromEntries(
    Object.entries(element.props ?? {}).map(([k, v]) => {
      if (v !== null && typeof v === 'object' && ('$bindState' in v || '$bindItem' in v)) {
        return [k, null];
      }
      return [k, v];
    })
  );

  const result = zodSchema.safeParse(normalizedProps);

  if (result.success) {
    console.log(`✅ PASS  [${elementId}] type="${componentKey}"`);
  } else {
    totalErrors++;
    console.log(`❌ FAIL  [${elementId}] type="${componentKey}"`);
    for (const issue of result.error.issues) {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      console.log(`         • ${path}: ${issue.message}`);
    }
  }
}

console.log('\n========================================================');
console.log(`  Results: ${totalChecked} validated, ${totalErrors} failed`);
console.log('========================================================');

if (totalErrors > 0) {
  console.log('\n⛔ Validation FAILED — fix errors above before committing.');
  process.exit(1);
} else {
  console.log('\n🎉 All elements passed Zod validation.');
  process.exit(0);
}
