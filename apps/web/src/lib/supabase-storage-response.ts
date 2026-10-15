export function isExistingBucketResponse(status: number, message: string) {
  let storageError: { statusCode?: string | number; code?: string } | null = null;

  try {
    storageError = JSON.parse(message) as {
      statusCode?: string | number;
      code?: string;
    };
  } catch {
    // A non-JSON response can still use the standard HTTP 409 status.
  }

  return (
    status === 409 ||
    String(storageError?.statusCode ?? "") === "409" ||
    storageError?.code === "BucketAlreadyExists"
  );
}
