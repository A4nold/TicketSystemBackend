import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type WalletSyncContextValue = {
  clearTicketStatusOverride: (serialNumber: string) => void;
  getTicketStatusOverride: (serialNumber: string) => string | undefined;
  setTicketStatusOverride: (serialNumber: string, status: string) => void;
};

const WalletSyncContext = createContext<WalletSyncContextValue | null>(null);

export function WalletSyncProvider({ children }: PropsWithChildren) {
  const [ticketStatusOverrides, setTicketStatusOverrides] = useState<
    Record<string, string>
  >({});

  const getTicketStatusOverride = useCallback(
    (serialNumber: string) => ticketStatusOverrides[serialNumber],
    [ticketStatusOverrides],
  );

  const value = useMemo<WalletSyncContextValue>(
    () => ({
      clearTicketStatusOverride: (serialNumber) => {
        setTicketStatusOverrides((current) => {
          if (!(serialNumber in current)) {
            return current;
          }

          const next = { ...current };
          delete next[serialNumber];
          return next;
        });
      },
      getTicketStatusOverride,
      setTicketStatusOverride: (serialNumber, status) => {
        setTicketStatusOverrides((current) => ({
          ...current,
          [serialNumber]: status,
        }));
      },
    }),
    [getTicketStatusOverride],
  );

  return (
    <WalletSyncContext.Provider value={value}>{children}</WalletSyncContext.Provider>
  );
}

export function useWalletSync() {
  const value = useContext(WalletSyncContext);

  if (!value) {
    throw new Error("useWalletSync must be used within WalletSyncProvider.");
  }

  return value;
}
