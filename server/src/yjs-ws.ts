/* ─── InkBoard Yjs Realtime Collaboration Server ─── */
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { queryOne, execute } from './db.js';

const messageSync = 0;
const messageAwareness = 1;

interface Room {
  name: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Set<WebSocket>;
}

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomName: string): Room {
  let room = rooms.get(roomName);
  if (room) return room;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);

  // Load existing snapshot from DB if available
  try {
    const snapshot = queryOne<{ elements_json: string }>(
      'SELECT elements_json FROM board_snapshots WHERE board_id = ?',
      [roomName]
    );
    if (snapshot && snapshot.elements_json) {
      const elements = JSON.parse(snapshot.elements_json);
      if (Array.isArray(elements) && elements.length > 0) {
        const yElements = doc.getMap('elements');
        doc.transact(() => {
          for (const el of elements) {
            yElements.set(el.id, JSON.stringify(el));
          }
        });
      }
    }
  } catch (err) {
    console.error(`[Yjs] Error preloading room ${roomName} from DB:`, err);
  }

  // Auto-sync back to DB periodically when doc changes
  let saveTimeout: NodeJS.Timeout | null = null;
  doc.on('update', () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        const yElements = doc.getMap('elements');
        const elements: any[] = [];
        yElements.forEach((val) => {
          try {
            elements.push(typeof val === 'string' ? JSON.parse(val) : val);
          } catch {}
        });
        const now = new Date().toISOString();
        const json = JSON.stringify(elements);
        const exists = queryOne('SELECT board_id FROM board_snapshots WHERE board_id = ?', [roomName]);
        if (exists) {
          execute('UPDATE board_snapshots SET elements_json = ?, updated_at = ? WHERE board_id = ?', [json, now, roomName]);
        } else {
          execute('INSERT INTO board_snapshots (board_id, name, elements_json, updated_at) VALUES (?, ?, ?, ?)', [roomName, 'Collaborative Board', json, now]);
        }
      } catch (err) {
        console.error(`[Yjs] Auto-save failed for room ${roomName}:`, err);
      }
    }, 2000);
  });

  room = {
    name: roomName,
    doc,
    awareness,
    conns: new Set(),
  };

  // Awareness change broadcast
  awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
    const changedClients = added.concat(updated, removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    );
    const buff = encoding.toUint8Array(encoder);
    room!.conns.forEach((conn) => {
      if (conn !== origin && conn.readyState === WebSocket.OPEN) {
        conn.send(buff);
      }
    });
  });

  rooms.set(roomName, room);
  return room;
}

export function setupYjsWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (conn: WebSocket, req) => {
    // Extract room name from URL: /yjs/:room or /:room
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const roomName = pathname.replace(/^\/(yjs\/)?/, '') || 'default';

    const room = getOrCreateRoom(roomName);
    room.conns.add(conn);

    conn.binaryType = 'arraybuffer';

    // 1. Send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, room.doc);
    conn.send(encoding.toUint8Array(encoder));

    // 2. Send current awareness states
    const awarenessStates = room.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, messageAwareness);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      conn.send(encoding.toUint8Array(awarenessEncoder));
    }

    // Message listener
    conn.on('message', (message: ArrayBuffer) => {
      try {
        const uint8Array = new Uint8Array(message);
        const decoder = decoding.createDecoder(uint8Array);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case messageSync: {
            const replyEncoder = encoding.createEncoder();
            encoding.writeVarUint(replyEncoder, messageSync);
            syncProtocol.readSyncMessage(decoder, replyEncoder, room.doc, conn);
            if (encoding.length(replyEncoder) > 1) {
              conn.send(encoding.toUint8Array(replyEncoder));
            }
            break;
          }
          case messageAwareness: {
            awarenessProtocol.applyAwarenessUpdate(
              room.awareness,
              decoding.readVarUint8Array(decoder),
              conn
            );
            break;
          }
        }
      } catch (err) {
        console.error('[Yjs] Error handling message:', err);
      }
    });

    // Clean up on disconnect
    conn.on('close', () => {
      room.conns.delete(conn);
      if (room.conns.size === 0) {
        // Can optionally unload after timeout
      }
    });

    conn.on('error', (err) => {
      console.error('[Yjs] Socket error:', err);
    });
  });
}
