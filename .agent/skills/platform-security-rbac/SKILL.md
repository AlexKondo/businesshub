---
name: platform-security-rbac
description: Regras obrigatórias de segurança, multi-tenancy e RBAC para a plataforma Enterprise SaaS (Supplier Portal / SRM / eProc). Usar sempre que for criar migrations, tabelas, políticas RLS, endpoints, Edge Functions, telas de admin/permissões, integrações n8n/webhooks ou qualquer código que toque em dados de tenants, fornecedores, contratos, documentos ou usuários.
---

# Segurança e RBAC — regras não-negociáveis

## 1. Multi-tenancy — regra fundamental
- Toda tabela de negócio tem `tenant_id uuid NOT NULL` referenciando `companies(id)`.
- Nunca usar `supplier_id`, `company_id` de request ou qualquer valor vindo do cliente como base de autorização — apenas o `tenant_id` resolvido do JWT no backend.
- Toda policy RLS checa tenant antes de checar role.
- Índice composto `(tenant_id, id)` em toda tabela multi-tenant.
- Um fornecedor nunca enxerga dado de outro fornecedor, mesmo via IDOR — garantido pelo banco, não pela UI.

## 2. RLS — regras não-negociáveis
- Nunca desabilitar RLS, nem temporariamente.
- Toda tabela nova nasce com RLS habilitada no mesmo commit que a cria; sem policy = sem acesso (fail closed).
- Policies separadas de SELECT/INSERT/UPDATE/DELETE quando a regra difere entre elas.
- Toda policy nova exige teste automatizado de acesso cruzado entre tenants antes de ser considerada pronta.
- Verificar performance da policy (`EXPLAIN ANALYZE`) com volume simulado.

## 3. RBAC — modelo de referência
- Separar sempre Role, Permission e o mapeamento Role→Permission; nunca colapsar os três conceitos.
- Tabelas mínimas: `roles(id, tenant_id nullable, name, is_system_role)`, `permissions(id, key, description)`, `role_permissions(role_id, permission_id)`, `memberships(user_id, tenant_id, role_id)`.
- Toda checagem de autorização no backend é por permission, nunca por nome de role hardcoded.
- UI pode esconder/mostrar com base em permission, mas isso é UX — o backend/RLS sempre revalida.

## 4. Autenticação preparada para federação
- Modelo "user" separado de "identity" desde o início.
- Nunca senha em texto puro; usar Supabase Auth.
- Mapear claims de IdP (grupos do Azure AD etc.) para roles internas via tabela explícita, nunca confiar cegamente no claim do provedor.
- JWT de curta duração + refresh rotativo; revogar sessão em troca de senha, remoção de membership ou desativação de usuário.

## 5. Superfícies de ataque específicas do projeto
- Upload de documentos: validar MIME real, limitar tamanho, URL assinada com expiração, nunca bucket público.
- n8n/webhooks/agentes de IA: credenciais de menor escopo possível por workflow; nunca reusar `service_role` key exposta; todo webhook exige HMAC/token secreto; agente nunca tem permissão maior que o usuário que o invocou.
- SQL injection: proibido concatenar SQL; usar client parametrizado ou `format()` com `%I`/`%L`.
- XSS: nunca `dangerouslySetInnerHTML` com conteúdo não sanitizado.
- CSRF: `SameSite=Strict/Lax` + token CSRF se usar cookies de sessão.
- Rate limiting em rotas de auth e Edge Functions públicas.
- Segredos nunca commitados; `service_role` key nunca chega ao client.

## 6. Auditoria e LGPD
- `audit_logs` para toda ação de escrita em entidades sensíveis (quem, quando, tenant, ação, entidade, IP).
- Soft delete em entidades com valor de auditoria/contrato.
- Mapear base legal, retenção e caminho técnico de exclusão/anonimização desde a Fase 1.

## 7. Checklist antes de aprovar qualquer PR/fase
- [ ] RLS habilitada e testada com tenant cruzado em toda tabela nova
- [ ] Nenhuma autorização depende de dado vindo do client
- [ ] Toda checagem de acesso usa permission, não role hardcoded
- [ ] Nenhum segredo/service_role exposto ao client ou a workflow n8n desnecessário
- [ ] Uploads validados (tipo, tamanho, URL assinada)
- [ ] Audit log gravado para ações sensíveis
- [ ] Rate limit em rotas de auth
