---
task: Provision Infrastructure
responsavel: "@nexus"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - env: Ambiente alvo (staging | production)
  - specs: Especificações de capacidade e SLAs
Saida: |
  - terraform_code: Módulos Terraform para toda a stack AWS
  - aws_resources: Lista de recursos provisionados
Checklist:
  - "[ ] Definir topologia de rede (VPC, subnets)"
  - "[ ] Provisionar compute (EC2/ECS)"
  - "[ ] Setup banco de dados (RDS PostgreSQL)"
  - "[ ] Configurar cache (ElastiCache Redis)"
  - "[ ] Setup CDN (CloudFront + S3)"
  - "[ ] Configurar secrets (Secrets Manager)"
  - "[ ] Implementar backups automatizados"
  - "[ ] Validar com terraform plan antes de apply"
---

# *provision-infrastructure

NEXUS provisiona toda a infraestrutura AWS via Terraform (100% IaC, zero manual).

## Stack AWS

- VPC com subnets públicas e privadas
- ECS Fargate para a aplicação
- RDS PostgreSQL Multi-AZ
- ElastiCache Redis
- S3 + CloudFront
- AWS Secrets Manager
- Route 53 + ACM (SSL)

## Targets

- Uptime: 99.99%
- RTO (Recovery Time Objective): <30 min
- RPO (Recovery Point Objective): <1 hora
