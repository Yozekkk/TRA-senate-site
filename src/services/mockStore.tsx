import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Decision, Meeting } from "../data/mockData";
import { activeDataProvider, type DataMode, type DataSnapshot } from "./dataProvider";
import { useAuth } from "./auth";

type Store = DataSnapshot & {
  mode: DataMode;
  loading: boolean;
  error: string | null;
  canEdit: boolean;
  reload: () => Promise<void>;
  saveMeeting: (meeting: Meeting) => Promise<void>;
  saveDecision: (decision: Decision) => Promise<void>;
};
const StoreContext = createContext<Store | null>(null);
const empty: DataSnapshot = { meetings: [], decisions: [] };

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const { session, role, canEdit: authCanEdit } = useAuth();
  const [data, setData] = useState<DataSnapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const reload = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    try { const snapshot = await activeDataProvider.loadSnapshot(); if (current === requestId.current) { setData(snapshot); setError(null); } }
    catch (cause) { if (current === requestId.current) { setData(empty); setError(cause instanceof Error ? cause.message : "Не удалось загрузить данные."); } }
    finally { if (current === requestId.current) setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(reload); }, [reload, session?.user.id, role]);
  const canEdit = activeDataProvider.mode === "mock" || authCanEdit;
  const value = useMemo<Store>(() => ({
    ...data, mode: activeDataProvider.mode, loading, error, canEdit, reload,
    async saveMeeting(meeting) {
      if (!canEdit) throw new Error("У вас нет прав на изменение заседаний.");
      await activeDataProvider.saveMeeting(meeting);
      await reload();
    },
    async saveDecision(decision) {
      if (!canEdit) throw new Error("У вас нет прав на изменение решений.");
      await activeDataProvider.saveDecision(decision);
      await reload();
    },
  }), [data, loading, error, canEdit, reload]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useDataStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("DataStoreProvider is missing");
  return store;
}
