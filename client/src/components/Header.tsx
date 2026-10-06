/* ─── InkBoard Header ─── */
import { useCanvasStore, useAuthStore } from '../store';
import { useState } from 'react';

interface HeaderProps {
  onExport: () => void;
  onDashboard: () => void;
  onShare: () => void;
}

export default function Header({ onExport, onDashboard, onShare }: HeaderProps) {
  const boardName = useCanvasStore((s) => s.boardName);
  const isCollaborating = useCanvasStore((s) => s.isCollaborating);
  const collaborators = useCanvasStore((s) => s.collaborators);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(boardName);

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      useCanvasStore.getState().setBoardInfo(
        useCanvasStore.getState().boardId,
        tempName.trim()
      );
    }
    setEditingName(false);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="header-logo" onClick={onDashboard} title="Back to Dashboard">
          <span className="logo-icon">◈</span>
          <span className="logo-text">InkBoard</span>
        </button>
        <div className="header-divider" />
        {editingName ? (
          <input
            className="board-name-input"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
          />
        ) : (
          <button
            className="board-name"
            onClick={() => { setTempName(boardName); setEditingName(true); }}
            title="Click to rename"
          >
            {boardName}
          </button>
        )}
      </div>

      <div className="header-center">
        {isCollaborating && (
          <div className="collab-status">
            <span className="collab-dot" />
            <span className="collab-text">Live</span>
            <div className="collab-avatars">
              {Array.from(collaborators.values()).map((c) => (
                <div
                  key={c.clientId}
                  className="collab-avatar"
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                >
                  {c.name[0]?.toUpperCase() || '?'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="header-right">
        <button className="header-btn" onClick={onShare} title="Share & Collaborate" id="btn-share">
          <span>Share</span>
        </button>
        <button className="header-btn" onClick={onExport} title="Export board" id="btn-export">
          <span>Export</span>
        </button>
        {user && (
          <div className="user-menu">
            <div className="user-avatar" title={user.username}>
              {user.username[0]?.toUpperCase()}
            </div>
            <button className="header-btn-sm" onClick={() => { logout(); onDashboard(); }}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
