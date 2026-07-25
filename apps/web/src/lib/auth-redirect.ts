const blockedCustomerDestinations = [
  "/admin",
  "/api",
  "/sign-in",
  "/sign-up"
];

export function safeCustomerDestination(
  value: string | null | undefined,
  fallback = "/account"
) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return fallback;
  }

  try {
    const destination = new URL(value, "https://talomart.local");
    const isBlocked = blockedCustomerDestinations.some(
      (path) =>
        destination.pathname === path || destination.pathname.startsWith(`${path}/`)
    );

    if (destination.origin !== "https://talomart.local" || isBlocked) {
      return fallback;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

export function customerAuthHref(path: "/sign-in" | "/sign-up", destination: string) {
  const params = new URLSearchParams({
    next: safeCustomerDestination(destination)
  });

  return `${path}?${params.toString()}`;
}
