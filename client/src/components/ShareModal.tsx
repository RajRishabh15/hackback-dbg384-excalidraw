/* ─── InkBoard Share Modal ─── */
import { useState } from 'react';
import { useCanvasStore, useAuthStore } from '../store';
import { connectToRoom, disconnectFromRoom } from '../collab';

interface ShareModalProps {
  onClose: () => void;
}

export default function ShareModal({ onClose }: ShareModalProps) {
  const boardId = useCanvasStore((s) => s.boardId);
  const isCollaborating = useCanvasStore((s) => s.isCollaborating);
  const user = useAuthStore((s) => s.user);
  const [copied, setCopied] = useState(false);

  const roomUrl = boardId
    ? `${window.location.origin}/#board=${boardId}`
    : '';

  const handleStartCollab = () => {
    if (!boardId) return;
    const username = user?.username || 'Anonymous';
    connectToRoom(boardId, username);
  };

  const handleStopCollab = () => {
    disconnectFromRoom();
  };

  const handleCopyLink = async () => {
    if (!roomUrl) return;
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = roomUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-header">
          <h2>Share & Collaborate</h2>
          <p className="modal-subtitle">
            Invite others to collaborate on this board in real-time
          </p>
        </div>

        <div className="share-content">
          {boardId ? (
            <>
              <div className="share-link-row">
                <input
                  className="share-link-input"
                  value={roomUrl}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button className="btn-primary" onClick={handleCopyLink}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <div className="share-actions">
                {!isCollaborating ? (
                  <button className="btn-primary btn-full" onClick={handleStartCollab} id="btn-start-collab">
                    🔴 Start Live Session
                  </button>
                ) : (
                  <button className="btn-secondary btn-full" onClick={handleStopCollab} id="btn-stop-collab">
                    ⬛ Stop Live Session
                  </button>
                )}
              </div>

              <div className="share-info">
                <p>Share the link above with collaborators. They can join the board and see changes in real-time with live cursors.</p>
              </div>
            </>
          ) : (
            <div className="share-info">
              <p>Save the board first to enable sharing. Sign in and create a board from the dashboard.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
