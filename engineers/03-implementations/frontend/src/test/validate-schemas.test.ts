import { describe, it, expect } from 'vitest';
import { shadcnComponentDefinitions } from '@json-render/shadcn';
import fs from 'fs';
import path from 'path';

// Runtime binding expression markers used by @json-render/react.
// These objects are resolved at runtime to their actual values; Zod validates
// the resolved type (e.g., string|null), NOT the raw expression object.
// For static validation we substitute null, which is always a valid resolved value
// for any ZodNullable field.
function resolveBindings(props: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      ('$bindState' in value || '$bindItem' in value || '$computed' in value)
    ) {
      // Replace runtime binding with null (always a valid resolved value for nullable fields)
      resolved[key] = null;
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

describe('Static Zod Schema Validation', () => {
  const schemasDir = path.resolve(__dirname, '../schemas');
  const files = fs.readdirSync(schemasDir).filter(file => file.endsWith('.render-schema.json'));

  files.forEach(file => {
    it(`validates ${file} against shadcn Zod schemas`, () => {
      const filePath = path.join(schemasDir, file);
      const schemaContent = fs.readFileSync(filePath, 'utf-8');
      const spec = JSON.parse(schemaContent);

      expect(spec).toHaveProperty('root');
      expect(spec).toHaveProperty('elements');

      const elements = spec.elements;
      const errors: string[] = [];

      for (const [id, element] of Object.entries<any>(elements)) {
        const type = element.type;
        const rawProps = element.props || {};

        // Only validate elements that map to a standard shadcn component
        if (type in shadcnComponentDefinitions) {
          const definition = (shadcnComponentDefinitions as any)[type];
          // Resolve runtime binding expressions to null before Zod validation
          const resolvedProps = resolveBindings(rawProps);
          const result = definition.props.safeParse(resolvedProps);

          if (!result.success) {
            const formattedErrors = result.error.issues
              .map(
                (issue: any) =>
                  `  - Prop "${issue.path.join('.')}" (${issue.code}): ${issue.message}`
              )
              .join('\n');
            errors.push(`Element "${id}" (${type}):\n${formattedErrors}`);
          }
        }
      }

      if (errors.length > 0) {
        throw new Error(
          `Schema validation failed for ${file} with ${errors.length} errors:\n\n${errors.join('\n\n')}`
        );
      }
    });
  });
});
