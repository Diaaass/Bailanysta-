"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const DEFAULT_POLL_INTERVAL_MS = 20_000;

type UpdatesValue = {
  unread: number;
  newPosts: number;
  /** The feed reports the timestamp of the newest post it is showing. */
  setSince: (iso: string | null) => void;
  /** Called after the feed pulls the new posts in. */
  clearNewPosts: () => void;
  setUnread: (n: number) => void;
};

const UpdatesContext = createContext<UpdatesValue | null>(null);

export function useUpdates() {
  const value = useContext(UpdatesContext);
  if (!value) {
    throw new Error("useUpdates must be used inside UpdatesProvider");
  }
  return value;
}

export function UpdatesProvider({
  initialUnread,
  // Injected by the server so the end-to-end suite can poll faster than a
  // person would ever notice, exercising the real code path instead of a stub.
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  children,
}: {
  initialUnread: number;
  pollIntervalMs?: number;
  children: ReactNode;
}) {
  const [unread, setUnread] = useState(initialUnread);
  const [newPosts, setNewPosts] = useState(0);

  // Kept in refs rather than state: the polling effect must not restart every
  // time the feed reports a new timestamp.
  const sinceRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  // Bumped whenever `since` moves. A reply computed against an older value is
  // stale by definition and would otherwise re-raise the badge for posts the
  // reader has just pulled in.
  const sinceVersionRef = useRef(0);

  const poll = useCallback(async () => {
    if (inFlightRef.current || document.visibilityState !== "visible") return;
    inFlightRef.current = true;

    const version = sinceVersionRef.current;

    try {
      const params = new URLSearchParams();
      if (sinceRef.current) params.set("since", sinceRef.current);

      const res = await fetch(`/api/updates?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = await res.json();
      setUnread(data.unread);
      if (version === sinceVersionRef.current) {
        setNewPosts(data.newPosts);
      }
    } catch {
      // A failed poll is not worth surfacing: the next one is one interval away.
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(poll, pollIntervalMs);

    // A hidden tab polls nothing; coming back checks immediately instead of
    // waiting out the remainder of the interval.
    function onVisibility() {
      if (document.visibilityState === "visible") void poll();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll, pollIntervalMs]);

  const setSince = useCallback((iso: string | null) => {
    if (sinceRef.current === iso) return;
    sinceRef.current = iso;
    sinceVersionRef.current += 1;
  }, []);

  const clearNewPosts = useCallback(() => setNewPosts(0), []);

  return (
    <UpdatesContext.Provider
      value={{ unread, newPosts, setSince, clearNewPosts, setUnread }}
    >
      {children}
    </UpdatesContext.Provider>
  );
}
