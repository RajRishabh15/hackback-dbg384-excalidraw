# DevSecOps & CI/CD Pipeline Architecture

## 1. Pipeline Principles & Automated Gates

Every commit and pull request must traverse strict automated gates ensuring code quality, type safety, test coverage, and vulnerability resistance prior to staging and production deployment.

```
┌────────────────────────────────────────────────────────┐
│ Pull Request Opened                                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 1: Quality & Type Safety                         │
│ - ESLint / Prettier code format check                  │
│ - TypeScript compiler check (`tsc --noEmit`)           │
├────────────────────────────────────────────────────────┤
│ Stage 2: Security & Vulnerability Scanning             │
│ - Gitleaks (Secret token detection)                    │
│ - Snyk / Dependabot (Known CVE dependency audit)       │
│ - Semgrep SAST (Static Application Security Testing)   │
├────────────────────────────────────────────────────────┤
│ Stage 3: Testing Pyramid Execution                     │
│ - Vitest Unit Tests (Algorithm, CRDT math, utils)      │
│ - Supertest Integration Tests (Fastify REST endpoints) │
│ - WebSocket Simulation Tests (Concurrency, RBAC gates) │
├────────────────────────────────────────────────────────┤
│ Stage 4: Production Build & Asset Verification         │
│ - Vite 6 Production Build (Rollup bundle analysis)     │
│ - Bundlesize budget verification (< 250 KB JS)         │
├────────────────────────────────────────────────────────┤
│ Stage 5: Container Hardening & Image Scanning          │
│ - Multi-stage Docker build (Distroless / Alpine node)  │
│ - Trivy container vulnerability scan (Zero High/Crit)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Staging Deployment & Automated E2E Smoke Tests         │
│ - Playwright End-to-End Canvas Tests                   │
│ - Chrome DevTools Performance Profiling (60 FPS gate)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Production Rolling Deployment (Canary / Blue-Green)    │
└────────────────────────────────────────────────────────┘
```

---

## 2. GitHub Actions Workflow Configuration (`.github/workflows/ci.yml`)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'yarn'
      - run: yarn install --frozen-lockfile
      - run: yarn lint
      - run: yarn typecheck

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Detect Secrets
        uses: gitleaks/gitleaks-action@v2
      - name: SAST Code Analysis
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/owasp-top-ten
            p/javascript

  unit-and-integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: whiteboard_test
          POSTGRES_PASSWORD: secretpassword
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'yarn'
      - run: yarn install --frozen-lockfile
      - run: yarn test:coverage
      - name: Enforce Coverage Thresholds
        run: yarn test:coverage --check-coverage --lines 85 --branches 80

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: yarn install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: yarn test:e2e
```
