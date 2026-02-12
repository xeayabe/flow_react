/**
 * Offline mutation queue for data integrity
 *
 * FIX: REL-2 - Offline queue for mutations when connectivity is lost
 *
 * Features:
 * - Uses @react-native-async-storage/async-storage for persistence
 * - Uses @react-native-community/netinfo for connectivity detection
 * - Queues mutations when offline
 * - Replays in order when connectivity returns
 * - Prevents duplicate replays via unique operation IDs
 * - Emits events when queue changes (for UI indicators)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// FIX: REL-2 - Storage key for persisted queue
const QUEUE_STORAGE_KEY = '@flow/offline-mutation-queue';

/**
 * Status of a queued mutation
 */
export type MutationStatus = 'pending' | 'replaying' | 'completed' | 'failed';

/**
 * A single queued mutation operation
 */
export interface QueuedMutation {
  /** Unique ID for deduplication */
  id: string;
  /** Timestamp when queued (for ordering) */
  queuedAt: number;
  /** Human-readable description of the operation */
  description: string;
  /** The serialized mutation data (operation-specific) */
  payload: unknown;
  /** The mutation type/action name (e.g., 'createTransaction', 'createSettlement') */
  action: string;
  /** Current status */
  status: MutationStatus;
  /** Number of replay attempts */
  retryCount: number;
  /** Error message from last failed replay attempt */
  lastError?: string;
}

/**
 * Events emitted by the offline queue
 */
export type OfflineQueueEvent =
  | { type: 'queue-changed'; queueLength: number }
  | { type: 'connectivity-changed'; isConnected: boolean }
  | { type: 'replay-started'; mutationId: string }
  | { type: 'replay-completed'; mutationId: string }
  | { type: 'replay-failed'; mutationId: string; error: string }
  | { type: 'replay-all-completed'; successCount: number; failCount: number };

type EventListener = (event: OfflineQueueEvent) => void;

/**
 * Mutation handler function type -- registered per action name
 */
type MutationHandler = (payload: unknown) => Promise<void>;

/**
 * Offline mutation queue manager
 *
 * Usage:
 * 1. Register mutation handlers for each action type
 * 2. When performing a mutation, check `isOnline` first
 * 3. If offline, call `enqueue()` to persist the mutation
 * 4. Queue auto-replays when connectivity returns
 *
 * @example
 * ```ts
 * // Register handlers
 * offlineQueue.registerHandler('createTransaction', async (payload) => {
 *   await createTransaction(payload as CreateTransactionRequest);
 * });
 *
 * // Use in mutation logic
 * if (!offlineQueue.isOnline) {
 *   await offlineQueue.enqueue({
 *     id: uuidv4(),
 *     action: 'createTransaction',
 *     description: 'Create grocery expense',
 *     payload: transactionData,
 *   });
 * } else {
 *   await createTransaction(transactionData);
 * }
 * ```
 */
// FIX: REL-2 - Offline queue class with persistence and auto-replay
class OfflineQueueManager {
  private queue: QueuedMutation[] = [];
  private listeners: Set<EventListener> = new Set();
  private handlers: Map<string, MutationHandler> = new Map();
  private _isOnline: boolean = true;
  private _isReplaying: boolean = false;
  private _isInitialized: boolean = false;
  private unsubscribeNetInfo: (() => void) | null = null;

  /**
   * Whether the device currently has connectivity
   */
  get isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Whether the queue is currently replaying mutations
   */
  get isReplaying(): boolean {
    return this._isReplaying;
  }

  /**
   * Number of pending mutations in the queue
   */
  get pendingCount(): number {
    return this.queue.filter((m) => m.status === 'pending' || m.status === 'failed').length;
  }

  /**
   * Initialize the queue: load persisted mutations and start listening for connectivity
   */
  // FIX: REL-2 - Initialize from persisted storage and start connectivity monitoring
  async initialize(): Promise<void> {
    if (this._isInitialized) return;

    // Load persisted queue
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedMutation[];
        // Reset any 'replaying' status back to 'pending' (app may have crashed mid-replay)
        this.queue = parsed.map((m) => ({
          ...m,
          status: m.status === 'replaying' ? 'pending' : m.status,
        }));
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load persisted queue:', error);
      this.queue = [];
    }

    // Subscribe to connectivity changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !this._isOnline;
      this._isOnline = state.isConnected === true && state.isInternetReachable !== false;

      this.emit({ type: 'connectivity-changed', isConnected: this._isOnline });

      // If we just came back online and have pending mutations, replay them
      if (wasOffline && this._isOnline && this.pendingCount > 0) {
        this.replayAll();
      }
    });

    // Get initial connectivity state
    const initialState = await NetInfo.fetch();
    this._isOnline = initialState.isConnected === true && initialState.isInternetReachable !== false;

    this._isInitialized = true;

    // If online and have pending mutations from last session, replay
    if (this._isOnline && this.pendingCount > 0) {
      this.replayAll();
    }
  }

  /**
   * Tear down: stop listening for connectivity
   */
  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this._isInitialized = false;
  }

  /**
   * Register a handler for a mutation action type
   */
  registerHandler(action: string, handler: MutationHandler): void {
    this.handlers.set(action, handler);
  }

  /**
   * Add a mutation to the offline queue
   */
  // FIX: REL-2 - Enqueue mutation with deduplication and persistence
  async enqueue(mutation: Omit<QueuedMutation, 'queuedAt' | 'status' | 'retryCount'>): Promise<void> {
    // Prevent duplicate enqueue (by ID)
    if (this.queue.some((m) => m.id === mutation.id)) {
      console.warn(`[OfflineQueue] Mutation ${mutation.id} already in queue, skipping`);
      return;
    }

    const queuedMutation: QueuedMutation = {
      ...mutation,
      queuedAt: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    this.queue.push(queuedMutation);
    await this.persist();

    this.emit({ type: 'queue-changed', queueLength: this.pendingCount });

    console.log(`[OfflineQueue] Enqueued: ${mutation.action} (${mutation.description})`);
  }

  /**
   * Replay all pending mutations in order
   */
  // FIX: REL-2 - Replay queued mutations in FIFO order when online
  async replayAll(): Promise<void> {
    if (this._isReplaying) {
      console.log('[OfflineQueue] Already replaying, skipping');
      return;
    }

    if (!this._isOnline) {
      console.log('[OfflineQueue] Still offline, cannot replay');
      return;
    }

    this._isReplaying = true;
    let successCount = 0;
    let failCount = 0;

    // Process in FIFO order (oldest first)
    const pending = this.queue
      .filter((m) => m.status === 'pending' || m.status === 'failed')
      .sort((a, b) => a.queuedAt - b.queuedAt);

    for (const mutation of pending) {
      // Check connectivity before each replay
      if (!this._isOnline) {
        console.log('[OfflineQueue] Lost connectivity during replay, stopping');
        break;
      }

      const handler = this.handlers.get(mutation.action);
      if (!handler) {
        console.error(`[OfflineQueue] No handler registered for action: ${mutation.action}`);
        mutation.status = 'failed';
        mutation.lastError = `No handler for action: ${mutation.action}`;
        failCount++;
        continue;
      }

      mutation.status = 'replaying';
      this.emit({ type: 'replay-started', mutationId: mutation.id });

      try {
        await handler(mutation.payload);
        mutation.status = 'completed';
        successCount++;
        this.emit({ type: 'replay-completed', mutationId: mutation.id });
      } catch (error) {
        mutation.status = 'failed';
        mutation.retryCount++;
        mutation.lastError = error instanceof Error ? error.message : String(error);
        failCount++;
        this.emit({
          type: 'replay-failed',
          mutationId: mutation.id,
          error: mutation.lastError,
        });
        console.error(`[OfflineQueue] Replay failed for ${mutation.action}:`, mutation.lastError);
      }
    }

    // Remove completed mutations from queue
    this.queue = this.queue.filter((m) => m.status !== 'completed');
    await this.persist();

    this._isReplaying = false;

    this.emit({ type: 'queue-changed', queueLength: this.pendingCount });
    this.emit({ type: 'replay-all-completed', successCount, failCount });

    console.log(`[OfflineQueue] Replay complete: ${successCount} succeeded, ${failCount} failed`);
  }

  /**
   * Get all pending mutations (for UI display)
   */
  getPendingMutations(): QueuedMutation[] {
    return this.queue.filter((m) => m.status === 'pending' || m.status === 'failed');
  }

  /**
   * Clear all mutations from the queue (use with caution)
   */
  async clearAll(): Promise<void> {
    this.queue = [];
    await this.persist();
    this.emit({ type: 'queue-changed', queueLength: 0 });
  }

  /**
   * Remove a specific mutation by ID
   */
  async removeMutation(id: string): Promise<void> {
    this.queue = this.queue.filter((m) => m.id !== id);
    await this.persist();
    this.emit({ type: 'queue-changed', queueLength: this.pendingCount });
  }

  /**
   * Subscribe to queue events
   */
  addEventListener(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Persist queue to AsyncStorage
   */
  // FIX: REL-2 - Persist queue to survive app restarts
  private async persist(): Promise<void> {
    try {
      const serializable = this.queue.filter((m) => m.status !== 'completed');
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('[OfflineQueue] Failed to persist queue:', error);
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: OfflineQueueEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[OfflineQueue] Event listener error:', error);
      }
    }
  }
}

/**
 * Singleton instance of the offline queue manager.
 * Import this in your app entry point and call `offlineQueue.initialize()`.
 */
// FIX: REL-2 - Export singleton instance
export const offlineQueue = new OfflineQueueManager();
