/* ─── InkBoard Zustand Store ─── */
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { CanvasElement, ToolType, Viewport, StyleOptions, Collaborator, Board, User } from './types';

/* ── Canvas Store ── */
interface HistoryEntry {
  elements: CanvasElement[];
}

interface CanvasState {
  // Elements
  elements: CanvasElement[];
  // Selection
  selectedElementIds: string[];
  // Active tool
  activeTool: ToolType;
  // Viewport
  viewport: Viewport;
  // Style defaults
  currentStyle: StyleOptions;
  // History
  history: HistoryEntry[];
  historyIndex: number;
  // Board
  boardId: string | null;
  boardName: string;
  // Collaboration
  collaborators: Map<number, Collaborator>;
  isCollaborating: boolean;
  // Flags
  isRemoteUpdate: boolean;

  // Actions
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  updateElements: (updates: Array<{ id: string; changes: Partial<CanvasElement> }>) => void;
  deleteElements: (ids: string[]) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setActiveTool: (tool: ToolType) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setCurrentStyle: (style: Partial<StyleOptions>) => void;
  setElements: (elements: CanvasElement[]) => void;
  setElementsFromRemote: (elements: CanvasElement[]) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setBoardInfo: (id: string | null, name: string) => void;
  setCollaborators: (collaborators: Map<number, Collaborator>) => void;
  setIsCollaborating: (v: boolean) => void;
  clearCanvas: () => void;
  duplicateElements: (ids: string[]) => void;
  selectAll: () => void;
  getNonDeletedElements: () => CanvasElement[];
}

const DEFAULT_STYLE: StyleOptions = {
  strokeColor: '#e6edf3',
  backgroundColor: 'transparent',
  fillStyle: 'hachure',
  strokeWidth: 2,
  roughness: 1,
  opacity: 100,
  fontSize: 20,
  fontFamily: "'Architects Daughter', cursive",
};

const MAX_HISTORY = 100;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  selectedElementIds: [],
  activeTool: 'select',
  viewport: { scrollX: 0, scrollY: 0, zoom: 1 },
  currentStyle: { ...DEFAULT_STYLE },
  history: [{ elements: [] }],
  historyIndex: 0,
  boardId: null,
  boardName: 'Untitled Board',
  collaborators: new Map(),
  isCollaborating: false,
  isRemoteUpdate: false,

  addElement: (element) => {
    const state = get();
    state.pushHistory();
    set({ elements: [...state.elements, element] });
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id
          ? { ...el, ...updates, version: el.version + 1, versionNonce: Math.floor(Math.random() * 2147483647) }
          : el
      ),
    }));
  },

  updateElements: (updates) => {
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.changes]));
      return {
        elements: state.elements.map((el) => {
          const changes = updateMap.get(el.id);
          if (changes) {
            return { ...el, ...changes, version: el.version + 1, versionNonce: Math.floor(Math.random() * 2147483647) };
          }
          return el;
        }),
      };
    });
  },

  deleteElements: (ids) => {
    const state = get();
    state.pushHistory();
    const idSet = new Set(ids);
    set({
      elements: state.elements.map((el) =>
        idSet.has(el.id) ? { ...el, isDeleted: true } : el
      ),
      selectedElementIds: state.selectedElementIds.filter((id) => !idSet.has(id)),
    });
  },

  setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),

  setActiveTool: (tool) => set({ activeTool: tool, selectedElementIds: [] }),

  setViewport: (partial) =>
    set((state) => ({ viewport: { ...state.viewport, ...partial } })),

  setCurrentStyle: (partial) =>
    set((state) => ({
      currentStyle: { ...state.currentStyle, ...partial },
    })),

  setElements: (elements) => set({ elements }),

  setElementsFromRemote: (elements) => {
    set({ elements, isRemoteUpdate: true });
    // Reset flag async
    setTimeout(() => set({ isRemoteUpdate: false }), 0);
  },

  pushHistory: () => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ elements: JSON.parse(JSON.stringify(state.elements)) });
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      set({
        elements: JSON.parse(JSON.stringify(state.history[newIndex].elements)),
        historyIndex: newIndex,
        selectedElementIds: [],
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      set({
        elements: JSON.parse(JSON.stringify(state.history[newIndex].elements)),
        historyIndex: newIndex,
        selectedElementIds: [],
      });
    }
  },

  setBoardInfo: (id, name) => set({ boardId: id, boardName: name }),

  setCollaborators: (collaborators) => set({ collaborators }),

  setIsCollaborating: (v) => set({ isCollaborating: v }),

  clearCanvas: () => {
    const state = get();
    state.pushHistory();
    set({ elements: [], selectedElementIds: [] });
  },

  duplicateElements: (ids) => {
    const state = get();
    state.pushHistory();
    const idSet = new Set(ids);
    const newElements: CanvasElement[] = [];
    const newIds: string[] = [];
    state.elements.forEach((el) => {
      if (idSet.has(el.id) && !el.isDeleted) {
        const newId = nanoid();
        newIds.push(newId);
        newElements.push({
          ...el,
          id: newId,
          x: el.x + 20,
          y: el.y + 20,
          version: 1,
          versionNonce: Math.floor(Math.random() * 2147483647),
        });
      }
    });
    set({
      elements: [...state.elements, ...newElements],
      selectedElementIds: newIds,
    });
  },

  selectAll: () => {
    const state = get();
    set({
      selectedElementIds: state.elements.filter((el) => !el.isDeleted).map((el) => el.id),
      activeTool: 'select',
    });
  },

  getNonDeletedElements: () => get().elements.filter((el) => !el.isDeleted),
}));

/* ── Auth Store ── */
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  boards: Board[];

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setBoards: (boards: Board[]) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadUser: () => Promise<void>;
  fetchBoards: () => Promise<void>;
  createBoard: (name: string) => Promise<Board | null>;
  deleteBoard: (id: string) => Promise<void>;
}

const API_BASE = '/api';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('inkboard_token'),
  isLoading: false,
  error: null,
  boards: [],

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('inkboard_token', token);
    else localStorage.removeItem('inkboard_token');
    set({ token });
  },
  setBoards: (boards) => set({ boards }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Login failed', isLoading: false });
        return false;
      }
      set({ user: data.user, isLoading: false });
      get().setToken(data.token);
      return true;
    } catch {
      set({ error: 'Network error', isLoading: false });
      return false;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Registration failed', isLoading: false });
        return false;
      }
      set({ user: data.user, isLoading: false });
      get().setToken(data.token);
      return true;
    } catch {
      set({ error: 'Network error', isLoading: false });
      return false;
    }
  },

  logout: () => {
    set({ user: null, boards: [] });
    get().setToken(null);
  },

  loadUser: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user });
      } else {
        get().setToken(null);
      }
    } catch {
      /* network error, stay logged out */
    }
  },

  fetchBoards: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/boards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ boards: data.boards });
      }
    } catch {
      /* ignore */
    }
  },

  createBoard: async (name) => {
    const token = get().token;
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        get().fetchBoards();
        return data.board;
      }
    } catch {
      /* ignore */
    }
    return null;
  },

  deleteBoard: async (id) => {
    const token = get().token;
    if (!token) return;
    try {
      await fetch(`${API_BASE}/boards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      get().fetchBoards();
    } catch {
      /* ignore */
    }
  },
}));
