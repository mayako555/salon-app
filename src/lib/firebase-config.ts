export function requireFirebaseEnv(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing required Firebase environment variable: ${name}`);
  }

  return value;
}
