type VercelOrigins = {
  deploymentUrl?: string | undefined;
  branchUrl?: string | undefined;
  productionUrl?: string | undefined;
};

function normalizeOrigin(value?: string) {
  if (!value) return null;

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

export function buildAuthTrustedOrigins(
  applicationUrl: string,
  vercel: VercelOrigins = {}
) {
  const origins = [
    normalizeOrigin(applicationUrl),
    normalizeOrigin(vercel.deploymentUrl),
    normalizeOrigin(vercel.branchUrl),
    normalizeOrigin(vercel.productionUrl)
  ].filter((origin): origin is string => Boolean(origin));

  return [...new Set(origins)];
}
