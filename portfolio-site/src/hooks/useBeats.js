import { useState, useEffect } from "react";
import { fetchBeats }   from "../lib/api";
import sampleBeats      from "../data/sampleBeats";

export function useBeats() {
  const [beats,   setBeats]   = useState(sampleBeats);
  const [loading, setLoading] = useState(true);
  const [isLive,  setIsLive]  = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const data = await fetchBeats({ signal: ctrl.signal });
        if (Array.isArray(data) && data.length > 0) {
          setBeats(data);
          setIsLive(true);
        }
      } catch (_) {
        // silent fallback to sampleBeats
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  return { beats, loading, isLive };
}
