export function serializeDatabaseJson(value: unknown) {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    throw new TypeError("Database JSON values must be JSON-serializable.");
  }

  return serialized;
}
