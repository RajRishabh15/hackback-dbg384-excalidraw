# User Personas

## Persona 1: Alex — Software Engineer (Remote)

**Demographics**: 28, senior frontend engineer, works at a 200-person SaaS company, fully remote  
**Tech Savvy**: High — uses Figma, VS Code, CLI tools daily

### Goals
- Quickly sketch system architecture diagrams with teammates
- Whiteboard during sprint planning and retrospectives
- Document technical decisions visually
- Share diagrams with non-engineers (product, design)

### Pain Points
- Miro is slow to load and expensive per-seat
- Excalidraw has no authentication — can't trust it with proprietary architecture
- Google Jamboard was discontinued
- FigJam is tied to Figma licenses

### Required Features
- Real-time collaboration with 5-15 team members
- Keyboard shortcuts for rapid diagramming
- Export to PNG/SVG for embedding in docs
- Board-level permissions (some diagrams are sensitive)
- Self-hostable for IP-sensitive companies

### Security Expectations
- OAuth/SSO login (company Google Workspace)
- Board access restricted to invited members only
- No data stored on third-party servers without consent

---

## Persona 2: Maria — Product Designer

**Demographics**: 32, lead product designer, hybrid work, design agency  
**Tech Savvy**: Medium-High — Figma, Sketch, Notion power user

### Goals
- Run design workshops with clients (10-20 participants)
- Create user journey maps and wireframe sketches
- Brainstorm ideas with sticky notes and voting
- Present ideas in a visual, low-fidelity format

### Pain Points
- Mural pricing is prohibitive for client workshops
- Excalidraw lacks comments and structured permissions
- No way to organize boards into projects
- Can't restrict client access to view-only

### Required Features
- Guest access via link (no signup required for clients)
- View-only mode with cursor following
- Comments and annotations
- Board templates for recurring workshop formats
- PDF export for client deliverables

### Security Expectations
- Client data stays on the designer's infrastructure
- Share links expire after workshop
- View-only guests cannot modify content

---

## Persona 3: Prof. James — University Educator

**Demographics**: 45, computer science professor, teaches distributed systems  
**Tech Savvy**: Medium — comfortable with terminal but prefers simple tools

### Goals
- Draw diagrams during live lectures (50-200 students)
- Let students collaboratively solve problems on a shared board
- Save lecture boards for students to review later
- Use presentation mode for clean visual delivery

### Pain Points
- University IT won't approve tools with unclear data policies
- Excalidraw rooms are anonymous — students can grief/vandalize
- No way to restrict who can draw vs. who can only watch
- Performance degrades with 50+ concurrent viewers

### Required Features
- Presentation mode (spotlight, follow-me)
- Role-based access: instructor draws, students view
- Ability to selectively enable student editing
- Board history to review student contributions
- Works on university WiFi (no exotic protocols)

### Security Expectations
- FERPA-compatible (no student data leaks)
- Self-hostable on university infrastructure
- Audit trail of who drew what

---

## Persona 4: Priya — Engineering Manager (Enterprise)

**Demographics**: 38, VP of Engineering, Fortune 500 fintech company  
**Tech Savvy**: Medium — evaluates tools, doesn't build with them

### Goals
- Standardize visual collaboration across 500-person engineering org
- Replace ad-hoc Miro/whiteboard usage with a governed platform
- Enable architecture reviews and incident retrospectives
- Integrate with existing SSO and compliance infrastructure

### Pain Points
- Miro doesn't meet SOC 2 requirements for some data types
- Excalidraw has no enterprise features (SSO, audit, RBAC)
- Shadow IT — teams use random tools with no governance
- Cost of Miro/Mural at enterprise scale is significant

### Required Features
- SAML/OIDC SSO integration
- Workspace administration and member management
- Audit logging for compliance
- Data residency control (self-hosted)
- API for integration with internal tools

### Security Expectations
- SOC 2 Type II alignment
- Encryption at rest and in transit
- Role-based access control with least privilege
- Incident response capability
- Regular dependency vulnerability scanning

---

## Persona 5: Diego — Startup CTO

**Demographics**: 30, co-founder/CTO, 8-person startup, fully remote  
**Tech Savvy**: Very High — builds infrastructure, contributes to OSS

### Goals
- Quick whiteboarding with co-founders and investors
- System design sessions with small engineering team
- Rapid prototyping of UX ideas
- Self-host to avoid vendor dependencies

### Required Features
- Docker one-command deployment
- Lightweight resource footprint
- Offline-first (works on flights)
- API access for programmatic board creation
- Open-source with permissive license

### Security Expectations
- Full data ownership (self-hosted)
- No telemetry/tracking without consent
- Secure defaults out of the box

---

## Persona 6: Kenji — Distributed Team Lead

**Demographics**: 35, leads a 12-person team across 4 time zones  
**Tech Savvy**: High

### Goals
- Async collaboration — team members contribute at different times
- Visual standup boards updated throughout the day
- Onboarding new team members with visual documentation

### Required Features
- Offline editing with reliable sync
- Activity history (who changed what)
- Comments for async discussion
- Version history to see board evolution
- Notifications when collaborators make changes (P2)

### Security Expectations
- Per-board access control
- Encrypted data in transit and at rest
