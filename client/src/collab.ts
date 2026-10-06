/* ─── InkBoard Yjs Collaboration ─── */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useCanvasStore } from './store';
import type { CanvasElement, Collaborator } from './types';
import { getCollaboratorColor } from './engine';

let ydoc: Y.Doc | null = null;
let wsProvider: WebsocketProvider | null = null;
let idbPersistence: IndexeddbPersistence | null = null;
let isApplyingRemote = false;

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function connectToRoom(roomId: string, username: string) {
  // Disconnect existing
  disconnectFromRoom();

  ydoc = new Y.Doc();

  // IndexedDB persistence for offline support
  idbPersistence = new IndexeddbPersistence(`inkboard-${roomId}`, ydoc);

  // WebSocket provider for realtime sync
  wsProvider = new WebsocketProvider(WS_URL, roomId, ydoc, {
    connect: true,
    params: {
      token: localStorage.getItem('inkboard_token') || '',
    },
  });

  // Set awareness (presence) info
  const awareness = wsProvider.awareness;
  (window as any).__yjsAwareness = awareness;

  const color = getCollaboratorColor(Math.floor(Math.random() * 10));
  awareness.setLocalState({
    user: { name: username, color },
    cursor: null,
    selectedElementIds: [],
  });

  // Sync elements from Y.Map to store
  const yElements = ydoc.getMap('elements');

  // Listen for remote changes
  yElements.observe(() => {
    if (isApplyingRemote) return;
    isApplyingRemote = true;
    try {
      const elements: CanvasElement[] = [];
      yElements.forEach((value, key) => {
        try {
          const el = typeof value === 'string' ? JSON.parse(value) : value;
          elements.push(el);
        } catch {
          // Skip invalid entries
        }
      });
      // Sort by version to maintain order
      elements.sort((a, b) => (a.version || 0) - (b.version || 0));
      useCanvasStore.getState().setElementsFromRemote(elements);
    } finally {
      setTimeout(() => { isApplyingRemote = false; }, 10);
    }
  });

  // Listen for awareness changes (presence/cursors)
  awareness.on('change', () => {
    const states = awareness.getStates();
    const collaborators = new Map<number, Collaborator>();

    states.forEach((state, clientId) => {
      if (clientId === ydoc!.clientID) return; // Skip self
      if (state.user) {
        collaborators.set(clientId, {
          clientId,
          name: state.user.name || 'Anonymous',
          color: state.user.color || '#58a6ff',
          cursor: state.cursor || null,
          selectedElementIds: state.selectedElementIds || [],
        });
      }
    });

    useCanvasStore.getState().setCollaborators(collaborators);
  });

  // Sync status
  wsProvider.on('status', (event: { status: string }) => {
    useCanvasStore.getState().setIsCollaborating(event.status === 'connected');
  });

  wsProvider.on('connection-error', () => {
    console.warn('[InkBoard] WebSocket connection error, will retry...');
  });

  // Initial sync: push local elements to Y.Map
  idbPersistence.once('synced', () => {
    const localElements = useCanvasStore.getState().elements;
    if (localElements.length > 0 && yElements.size === 0) {
      ydoc!.transact(() => {
        for (const el of localElements) {
          yElements.set(el.id, JSON.stringify(el));
        }
      });
    }
  });

  useCanvasStore.getState().setIsCollaborating(true);
}

export function disconnectFromRoom() {
  if (wsProvider) {
    wsProvider.disconnect();
    wsProvider.destroy();
    wsProvider = null;
  }
  if (idbPersistence) {
    idbPersistence.destroy();
    idbPersistence = null;
  }
  if (ydoc) {
    ydoc.destroy();
    ydoc = null;
  }
  (window as any).__yjsAwareness = null;
  useCanvasStore.getState().setIsCollaborating(false);
  useCanvasStore.getState().setCollaborators(new Map());
}

/** Sync local element changes to Yjs */
export function syncElementsToYjs(elements: CanvasElement[]) {
  if (!ydoc || isApplyingRemote) return;

  const yElements = ydoc.getMap('elements');
  ydoc.transact(() => {
    // Update or add elements
    for (const el of elements) {
      const existing = yElements.get(el.id);
      const existingParsed = existing
        ? (typeof existing === 'string' ? JSON.parse(existing) : existing)
        : null;

      // Only update if version is newer
      if (!existingParsed || el.version >= existingParsed.version) {
        yElements.set(el.id, JSON.stringify(el));
      }
    }

    // Mark deleted elements
    const currentIds = new Set(elements.map((el) => el.id));
    yElements.forEach((_value, key) => {
      if (!currentIds.has(key)) {
        const val = yElements.get(key);
        if (val) {
          const parsed = typeof val === 'string' ? JSON.parse(val) : val;
          if (!parsed.isDeleted) {
            parsed.isDeleted = true;
            yElements.set(key, JSON.stringify(parsed));
          }
        }
      }
    });
  });
}

// Subscribe to store changes and sync
let unsubscribe: (() => void) | null = null;

export function startSyncSubscription() {
  if (unsubscribe) return;

  unsubscribe = useCanvasStore.subscribe((state, prevState) => {
    if (state.elements !== prevState.elements && !state.isRemoteUpdate && ydoc) {
      syncElementsToYjs(state.elements);
    }
  });
}

export function stopSyncSubscription() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// Auto-start sync subscription
startSyncSubscription();
