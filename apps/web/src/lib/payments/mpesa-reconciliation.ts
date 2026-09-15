type CallbackMetadataItem = {
  Name: string;
  Value?: string | number | undefined;
};

export type MpesaStkCallback = {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?:
    | {
        Item: CallbackMetadataItem[];
      }
    | undefined;
};

export function mpesaCallbackMetadataValue(
  callback: MpesaStkCallback,
  name: string
) {
  return callback.CallbackMetadata?.Item.find((item) => item.Name === name)
    ?.Value;
}

export function getMpesaFallbackMatch(callback: MpesaStkCallback) {
  if (callback.ResultCode !== 0) return null;

  const amount = Number(mpesaCallbackMetadataValue(callback, "Amount"));
  const phone = String(
    mpesaCallbackMetadataValue(callback, "PhoneNumber") ?? ""
  ).replace(/\D/g, "");

  if (!Number.isFinite(amount) || amount <= 0 || phone.length < 9) return null;

  return {
    amountMinor: Math.round(amount * 100),
    phoneSuffix: phone.slice(-9)
  };
}

export function hasUnambiguousMpesaCandidate<T>(candidates: T[]): T | null {
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

export async function retryMpesaPersistence<T>(
  operation: (attempt: number) => Promise<T>,
  {
    attempts = 3,
    delay = (milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
  }: {
    attempts?: number;
    delay?: (milliseconds: number) => Promise<void>;
  } = {}
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(attempt * 100);
    }
  }

  throw lastError;
}
