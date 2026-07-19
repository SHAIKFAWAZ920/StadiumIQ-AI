import { useState, useEffect } from 'react';
import { onSnapshot, collection, doc } from 'firebase/firestore';
import { firestore } from '../services/firebase';
import { crowdApi, queueApi, transportApi, dashboardApi } from '../services/api';

export function useSimulation() {
  const [crowdZones, setCrowdZones] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [transport, setTransport] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubZones: any = null;
    let unsubTransport: any = null;
    let unsubKPIs: any = null;
    let firestoreSuccessful = false;

    // 1. Attempt Firestore live socket subscriptions
    try {
      unsubZones = onSnapshot(collection(firestore, 'crowd_zones'), (snapshot) => {
        const zones: any[] = [];
        snapshot.forEach((doc) => {
          zones.push({ id: doc.id, ...doc.data() });
        });
        if (zones.length > 0) {
          setCrowdZones(zones);
          firestoreSuccessful = true;
          setLoading(false);
        }
      }, (err) => {
        console.warn("Firestore crowd_zones socket offline:", err.message);
      });

      unsubTransport = onSnapshot(collection(firestore, 'transport'), (snapshot) => {
        const routes: any[] = [];
        snapshot.forEach((doc) => {
          routes.push({ id: doc.id, ...doc.data() });
        });
        if (routes.length > 0) {
          setTransport(routes);
        }
      }, (err) => {
        console.warn("Firestore transport socket offline:", err.message);
      });

      unsubKPIs = onSnapshot(doc(firestore, 'kpis', 'live_telemetry'), (docSnap) => {
        if (docSnap.exists()) {
          setKpis(docSnap.data());
        }
      }, (err) => {
        console.warn("Firestore KPI document offline:", err.message);
      });

    } catch (e: any) {
      console.warn("Firestore initial socket subscription failed:", e);
    }

    // 2. HTTP Polling Fallback (runs in background and catches updates if Firestore fails)
    const fetchHTTPFallback = async () => {
      try {
        const [zonesData, queuesData, transportData, kpisData] = await Promise.all([
          crowdApi.getZones(),
          queueApi.getQueues(),
          transportApi.getAll(),
          dashboardApi.getKPIs()
        ]);

        // Only override state if Firestore real-time listener is inactive
        if (!firestoreSuccessful) {
          setCrowdZones(zonesData);
          setTransport(transportData);
          setKpis(kpisData);
        }
        setQueues(queuesData.queues || []);
        setError(null);
      } catch (err: any) {
        console.error("HTTP Telemetry fetch failed:", err);
        if (!firestoreSuccessful) {
          setError("Failed to sync live stadium telemetry.");
        }
      } finally {
        setLoading(false);
      }
    };

    // Trigger initial fetch and set 5-second backup interval
    fetchHTTPFallback();
    const interval = setInterval(fetchHTTPFallback, 5000);

    return () => {
      if (unsubZones) unsubZones();
      if (unsubTransport) unsubTransport();
      if (unsubKPIs) unsubKPIs();
      clearInterval(interval);
    };
  }, []);

  return {
    crowdZones,
    queues,
    transport,
    kpis,
    loading,
    error,
    refresh: () => {} // Auto-refreshed in real-time
  };
}
