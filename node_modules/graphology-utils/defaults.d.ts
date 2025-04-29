export default function resolveDefaults<T extends {[key: string]: any}>(
  target: T | undefined | null,
  defaults: T
): T;
