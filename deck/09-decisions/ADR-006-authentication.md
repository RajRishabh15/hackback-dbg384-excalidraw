# ADR-006: Identity, Authentication & Multi-Tenancy

## Status
Accepted

## Context
Excalidraw OSS has zero user authentication or tenant isolation, relying exclusively on unauthenticated random room keys in URLs. Enterprise and engineering teams require robust identity, SSO integration, workspace partitioning, and fine-grained permissions.

## Decision
We select **OAuth2 / OpenID Connect (OIDC)** with **Short-Lived Asymmetric JWTs + HttpOnly Refresh Cookies** and **PostgreSQL Row-Level Security (RLS)**.

## Alternatives Considered
1. **Anonymous Random Room Keys (Excalidraw OSS baseline)**:
   - *Rejected*: Zero accountability, high risk of link interception, unmanageable data governance.
2. **Stateful Server-Side Sessions in Redis**:
   - *Rejected*: Incurs Redis network hop on every API and WebSocket authorization check; harder to scale across edge proxies compared to stateless JWT validation.
3. **API Keys Only**:
   - *Rejected*: Inadequate for interactive web clients; susceptible to credential exposure.

## Consequences
- Supports enterprise Single Sign-On (Google Workspace, GitHub, Okta, SAML 2.0).
- Stateless access token verification at the WebSocket gateway provides sub-millisecond connection handshakes.
