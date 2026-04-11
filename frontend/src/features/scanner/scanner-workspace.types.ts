export type ScannerAttemptRecord = {
  currentStatus: string | null;
  outcome: "VALID" | "ALREADY_USED" | "INVALID" | "BLOCKED";
  reasonCode: string;
  scanSessionId: string | null;
  scannedAt: string;
  serialNumber: string | null;
  ticketId: string | null;
  source: "DEGRADED" | "ONLINE";
  syncState: "NONE" | "PENDING_SYNC" | "SYNCED";
};
