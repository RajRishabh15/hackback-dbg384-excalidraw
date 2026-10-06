/* ─── Auth, Boards & Collaboration Sync Tests ─── */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import { initDatabase, queryOne, queryAll, execute } from '../db.js';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../auth.js';

describe('Authentication & Security', () => {
  before(async () => {
    await initDatabase();
  });

  test('Hashes and verifies password correctly with bcrypt', async () => {
    const password = 'mySuperSecretPassword123!';
    const hash = await hashPassword(password);
    assert.notEqual(password, hash);

    const match = await comparePassword(password, hash);
    assert.equal(match, true);

    const wrongMatch = await comparePassword('wrong-password', hash);
    assert.equal(wrongMatch, false);
  });

  test('Generates and verifies valid JWT tokens', () => {
    const payload = { userId: 'user-abc-123', username: 'testuser' };
    const token = generateToken(payload);
    assert.ok(token);

    const decoded = verifyToken(token);
    assert.ok(decoded);
    assert.equal(decoded.userId, 'user-abc-123');
    assert.equal(decoded.username, 'testuser');
  });

  test('Rejects invalid or tampered JWT token', () => {
    const decoded = verifyToken('invalid.token.payload');
    assert.equal(decoded, null);
  });
});

describe('Board Database & Snapshots', () => {
  const userId = 'user-test-' + Date.now();
  const boardId = 'board-test-' + Date.now();

  before(async () => {
    await initDatabase();
    execute('INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)', [
      userId,
      `user_${Date.now()}`,
      `user_${Date.now()}@test.com`,
      'hash',
      new Date().toISOString(),
    ]);
  });

  test('Creates board and retrieves by owner', () => {
    const now = new Date().toISOString();
    execute(
      'INSERT INTO boards (id, name, owner_id, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [boardId, 'Sprint Planning', userId, 1, now, now]
    );

    const board = queryOne<{ id: string; name: string; owner_id: string }>(
      'SELECT id, name, owner_id FROM boards WHERE id = ?',
      [boardId]
    );

    assert.ok(board);
    assert.equal(board.name, 'Sprint Planning');
    assert.equal(board.owner_id, userId);
  });

  test('Saves and retrieves board elements snapshot', () => {
    const elements = [
      { id: 'el-1', type: 'rectangle', x: 50, y: 50, width: 100, height: 100 },
      { id: 'el-2', type: 'arrow', x: 150, y: 100, width: 200, height: 0 },
    ];
    const now = new Date().toISOString();

    execute(
      'INSERT INTO board_snapshots (board_id, name, elements_json, updated_at) VALUES (?, ?, ?, ?)',
      [boardId, 'Sprint Planning', JSON.stringify(elements), now]
    );

    const snapshot = queryOne<{ elements_json: string }>(
      'SELECT elements_json FROM board_snapshots WHERE board_id = ?',
      [boardId]
    );

    assert.ok(snapshot);
    const parsed = JSON.parse(snapshot.elements_json);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].id, 'el-1');
  });
});

describe('Yjs CRDT Multi-Client Synchronization', () => {
  test('Syncs element modifications between two collaborative documents', () => {
    // Client A
    const docA = new Y.Doc();
    const mapA = docA.getMap('elements');

    // Client B
    const docB = new Y.Doc();
    const mapB = docB.getMap('elements');

    // Sync initial state
    const updateInitial = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, updateInitial);

    // Client A creates a sticky note / shape
    docA.transact(() => {
      mapA.set('shape-1', JSON.stringify({
        id: 'shape-1',
        type: 'rectangle',
        x: 120,
        y: 80,
        width: 160,
        height: 100,
        strokeColor: '#58a6ff',
      }));
    });

    // Propagate update to Client B
    const updateFromA = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, updateFromA);

    // Client B verifies received shape
    assert.ok(mapB.has('shape-1'));
    const shapeOnB = JSON.parse(mapB.get('shape-1') as string);
    assert.equal(shapeOnB.x, 120);
    assert.equal(shapeOnB.width, 160);

    // Client B moves shape and adds connected arrow
    docB.transact(() => {
      shapeOnB.x = 200;
      mapB.set('shape-1', JSON.stringify(shapeOnB));
      mapB.set('arrow-1', JSON.stringify({
        id: 'arrow-1',
        type: 'arrow',
        x: 200,
        y: 80,
        startBinding: { elementId: 'shape-1', pointId: 'right' },
      }));
    });

    // Propagate update to Client A
    const updateFromB = Y.encodeStateAsUpdate(docB);
    Y.applyUpdate(docA, updateFromB);

    assert.ok(mapA.has('arrow-1'));
    const shapeOnA = JSON.parse(mapA.get('shape-1') as string);
    assert.equal(shapeOnA.x, 200);
  });
});
