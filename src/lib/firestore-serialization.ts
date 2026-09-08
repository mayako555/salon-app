type MillisecondTimestamp = {
  toMillis: () => number;
};

function isMillisecondTimestamp(value: unknown): value is MillisecondTimestamp {
  return Boolean(
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as MillisecondTimestamp).toMillis === "function"
  );
}

export function serializeFirestoreRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (isMillisecondTimestamp(value)) return [key, value.toMillis()];
      if (value instanceof Date) return [key, value.getTime()];
      return [key, value];
    })
  );
}
