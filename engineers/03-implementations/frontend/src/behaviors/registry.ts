import { createStateStore } from '@json-render/react';

export type BehaviorHandler = (
  ref: string,
  store: ReturnType<typeof createStateStore>
) => Promise<string | null>;

const registry: Record<string, BehaviorHandler> = {};

/**
 * Register a specific behavior action handler
 */
export function registerBehavior(ref: string, handler: BehaviorHandler) {
  registry[ref] = handler;
}

/**
 * Execute the registered behavior handler for a given ref
 */
export async function executeRegisteredBehavior(
  ref: string,
  store: ReturnType<typeof createStateStore>
): Promise<string | null> {
  const handler = registry[ref];
  if (handler) {
    return handler(ref, store);
  }
  return null;
}
