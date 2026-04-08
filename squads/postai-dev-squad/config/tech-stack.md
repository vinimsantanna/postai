# Tech Stack — postai-dev-squad

## Backend

- **Runtime:** Node.js 20 LTS + TypeScript
- **Framework:** Express.js ou Fastify
- **Database:** PostgreSQL 15 (AWS RDS)
- **Cache:** Redis (AWS ElastiCache)
- **ORM:** Prisma

## Mensageria / Bot

- **WhatsApp:** Evolution API (webhook receiver)
- **State Machine:** XState ou implementação customizada
- **Queue:** BullMQ (Redis-based)

## Integrações Sociais

- **Instagram:** Meta Graph API v18+
- **TikTok:** TikTok API for Developers
- **LinkedIn:** LinkedIn API v2
- **YouTube:** YouTube Data API v3

## Orquestração

- **Workflows:** n8n (self-hosted ou cloud)
- **Parallel publishing:** Promise.allSettled pattern

## Cloud & Infra

- **Cloud:** AWS (EC2, RDS, S3, CloudFront, ElastiCache)
- **IaC:** Terraform
- **Containers:** Docker
- **Secrets:** AWS Secrets Manager

## CI/CD

- **Pipeline:** GitHub Actions
- **Registry:** Amazon ECR
- **Deploy:** ECS Fargate ou EC2 Auto Scaling

## Monitoring & Observability

- **Error tracking:** Sentry
- **Metrics:** DataDog ou AWS CloudWatch
- **Logs:** CloudWatch Logs
- **Uptime:** AWS Route 53 Health Checks

## Billing & Pagamentos

- **Payments:** Stripe
- **Subscriptions:** Stripe Billing

## AI

- **LLM:** Claude API (Anthropic) para copy optimization

## Testes

- **Unit:** Jest + ts-jest
- **Integration:** Supertest
- **Load:** k6 ou Artillery
- **API:** Postman / Newman

## Compliance

- **LGPD:** Conformidade total com dados brasileiros
- **SSL/TLS:** Certificados gerenciados pela AWS ACM
- **Auth:** JWT + refresh tokens
