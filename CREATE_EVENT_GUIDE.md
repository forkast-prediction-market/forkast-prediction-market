# 🎯 Guia de Criação de Eventos/Mercados

Este guia explica como usar a nova funcionalidade de criação de eventos e mercados na plataforma Forkast.

## 📋 Visão Geral

A página `/create-event` permite que administradores criem novos eventos com seus respectivos mercados de predição. O sistema automaticamente:

1. ✅ Valida todos os campos obrigatórios
2. 💾 Salva evento e mercados no banco de dados
3. 🏗️ Gera IDs únicos para blockchain
4. ⛓️ Prepara para deploy automático na blockchain
5. 📦 Processa imagens via Irys/Arweave

## 🔧 Configuração Necessária

### 1. Variáveis de Ambiente

Adicione as variáveis do final deste arquivo para `.env` e configure:

```bash
# Banco de dados
POSTGRES_URL=postgresql://user:pass@localhost:5432/forkast

# Autenticação
BETTER_AUTH_SECRET=sua-chave-secreta-32-chars

# Blockchain (Polygon Amoy Testnet)
BLOCKCHAIN_PRIVATE_KEY=0x...
CONTRACT_UMA_ADAPTER=0xDde785fc1311ab3D4C71aa216dDe6Aa27b6bcC4b

# Sistema de deploy
FORKAST_SYNCER_PATH=/caminho/para/forkast-market-syncer

# Frontend
NEXT_PUBLIC_UMA_ADAPTER_ADDRESS=0xDde785fc1311ab3D4C71aa216dDe6Aa27b6bcC4b
```

### 2. Banco de Dados

Execute o schema do `forkast-market-syncer`:

```bash
cd /caminho/para/forkast-market-syncer
psql $DATABASE_URL < schema.sql
```

### 3. Sistema de Deploy

O frontend integra com o `forkast-market-syncer` para deploy na blockchain:

```bash
# Clone o market syncer
git clone https://github.com/seu-repo/forkast-market-syncer
cd forkast-market-syncer
npm install

# Configure .env do syncer
cp .env.example .env
# Edite com suas configurações

# Teste deploy manual
npm run blockchain:deploy 0
```

## 🎯 Como Usar

### 1. Acesse a Página

⚠️ **Apenas para administradores**: Digite diretamente na URL

```
https://seu-site.com/create-event
```

### 2. Preencha as Informações do Evento

#### 📅 Campos Obrigatórios do Evento:
- **Título do Evento**: Nome principal (ex: "Eleições Presidenciais 2024")
- **Descrição**: Regras e contexto do evento
- **Data de Início**: Quando o evento começa
- **Data de Fim**: Quando o evento termina
- **Ícone**: URL da imagem do evento

#### 🏷️ Tags do Evento:
- Adicione pelo menos uma tag
- Use para categorização (ex: "Política", "Esportes")
- Slugs são gerados automaticamente

### 3. Configure os Mercados

#### 📊 Campos Obrigatórios por Mercado:
- **Pergunta**: A questão do mercado (ex: "Quem será eleito?")
- **Descrição**: Regras específicas de resolução
- **Data de Fim**: Quando o mercado fecha
- **Ícone**: URL da imagem do mercado
- **Outcomes**: Pelo menos 2 opções (ex: "Sim", "Não")

#### ➕ Mercados Dinâmicos:
- Adicione quantos mercados quiser
- Cada mercado pode ter outcomes diferentes
- Remova mercados desnecessários

### 4. Validação e Submissão

O sistema valida automaticamente:
- ✅ Todos os campos obrigatórios
- ✅ Datas lógicas (fim > início)
- ✅ Pelo menos 2 outcomes por mercado
- ✅ Slugs únicos (não duplicados)
- ✅ URLs válidas para imagens

## ⛓️ Deploy na Blockchain

### Processo Automático

Após criar o evento:

1. 💾 **Salvamento**: Evento e mercados salvos no banco
2. 🆔 **IDs Únicos**: Condition IDs gerados para blockchain
3. 🚀 **Deploy Queue**: Markets adicionados à fila de deploy
4. ⛓️ **Blockchain**: Deploy automático via UMA + ConditionalTokens
5. 📦 **Arweave**: Metadados e imagens processados via Irys

### Monitoramento

```bash
# Ver logs do deploy
cd /caminho/para/forkast-market-syncer
tail -f logs/combined.log

# Deploy manual se necessário
npm run blockchain:deploy events nome-do-evento
```

## 📝 Estrutura de Dados

### Evento Criado:
```sql
INSERT INTO events (
  event_id,     -- Slug único
  slug,         -- URL slug
  title,        -- Título
  description,  -- Descrição
  start_date_iso, end_date_iso,
  icon,         -- URL do ícone
  tags,         -- JSONB com tags
  show_market_icons,
  active,       -- true
  markets_count -- Quantidade de markets
)
```

### Markets Criados:
```sql
INSERT INTO markets (
  condition_id,    -- ID único para blockchain (gerado)
  question,        -- Pergunta
  description,     -- Descrição
  market_slug,     -- Slug único
  end_date_iso,    -- Data de fim
  icon,            -- URL do ícone
  deploy_strategy, -- 'native'
  oracle_type,     -- 'native'
  resolved_by,     -- Endereço do UMA adapter
  event_id,        -- FK para events
  active           -- true
)
```

### Outcomes Criados:
```sql
INSERT INTO outcomes (
  market_id,    -- FK para markets
  token_id,     -- ID único do token
  outcome,      -- Nome da opção
  price,        -- 0.5 (neutro)
  winner        -- false
)
```

## 🔍 Troubleshooting

### Erro: "Slug já existe"
- Mude o título do evento/mercado
- Slug será regenerado automaticamente

### Erro: "Sistema de deploy não configurado"
- Configure `FORKAST_SYNCER_PATH` no `.env`
- Verifique se o path está correto

### Erro: "Banco de dados"
- Verifique `POSTGRES_URL`
- Execute as migrações do schema
- Teste conexão manual

### Deploy não executa
- Verifique `BLOCKCHAIN_PRIVATE_KEY`
- Confirme saldo de POL na carteira
- Teste deploy manual primeiro

## 🔐 Segurança

### Acesso Restrito
- Página não tem link na interface
- Apenas administradores devem acessar
- Considere adicionar autenticação extra

### Chaves Privadas
- Use carteira dedicada para deploy
- Nunca compartilhe `BLOCKCHAIN_PRIVATE_KEY`
- Mantenha saldo mínimo necessário

### Validação
- Todos os inputs são validados
- Slugs verificados por duplicação
- URLs de imagem validadas

## 📊 Monitoramento

### Logs Importantes
```bash
# Criação de eventos
tail -f logs/app.log | grep "create-event"

# Deploy blockchain
tail -f forkast-market-syncer/logs/combined.log

# Erros específicos
tail -f logs/error.log
```

### Métricas
- Eventos criados por dia
- Taxa de sucesso do deploy
- Tempo médio de processamento
- Erros por tipo

## 🚀 Próximos Passos

### Melhorias Futuras:
1. 🎨 Preview do evento antes de criar
2. 📊 Dashboard de monitoramento
3. 🔄 Re-deploy automático em caso de falha
4. 📱 Interface mobile otimizada
5. 🎯 Templates de eventos comuns

### Integração:
1. 🔗 Link na interface admin
2. 🔐 Sistema de permissões
3. 📧 Notificações de deploy
4. 📈 Analytics de uso

---

## 📞 Suporte

Em caso de problemas:

1. 📋 Verifique este guia
2. 🔍 Consulte os logs
3. 🧪 Teste em ambiente local
4. 💬 Entre em contato com o time técnico

**Lembre-se**: Esta funcionalidade é crítica para o negócio. Teste sempre em ambiente de desenvolvimento antes de usar em produção! 🚨

# =============================================================================
# FORKAST PREDICTION MARKET - CONFIGURAÇÃO COMPLETA
# =============================================================================

# -----------------------------------------------------------------------------
# 🗄️ DATABASE - Banco de dados PostgreSQL
# -----------------------------------------------------------------------------
POSTGRES_URL=postgresql://username:password@localhost:5432/forkast_db

# -----------------------------------------------------------------------------
# 🔐 AUTHENTICATION - Autenticação Better Auth
# -----------------------------------------------------------------------------
BETTER_AUTH_SECRET=your-super-secret-key-32-chars-min

# -----------------------------------------------------------------------------
# 🌐 SITE CONFIGURATION - Configuração do site
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SITE_NAME=Forkast Prediction Market
NEXT_PUBLIC_SITE_DESCRIPTION=Decentralized prediction market platform
NEXT_PUBLIC_SITE_LOGO_SVG=<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/></svg>

# -----------------------------------------------------------------------------
# 🔗 WALLET CONNECTION - Conexão com carteiras
# -----------------------------------------------------------------------------
NEXT_PUBLIC_REOWN_APPKIT_PROJECT_ID=your-reown-project-id

# -----------------------------------------------------------------------------
# 📊 ANALYTICS - Google Analytics (opcional)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_GOOGLE_ANALYTICS=G-XXXXXXXXXX

# -----------------------------------------------------------------------------
# 🚀 DEPLOYMENT - Configuração de deploy
# -----------------------------------------------------------------------------
VERCEL_PROJECT_PRODUCTION_URL=your-domain.com
CRON_SECRET=your-cron-secret-key

# -----------------------------------------------------------------------------
# ⛓️ BLOCKCHAIN CONFIGURATION - Configuração da blockchain
# -----------------------------------------------------------------------------
# Polygon Amoy Testnet (padrão)
BLOCKCHAIN_CHAIN_ID=80002
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology

# Contratos inteligentes (endereços padrão do Amoy)
CONTRACT_CONDITIONAL_TOKENS=0xEb06C122EDb2A65C65d0A1323263fFf0cD383Eb8
CONTRACT_CTF_EXCHANGE=0x006ce6484eA6114fB0D4F26660de0F37d35001Ba
CONTRACT_UMA_ADAPTER=0xDde785fc1311ab3D4C71aa216dDe6Aa27b6bcC4b
CONTRACT_USDC_TOKEN=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582

# Chave privada da carteira para deploy (NUNCA COMPARTILHE!)
BLOCKCHAIN_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Configurações de gas
BLOCKCHAIN_GAS_LIMIT=500000
BLOCKCHAIN_GAS_PRICE=30

# -----------------------------------------------------------------------------
# 🗄️ IRYS/ARWEAVE CONFIGURATION - Armazenamento descentralizado
# -----------------------------------------------------------------------------
IRYS_NETWORK=devnet
IRYS_TOKEN=pol
IRYS_GATEWAY=https://gateway.irys.xyz
IRYS_RPC_URL=https://rpc-mumbai.maticvigil.com
IRYS_TIMEOUT=30000

# -----------------------------------------------------------------------------
# 🔄 SYNC CONFIGURATION - Sincronização com APIs externas
# -----------------------------------------------------------------------------
# Polymarket CLOB API
CLOB_API_URL=https://clob.polymarket.com
API_REQUEST_DELAY_MS=1000
API_RATE_LIMIT_PER_MINUTE=60

# Intervalos de sincronização (em minutos)
SYNC_MARKETS_INTERVAL=15
SYNC_OUTCOMES_INTERVAL=30
SYNC_GAMMA_EVENTS_INTERVAL=15
SYNC_RESOLUTIONS_INTERVAL=60
SYNC_HEALTH_CHECK_INTERVAL=5

# Habilitar sincronização de eventos Gamma
ENABLE_GAMMA_EVENT_SYNC=true

# -----------------------------------------------------------------------------
# 🔧 SYSTEM CONFIGURATION - Configuração do sistema
# -----------------------------------------------------------------------------
# Nível de log (debug, info, warn, error)
LOG_LEVEL=info
LOG_FILE=/path/to/logs/app.log

# Caminho para o sistema de deploy (market syncer)
FORKAST_SYNCER_PATH=/path/to/forkast-market-syncer

# -----------------------------------------------------------------------------
# 🎯 FRONTEND ESPECÍFICO - Configurações específicas do frontend
# -----------------------------------------------------------------------------
# Endereço do adaptador UMA para markets nativos
NEXT_PUBLIC_UMA_ADAPTER_ADDRESS=0xDde785fc1311ab3D4C71aa216dDe6Aa27b6bcC4b

# URL da API do market syncer (para status e deploy)
NEXT_PUBLIC_SYNCER_API_URL=http://localhost:3001

# Configuração de rede para frontend
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
