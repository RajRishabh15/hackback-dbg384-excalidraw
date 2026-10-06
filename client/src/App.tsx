/* ─── InkBoard App Shell ─── */
import { useState, useEffect, useCallback } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import PropertyPanel from './components/PropertyPanel';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import ExportModal from './components/ExportModal';
import ShareModal from './components/ShareModal';
import { useCanvasStore, useAuthStore } from './store';
import { loadBoard, loadBoardFromServer, startAutosave, stopAutosave } from './persistence';
import { connectToRoom, disconnectFromRoom } from './collab';
import type { Board } from './types';

type View = 'dashboard' | 'editor';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [showAuth, setShowAuth] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Check URL hash for board link
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#board=')) {
      const boardId = hash.slice(7);
      if (boardId) {
        handleOpenBoard({
          id: boardId,
          name: 'Shared Board',
          owner_id: '',
          is_public: true,
          created_at: '',
          updated_at: '',
        });
      }
    }
  }, []);

  const handleOpenBoard = useCallback(async (board: Board) => {
    useCanvasStore.getState().setBoardInfo(board.id, board.name);
    useCanvasStore.getState().setElements([]);
    useCanvasStore.getState().setSelectedElementIds([]);

    // Try loading from server first, then local
    let loaded = false;
    if (!board.id.startsWith('local-')) {
      const serverData = await loadBoardFromServer(board.id);
      if (serverData && serverData.elements.length > 0) {
        useCanvasStore.getState().setElements(serverData.elements);
        loaded = true;
      }
    }

    if (!loaded) {
      const localData = await loadBoard(board.id);
      if (localData) {
        useCanvasStore.getState().setElements(localData.elements);
        if (localData.viewport) {
          useCanvasStore.getState().setViewport(localData.viewport);
        }
      }
    }

    // Start autosave
    startAutosave(board.id);

    // Auto-join collaboration if it's a shared board
    if (window.location.hash.startsWith('#board=')) {
      const username = user?.username || 'Anonymous';
      connectToRoom(board.id, username);
    }

    setView('editor');
  }, [user]);

  const handleDashboard = useCallback(() => {
    stopAutosave();
    disconnectFromRoom();
    setView('dashboard');
  }, []);

  return (
    <div className="app">
      {view === 'dashboard' && (
        <Dashboard
          onOpenBoard={handleOpenBoard}
          onShowAuth={() => setShowAuth(true)}
        />
      )}

      {view === 'editor' && (
        <div className="editor-layout">
          <Header
            onExport={() => setShowExport(true)}
            onDashboard={handleDashboard}
            onShare={() => setShowShare(true)}
          />
          <div className="editor-main">
            <Toolbar />
            <Canvas />
            <PropertyPanel />
          </div>
        </div>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            useAuthStore.getState().fetchBoards();
          }}
        />
      )}

      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} />
      )}

      {showShare && (
        <ShareModal onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
