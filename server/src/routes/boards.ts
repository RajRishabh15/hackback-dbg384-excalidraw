/* ─── Boards Routes ─── */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, execute } from '../db.js';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../auth.js';

export const boardsRouter = Router();

// List current user's boards
boardsRouter.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const boards = queryAll(
    `SELECT b.id, b.name, b.owner_id, b.is_public, b.created_at, b.updated_at
     FROM boards b
     WHERE b.owner_id = ?
     ORDER BY b.updated_at DESC`,
    [userId]
  );
  res.json({ boards });
});

// Create new board
boardsRouter.post('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const { name = 'Untitled Board', is_public = 1 } = req.body;
  const userId = req.user!.id;
  const id = uuidv4();
  const now = new Date().toISOString();

  execute(
    'INSERT INTO boards (id, name, owner_id, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, userId, is_public ? 1 : 0, now, now]
  );

  execute(
    'INSERT INTO board_snapshots (board_id, name, elements_json, updated_at) VALUES (?, ?, ?, ?)',
    [id, name, '[]', now]
  );

  const board = queryOne('SELECT * FROM boards WHERE id = ?', [id]);
  res.status(201).json({ board });
});

// Get board details
boardsRouter.get('/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const board = queryOne('SELECT * FROM boards WHERE id = ?', [id]);

  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  // Access check: public boards or owner
  if (!board.is_public && (!req.user || req.user.id !== board.owner_id)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json({ board });
});

// Get board snapshot (elements)
boardsRouter.get('/:id/snapshot', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const board = queryOne('SELECT * FROM boards WHERE id = ?', [id]);

  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (!board.is_public && (!req.user || req.user.id !== board.owner_id)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const snapshot = queryOne<{ board_id: string; name: string; elements_json: string; updated_at: string }>(
    'SELECT * FROM board_snapshots WHERE board_id = ?',
    [id]
  );

  if (!snapshot) {
    res.json({ elements: [], boardName: board.name, savedAt: board.updated_at });
    return;
  }

  let elements = [];
  try {
    elements = JSON.parse(snapshot.elements_json);
  } catch {
    elements = [];
  }

  res.json({
    elements,
    boardName: snapshot.name || board.name,
    savedAt: snapshot.updated_at,
  });
});

// Save board snapshot
boardsRouter.put('/:id/snapshot', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { elements = [], boardName } = req.body;
  const now = new Date().toISOString();

  const board = queryOne('SELECT * FROM boards WHERE id = ?', [id]);
  if (!board) {
    // If not in DB yet (e.g. room created on the fly), let's create a record
    const ownerId = req.user?.id || 'anonymous';
    const name = boardName || 'Collaborative Board';
    execute(
      'INSERT INTO boards (id, name, owner_id, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, ownerId, 1, now, now]
    );
  } else {
    execute(
      'UPDATE boards SET name = ?, updated_at = ? WHERE id = ?',
      [boardName || board.name, now, id]
    );
  }

  const elementsJson = JSON.stringify(elements);
  const existingSnapshot = queryOne('SELECT board_id FROM board_snapshots WHERE board_id = ?', [id]);

  if (existingSnapshot) {
    execute(
      'UPDATE board_snapshots SET name = ?, elements_json = ?, updated_at = ? WHERE board_id = ?',
      [boardName || 'Untitled', elementsJson, now, id]
    );
  } else {
    execute(
      'INSERT INTO board_snapshots (board_id, name, elements_json, updated_at) VALUES (?, ?, ?, ?)',
      [id, boardName || 'Untitled', elementsJson, now]
    );
  }

  res.json({ success: true, savedAt: now });
});

// Delete board
boardsRouter.delete('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const board = queryOne('SELECT * FROM boards WHERE id = ?', [id]);
  if (!board) {
    res.status(404).json({ error: 'Board not found' });
    return;
  }

  if (board.owner_id !== userId) {
    res.status(403).json({ error: 'Only board owner can delete this board' });
    return;
  }

  execute('DELETE FROM board_snapshots WHERE board_id = ?', [id]);
  execute('DELETE FROM boards WHERE id = ?', [id]);

  res.json({ success: true });
});
