/* ─── InkBoard Local Persistence ─── */
import { get, set, del } from 'idb-keyval';
import { useCanvasStore } from './store';
import type { CanvasElement } from './types';

const STORAGE_KEY_PREFIX = 'inkboard_board_';
const AUTOSAVE_INTERVAL = 3000; // 3 seconds

interface BoardData {
  elements: CanvasElement[];
  boardName: string;
  savedAt: string;
  viewport?: { scrollX: number; scrollY: number; zoom: number };
}

/** Save board to IndexedDB */
export async function saveBoard(boardId: string): Promise<void> {
  const state = useCanvasStore.getState();
  const data: BoardData = {
    elements: state.elements,
    boardName: state.boardName,
    savedAt: new Date().toISOString(),
    viewport: state.viewport,
  };

  try {
    await set(`${STORAGE_KEY_PREFIX}${boardId}`, data);
  } catch (err) {
    console.error('[InkBoard] Failed to save board locally:', err);
  }
}

/** Load board from IndexedDB */
export async function loadBoard(boardId: string): Promise<BoardData | null> {
  try {
    const data = await get<BoardData>(`${STORAGE_KEY_PREFIX}${boardId}`);
    return data || null;
  } catch (err) {
    console.error('[InkBoard] Failed to load board:', err);
    return null;
  }
}

/** Delete board from IndexedDB */
export async function deleteBoardLocal(boardId: string): Promise<void> {
  try {
    await del(`${STORAGE_KEY_PREFIX}${boardId}`);
  } catch (err) {
    console.error('[InkBoard] Failed to delete board:', err);
  }
}

/** Save board to server */
export async function saveBoardToServer(boardId: string): Promise<boolean> {
  const state = useCanvasStore.getState();
  const token = localStorage.getItem('inkboard_token');
  if (!token || boardId.startsWith('local-')) return false;

  try {
    const res = await fetch(`/api/boards/${boardId}/snapshot`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        elements: state.elements,
        boardName: state.boardName,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Load board from server */
export async function loadBoardFromServer(boardId: string): Promise<BoardData | null> {
  const token = localStorage.getItem('inkboard_token');
  if (!token || boardId.startsWith('local-')) return null;

  try {
    const res = await fetch(`/api/boards/${boardId}/snapshot`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        elements: data.elements || [],
        boardName: data.boardName || 'Untitled',
        savedAt: data.savedAt || new Date().toISOString(),
      };
    }
  } catch {
    // Fall through
  }
  return null;
}

/** Auto-save timer */
let autosaveTimer: ReturnType<typeof setInterval> | null = null;

export function startAutosave(boardId: string) {
  stopAutosave();
  autosaveTimer = setInterval(async () => {
    await saveBoard(boardId);
    await saveBoardToServer(boardId);
  }, AUTOSAVE_INTERVAL);
}

export function stopAutosave() {
  if (autosaveTimer) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
}
