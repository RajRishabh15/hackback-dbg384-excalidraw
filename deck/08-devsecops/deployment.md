# Deployment Architecture & Infrastructure Topology

## 1. Multi-Stage Dockerfile (`Dockerfile.production`)

A minimal, secure, non-root Distroless container topology:

```dockerfile
# Stage 1: Dependency resolution and compilation
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json yarn.lock ./
COPY packages/ ./packages/
COPY apps/ ./apps/
RUN yarn install --frozen-lockfile
RUN yarn build

# Stage 2: Production runtime image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER appuser
EXPOSE 3000 4000
CMD ["node", "dist/apps/api/server.js"]
```

---

## 2. Infrastructure as Code (Kubernetes Deployment Spec)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whiteboard-realtime
  namespace: production
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: whiteboard-realtime
  template:
    metadata:
      labels:
        app: whiteboard-realtime
    spec:
      containers:
        - name: realtime-server
          image: registry.whiteboard.domain/realtime:1.0.0
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2048Mi
          ports:
            - containerPort: 4000
          readinessProbe:
            httpGet:
              path: /healthz
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /healthz
              port: 4000
            initialDelaySeconds: 10
            periodSeconds: 15
          envFrom:
            - secretRef:
                name: whiteboard-secrets
            - configMapRef:
                name: whiteboard-config
```

---

## 3. Zero-Downtime WebSocket Rolling Deployments

Deploying new versions of a persistent WebSocket server requires careful connection migration:
1. **Graceful Drain Hook**: On `SIGTERM`, server enters draining state. Stops accepting new connections.
2. **Client Reconnect Signal**: Server sends control frame `0x06` (`SERVER_DRAIN`) notifying active clients to initiate background reconnect to sibling nodes.
3. **Flushing & Teardown**: Server flushes pending snapshots to PostgreSQL within 30 seconds before termination.
