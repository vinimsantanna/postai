---
task: Build Auth System
responsavel: "@cipher"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - auth_strategy: Estratégia de auth (JWT + refresh tokens)
Saida: |
  - auth_endpoints: Endpoints de auth (register, login, refresh, logout)
  - jwt_config: Configuração de tokens (expiração, secrets)
  - tests: Testes de integração para auth flow
Checklist:
  - "[ ] POST /auth/register"
  - "[ ] POST /auth/login"
  - "[ ] POST /auth/refresh"
  - "[ ] POST /auth/logout"
  - "[ ] JWT access token (1h) + refresh token (7d)"
  - "[ ] Refresh tokens em PostgreSQL (rotação automática)"
  - "[ ] Rate limiting em /auth/login (5 req/min)"
  - "[ ] Testes de integração completos"
---

# *build-auth-system

CIPHER implementa sistema de autenticação com JWT e refresh tokens com rotação automática.

## Segurança

- Passwords com bcrypt (salt rounds: 12)
- JWT secret via AWS Secrets Manager
- Refresh token invalidation on logout
- Brute force protection (rate limiting)
