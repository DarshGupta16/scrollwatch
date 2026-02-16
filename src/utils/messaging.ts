export type MessageType = "TICK" | "CHECK_STATUS" | "BLOCK_PAGE" | "UNBLOCK_PAGE" | "UPDATE_RULES";

export interface ExtensionMessage {
  type: MessageType;
  domain?: string;
  timestamp?: number;
  watchlist?: Record<string, any>;
}

export interface StatusResponse {
  isBlocked: boolean;
}
