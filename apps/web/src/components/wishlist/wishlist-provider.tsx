"use client";

import { AlertCircle, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  MAX_WISHLIST_ITEMS,
  normalizeWishlistIds,
  readWishlistIds,
  toggleWishlistId,
  WISHLIST_EVENT,
  WISHLIST_KEY,
  writeWishlistIds
} from "@/lib/wishlist-storage";

type WishlistContextValue = {
  authenticated: boolean;
  ids: ReadonlySet<string>;
  count: number;
  ready: boolean;
  pendingIds: ReadonlySet<string>;
  error: string | null;
  isSaved: (productId: string) => boolean;
  toggle: (productId: string) => Promise<boolean>;
  clear: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const WISHLIST_REQUEST_TIMEOUT_MS = 6000;

function isDatabaseProductId(productId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    productId
  );
}

async function wishlistFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    WISHLIST_REQUEST_TIMEOUT_MS
  );

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export function WishlistProvider({
  authenticated,
  children
}: {
  authenticated: boolean;
  children: ReactNode;
}) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const idsRef = useRef<Set<string>>(new Set());

  const commit = useCallback((productIds: Iterable<string>) => {
    const normalized = writeWishlistIds(productIds);
    const next = new Set(normalized);
    idsRef.current = next;
    setIds(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const localIds = readWishlistIds();
    idsRef.current = new Set(localIds);
    setIds(new Set(localIds));
    setError(null);
    // Local saving must never wait for the account database. Account sync is a
    // background enhancement, so every heart button becomes usable immediately.
    setReady(true);

    function receiveWishlistChange(event: Event) {
      const eventIds = normalizeWishlistIds(
        (event as CustomEvent<unknown>).detail ?? readWishlistIds()
      );
      idsRef.current = new Set(eventIds);
      setIds(new Set(eventIds));
    }

    function receiveStorageChange(event: StorageEvent) {
      if (event.key !== WISHLIST_KEY) return;
      const nextIds = readWishlistIds();
      idsRef.current = new Set(nextIds);
      setIds(new Set(nextIds));
    }

    window.addEventListener(WISHLIST_EVENT, receiveWishlistChange);
    window.addEventListener("storage", receiveStorageChange);

    async function synchronizeAccountWishlist() {
      if (!authenticated) return;

      try {
        const response = await wishlistFetch("/api/wishlist", {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });

        if (!response.ok) throw new Error("Wishlist could not be loaded.");

        const payload = (await response.json()) as { productIds?: unknown };
        const remoteIds = normalizeWishlistIds(payload.productIds);
        const mergedIds = normalizeWishlistIds([
          ...idsRef.current,
          ...remoteIds
        ]);

        if (cancelled) return;
        commit(mergedIds);

        const databaseIds = mergedIds
          .filter(isDatabaseProductId)
          .slice(0, MAX_WISHLIST_ITEMS);

        if (databaseIds.some((productId) => !remoteIds.includes(productId))) {
          const syncResponse = await wishlistFetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: databaseIds })
          });

          if (!syncResponse.ok) {
            throw new Error("Some saved products could not be synchronized.");
          }
        }
      } catch {
        if (!cancelled) {
          setError(
            "Your saved products remain on this device, but account synchronization is temporarily unavailable."
          );
        }
      }
    }

    void synchronizeAccountWishlist();

    return () => {
      cancelled = true;
      window.removeEventListener(WISHLIST_EVENT, receiveWishlistChange);
      window.removeEventListener("storage", receiveStorageChange);
    };
  }, [authenticated, commit]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!ready || pendingIds.has(productId)) {
        return idsRef.current.has(productId);
      }

      const previous = new Set(idsRef.current);
      const nextIds = toggleWishlistId(previous, productId);
      const saved = nextIds.includes(productId);
      commit(nextIds);
      setError(null);

      if (!authenticated || !isDatabaseProductId(productId)) return saved;

      setPendingIds((current) => new Set(current).add(productId));

      try {
        const response = await wishlistFetch("/api/wishlist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, saved })
        });

        if (!response.ok) throw new Error("Wishlist update failed.");
      } catch {
        if (idsRef.current.has(productId) === saved) commit(previous);
        setError("We could not update that saved product. Please try again.");
        return !saved;
      } finally {
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(productId);
          return next;
        });
      }

      return saved;
    },
    [authenticated, commit, pendingIds, ready]
  );

  const clear = useCallback(async () => {
    if (!ready) return;

    const previous = new Set(idsRef.current);
    commit([]);
    setError(null);

    if (!authenticated) return;

    try {
      const response = await wishlistFetch("/api/wishlist", {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Wishlist clear failed.");
    } catch {
      commit(previous);
      setError("We could not clear your wishlist. Please try again.");
    }
  }, [authenticated, commit, ready]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      authenticated,
      ids,
      count: ids.size,
      ready,
      pendingIds,
      error,
      isSaved: (productId) => ids.has(productId),
      toggle,
      clear
    }),
    [authenticated, clear, error, ids, pendingIds, ready, toggle]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
      {error && (
        <div className="wishlist-error-toast" role="alert" aria-live="polite">
          <AlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X />
          </button>
        </div>
      )}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider.");
  }

  return context;
}
