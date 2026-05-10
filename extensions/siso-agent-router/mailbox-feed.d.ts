export type MailboxMessageState = "queued" | "delivered" | "read" | "acknowledged";

export interface MailboxFeedOptions {
  rootDir?: string;
  ownerSessionId?: string;
  state?: MailboxMessageState;
  limit?: number;
  now?: () => string;
  at?: string;
}

export interface MailboxMessage extends Record<string, unknown> {
  id: string;
  ownerSessionId: string;
  state: MailboxMessageState;
  createdAt: string;
  updatedAt: string;
  queuedAt: string;
  deliveredAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
  redeliveredAt?: string;
  mailboxPath: string;
}

export interface FeedEvent extends Record<string, unknown> {
  channelName: string;
  at: string;
}

export declare function normalizeChannelName(value?: string, fallback?: string): string;

export declare function createMailboxMessage<T extends Record<string, unknown>>(
  message?: T & Partial<MailboxMessage>,
  options?: MailboxFeedOptions,
): MailboxMessage & T;

export declare function markMailboxDelivered<T extends Record<string, unknown>>(
  message?: T & Partial<MailboxMessage>,
  deliveredAt?: string,
  options?: MailboxFeedOptions,
): MailboxMessage & T;

export declare function markMailboxRead<T extends Record<string, unknown>>(
  message?: T & Partial<MailboxMessage>,
  readAt?: string,
  options?: MailboxFeedOptions,
): MailboxMessage & T;

export declare function markMailboxAcknowledged<T extends Record<string, unknown>>(
  message?: T & Partial<MailboxMessage>,
  acknowledgedAt?: string,
  options?: MailboxFeedOptions,
): MailboxMessage & T;

export declare function readMailboxMessage<T extends Record<string, unknown>>(
  message?: T & Partial<MailboxMessage>,
  options?: MailboxFeedOptions,
): MailboxMessage & T;

export declare function listMailboxMessages(
  options?: MailboxFeedOptions,
): MailboxMessage[];

export declare function shouldRedeliver(
  message?: Partial<MailboxMessage>,
  options?: MailboxFeedOptions,
): boolean;

export declare function appendFeedEvent<T extends Record<string, unknown>>(
  channelName: string,
  event?: T,
  options?: MailboxFeedOptions,
): FeedEvent & T & { feedPath: string };

export declare function readFeedEvents<T extends Record<string, unknown>>(
  channelName: string,
  options?: Omit<MailboxFeedOptions, "at">,
): Array<FeedEvent & T>;
