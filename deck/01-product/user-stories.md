# User Stories

## Drawing & Canvas

### US-001: Freehand Drawing
**As a** user, **I want to** draw freehand strokes on the canvas **so that** I can sketch ideas quickly without being constrained by shape tools.

**Acceptance Criteria:**
- Pen/mouse strokes render in real-time with < 16ms latency
- Stroke pressure sensitivity is supported (stylus input)
- Strokes are undoable/redoable
- Strokes sync to collaborators within 100ms

### US-002: Shape Creation
**As a** user, **I want to** create geometric shapes (rectangle, ellipse, diamond, line, arrow) **so that** I can build structured diagrams.

**Acceptance Criteria:**
- Click-and-drag to create shapes
- Shapes snap to grid when enabled
- Shapes have configurable stroke color, fill, width, style
- Shapes are selectable, movable, resizable, rotatable

### US-003: Text Editing
**As a** user, **I want to** add and edit text elements directly on the canvas **so that** I can label diagrams and add notes.

**Acceptance Criteria:**
- Double-click to create text element
- Inline WYSIWYG editing (no modal)
- Font size, family, alignment configurable
- Text auto-wraps within bounding box
- Text in containers (rectangles, diamonds, ellipses) auto-centers

### US-004: Canvas Navigation
**As a** user, **I want to** pan and zoom the infinite canvas **so that** I can navigate large boards efficiently.

**Acceptance Criteria:**
- Mouse wheel zooms in/out (Ctrl+scroll on Windows/Linux, Cmd+scroll on Mac)
- Middle-mouse-button drag pans
- Spacebar + drag pans
- Pinch-to-zoom on touch devices
- Zoom to fit (Ctrl+Shift+1)
- Zoom to selection (Ctrl+Shift+2)
- Minimap shows current viewport position (P2)

### US-005: Copy, Paste, Duplicate
**As a** user, **I want to** copy, paste, and duplicate elements **so that** I can reuse shapes and groups.

**Acceptance Criteria:**
- Ctrl+C / Ctrl+V copies/pastes within the board
- Ctrl+D duplicates in-place with offset
- Paste from clipboard (images, text)
- Copy to clipboard as PNG image
- Paste between boards

### US-006: Undo/Redo
**As a** user, **I want to** undo and redo my actions **so that** I can recover from mistakes.

**Acceptance Criteria:**
- Ctrl+Z undoes, Ctrl+Shift+Z / Ctrl+Y redoes
- Undo stack is unlimited within session
- Remote changes do not pollute local undo stack
- Undo/redo works correctly with collaboration (local-only history)

---

## Collaboration

### US-100: Start Collaboration Session
**As a** board owner, **I want to** invite collaborators to my board **so that** we can edit together in real time.

**Acceptance Criteria:**
- Owner generates a shareable link
- Link includes board ID and access token
- Collaborators join by navigating to the link
- Owner can set role (editor, viewer) when sharing
- Board shows all active collaborators

### US-101: See Live Cursors
**As a** collaborator, **I want to** see other users' cursor positions **so that** I know where they are working.

**Acceptance Criteria:**
- Remote cursors display with username label
- Cursor positions update at ~30 FPS
- Cursors show selected element highlight
- Cursors are color-coded per user
- Cursor updates are transmitted as volatile (no persistence)

### US-102: Follow Another User
**As a** collaborator, **I want to** follow another user's viewport **so that** I can see what they are presenting.

**Acceptance Criteria:**
- Click on user avatar to follow
- My viewport tracks theirs in real-time
- "Following" indicator is visible
- Manual interaction stops following
- No circular follow (A follows B follows A)

### US-103: Concurrent Element Editing
**As a** collaborator, **I want to** edit elements at the same time as others without conflicts **so that** collaboration is seamless.

**Acceptance Criteria:**
- Two users can move different elements simultaneously
- Two users editing the same element converge to a consistent state (CRDT)
- No data loss during concurrent edits
- Convergence is deterministic across all clients

### US-104: Board Permissions
**As a** board owner, **I want to** control who can edit vs. view my board **so that** I can share safely.

**Acceptance Criteria:**
- Roles: Owner, Editor, Viewer
- Viewers can see but not modify
- Editors can draw, edit, delete
- Owners can change roles and delete the board
- Role changes take effect immediately

### US-105: Add Comments
**As a** collaborator, **I want to** add comments to elements **so that** I can provide feedback asynchronously.

**Acceptance Criteria:**
- Right-click element → "Add comment"
- Comments are threaded (replies)
- Comments show author and timestamp
- Comments are visible as indicators on elements
- Comment panel shows all board comments

---

## Persistence & Data Management

### US-200: Autosave
**As a** user, **I want** my changes to be saved automatically **so that** I never lose work.

**Acceptance Criteria:**
- Every change is persisted to IndexedDB locally within 300ms
- Changes are synced to server within 5 seconds of last edit
- Save indicator shows status (saved/saving/error)
- No manual save button needed

### US-201: Offline Editing
**As a** user, **I want to** edit boards when offline **so that** my work is not interrupted by network issues.

**Acceptance Criteria:**
- Board loads from local cache when offline
- All drawing tools work offline
- Changes are queued for sync
- On reconnect, changes sync automatically
- Conflicts are resolved via CRDT merge (no conflicts)

### US-202: Version History
**As a** user, **I want to** view and restore previous versions of a board **so that** I can recover from unwanted changes.

**Acceptance Criteria:**
- Snapshots taken at configurable intervals (e.g., every 100 operations or 5 minutes)
- Version list shows timestamp, author, element count delta
- Preview version before restoring
- Restore creates a new version (non-destructive)

### US-203: Export Board
**As a** user, **I want to** export my board in multiple formats **so that** I can use it in other tools.

**Acceptance Criteria:**
- Export as PNG (with/without background)
- Export as SVG
- Export as PDF (P1)
- Export as JSON (portable format)
- Export selection only or entire board
- Configurable scale/DPI for raster exports

---

## Authentication & Identity

### US-300: Sign Up and Log In
**As a** new user, **I want to** create an account and log in **so that** I can access my boards securely.

**Acceptance Criteria:**
- Email/password registration with email verification
- OAuth login (Google, GitHub, Microsoft)
- Magic link login (P1)
- Session persists across browser restarts
- Logout invalidates session

### US-301: Manage Profile
**As a** user, **I want to** set my display name and avatar **so that** collaborators can identify me.

**Acceptance Criteria:**
- Editable display name
- Avatar upload or Gravatar integration
- Profile visible in collaborator list

---

## Dashboard & Organization

### US-400: Board Dashboard
**As a** user, **I want** a dashboard listing my boards **so that** I can find and access them.

**Acceptance Criteria:**
- Grid/list view of boards
- Thumbnail preview for each board
- Sort by last modified, created, name
- Search by board name
- Create new board from dashboard

### US-401: Delete Board
**As a** board owner, **I want to** delete a board **so that** I can clean up unused content.

**Acceptance Criteria:**
- Soft delete with 30-day recovery window
- Confirmation dialog before deletion
- Only owners can delete
- Collaborators are notified (P2)
