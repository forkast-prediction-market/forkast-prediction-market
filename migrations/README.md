# 🔄 Database Migrations

Este diretório contém as migrations do banco de dados para o sistema Forkast Prediction Market.

## 📁 Estrutura

```
migrations/
├── 001.do.sql      # Schema inicial (tabelas principais)
├── 001.undo.sql    # Rollback do schema inicial
├── 002.do.sql      # Índices de performance
├── 002.undo.sql    # Rollback dos índices
├── 003.do.sql      # Triggers e funções
├── 003.undo.sql    # Rollback de triggers e funções
├── 004.do.sql      # Views e Row Level Security
├── 004.undo.sql    # Rollback de views e RLS
├── 005.do.sql      # Permissões e dados iniciais
├── 005.undo.sql    # Rollback de permissões e dados
├── 006.do.sql      # Setup do storage bucket
├── 006.undo.sql    # Rollback do storage bucket
└── README.md       # Este arquivo
```

## 🚀 Como Funciona

### Para Forks Leigos (Deploy Automático)

1. **Fork o repositório**
2. **Deploy na Vercel** com as variáveis de ambiente:
   - `POSTGRES_URL` - URL do banco Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` - Chave do service role
   - `CRON_SECRET` - Secret para cron jobs (gere aleatoriamente)

3. **Pronto!** O banco será inicializado automaticamente no primeiro deploy

### Para Desenvolvedores

#### Executar Migrations Manualmente

```bash
# Verificar status das migrations
curl "https://seu-fork.vercel.app/api/migrate?status=true"

# Ver migrations pendentes (dry run)
curl "https://seu-fork.vercel.app/api/migrate?dry_run=true"

# Executar migrations pendentes
curl -H "Authorization: Bearer $CRON_SECRET" \
     "https://seu-fork.vercel.app/api/migrate"

# Rollback para versão específica
curl "https://seu-fork.vercel.app/api/migrate?rollback=3"
```

#### Setup Inicial

```bash
# Verificar se banco está inicializado
curl "https://seu-fork.vercel.app/api/setup-db?check=true"

# Inicializar banco do zero
curl "https://seu-fork.vercel.app/api/setup-db"
```

## 🛠️ Adicionando Novas Migrations

### 1. Criar arquivos numerados sequencialmente:

```sql
-- 007.do.sql
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
CREATE INDEX idx_users_preferences ON users USING GIN (preferences);
```

```sql
-- 007.undo.sql
DROP INDEX IF EXISTS idx_users_preferences;
ALTER TABLE users DROP COLUMN IF EXISTS preferences;
```

### 2. Testar localmente:

```bash
npm run dev
curl "http://localhost:3000/api/migrate?dry_run=true"
curl "http://localhost:3000/api/migrate"
```

### 3. Fazer commit e push:

```bash
git add migrations/007.*
git commit -m "feat: add user preferences table"
git push origin main
```

## 🔄 Fluxo para Forks

### Atualizações Automáticas

1. **Fork puxa changes** do repo principal (via GitHub Actions)
2. **Cron job** roda diariamente às 2h (`0 2 * * *`)
3. **Migrations** são aplicadas automaticamente
4. **Logs** ficam disponíveis no Vercel Dashboard

### Monitoramento

- **Status**: `GET /api/migrate?status=true`
- **Health Check**: `GET /api/setup-db?check=true`
- **Logs**: Vercel Functions Dashboard

## 🔒 Segurança

- **Cron Secret**: Protege endpoints de execução automática
- **Service Role**: Usado para operações privilegiadas no banco
- **RLS**: Row Level Security ativo em todas as tabelas
- **Transactions**: Cada migration roda em transação atômica

## 📊 Monitoramento

### Status Response Example:

```json
{
  "success": true,
  "status": {
    "currentVersion": "6",
    "pendingMigrations": [],
    "totalMigrations": 6
  },
  "message": "Migration status retrieved successfully"
}
```

### Migration Response Example:

```json
{
  "success": true,
  "appliedMigrations": [
    { "name": "007.do.sql", "version": "7" }
  ],
  "message": "✅ Successfully applied 1 migrations"
}
```

## 🔧 Troubleshooting

### Migration Falhou?

1. **Verificar logs** no Vercel Dashboard
2. **Rollback** se necessário: `GET /api/migrate?rollback=X`
3. **Re-executar**: `GET /api/migrate`

### Banco Corrompido?

1. **Backup** via Supabase Dashboard
2. **Reset completo**: `POST /api/setup-db { "force": true }`
3. **Restaurar dados** se necessário

### Fork Não Atualiza?

1. **Verificar GitHub Actions** no fork
2. **Forçar sync**: Executar workflow manualmente
3. **Verificar Vercel deploy** após sync

## 🎯 Objetivos Atingidos

✅ **Zero Config** para forks leigos
✅ **Auto-update** em pulls do upstream
✅ **Rollback** quando necessário
✅ **Monitoramento** completo
✅ **Atomicidade** de operações
✅ **Compatibilidade** com Vercel + Supabase
