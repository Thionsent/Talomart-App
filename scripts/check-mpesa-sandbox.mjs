async function checkSandbox() {
  const required = [
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_SHORTCODE",
    "MPESA_PASSKEY",
    "MPESA_CALLBACK_URL"
  ];

  if (process.env.MPESA_ENVIRONMENT !== "sandbox") {
    throw new Error("MPESA_ENVIRONMENT must be sandbox for this check.");
  }

  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    throw new Error(`Missing sandbox settings: ${missing.join(", ")}`);
  }

  const callbackUrl = new URL(process.env.MPESA_CALLBACK_URL);
  if (
    callbackUrl.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "::1"].includes(callbackUrl.hostname)
  ) {
    throw new Error("MPESA_CALLBACK_URL must be a public HTTPS URL.");
  }

  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: { Authorization: `Basic ${credentials}` },
      signal: AbortSignal.timeout(15_000)
    }
  );

  if (!response.ok) {
    throw new Error(
      `Daraja sandbox authentication failed with HTTP ${response.status}.`
    );
  }

  const result = await response.json();
  if (typeof result.access_token !== "string" || !result.access_token) {
    throw new Error("Daraja returned an invalid access-token response.");
  }

  console.log("Daraja sandbox credentials authenticated successfully.");
  console.log(`Callback host: ${callbackUrl.host}`);
  console.log("No access token or credential value was printed.");
}

try {
  await checkSandbox();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`M-Pesa sandbox check failed: ${message}`);
  process.exitCode = 1;
}
