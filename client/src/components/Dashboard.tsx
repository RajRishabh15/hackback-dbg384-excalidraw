/* ─── InkBoard Dashboard ─── */
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import type { Board } from '../types';

interface DashboardProps {
  onOpenBoard: (board: Board) => void;
  onShowAuth: () => void;
}

export default function Dashboard({ onOpenBoard, onShowAuth }: DashboardProps) {
  const user = useAuthStore((s) => s.user);
  const boards = useAuthStore((s) => s.boards);
  const fetchBoards = useAuthStore((s) => s.fetchBoards);
  const createBoard = useAuthStore((s) => s.createBoard);
  const deleteBoard = useAuthStore((s) => s.deleteBoard);
  const [newBoardName, setNewBoardName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (user) fetchBoards();
  }, [user, fetchBoards]);

  const handleCreate = async () => {
    const name = newBoardName.trim() || 'Untitled Board';
    const board = await createBoard(name);
    if (board) {
      onOpenBoard(board);
    }
    setNewBoardName('');
    setShowCreate(false);
  };

  // Quick start without login
  const handleQuickStart = () => {
    const board: Board = {
      id: 'local-' + Date.now(),
      name: 'Quick Board',
      owner_id: 'local',
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onOpenBoard(board);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-bg" />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div className="dashboard-logo">
            <span className="logo-icon-lg">◈</span>
            <h1>InkBoard</h1>
            <p className="dashboard-subtitle">Collaborative Whiteboard for Teams</p>
          </div>
          <div className="dashboard-actions">
            {!user ? (
              <>
                <button className="btn-primary" onClick={onShowAuth} id="btn-login">
                  Sign In
                </button>
                <button className="btn-secondary" onClick={handleQuickStart} id="btn-quickstart">
                  Quick Start →
                </button>
              </>
            ) : (
              <div className="user-welcome">
                <span>Welcome, <strong>{user.username}</strong></span>
              </div>
            )}
          </div>
        </div>

        {user && (
          <div className="boards-section">
            <div className="boards-header">
              <h2>Your Boards</h2>
              <button
                className="btn-primary"
                onClick={() => setShowCreate(true)}
                id="btn-new-board"
              >
                + New Board
              </button>
            </div>

            {showCreate && (
              <div className="create-board-form">
                <input
                  className="create-board-input"
                  placeholder="Board name..."
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <button className="btn-primary" onClick={handleCreate}>Create</button>
                <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            )}

            <div className="boards-grid">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className="board-card"
                  onClick={() => onOpenBoard(board)}
                >
                  <div className="board-card-preview">
                    <span className="board-card-icon">◈</span>
                  </div>
                  <div className="board-card-info">
                    <h3 className="board-card-name">{board.name}</h3>
                    <span className="board-card-date">
                      {new Date(board.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="board-card-delete"
                    onClick={(e) => { e.stopPropagation(); deleteBoard(board.id); }}
                    title="Delete board"
                  >
                    ×
                  </button>
                </div>
              ))}
              {boards.length === 0 && (
                <div className="boards-empty">
                  <p>No boards yet. Create your first board!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!user && (
          <div className="features-section">
            <div className="feature-card">
              <span className="feature-icon">✏️</span>
              <h3>Hand-drawn Style</h3>
              <p>Beautiful sketchy aesthetic with roughjs rendering</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">👥</span>
              <h3>Real-time Collaboration</h3>
              <p>Work together with live cursors and CRDT sync</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🔒</span>
              <h3>Secure & Persistent</h3>
              <p>Server-side auth, board permissions, auto-save</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🎯</span>
              <h3>Smart Connectors</h3>
              <p>Orthogonal connectors that route around shapes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
