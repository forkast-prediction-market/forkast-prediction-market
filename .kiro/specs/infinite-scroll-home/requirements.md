# Requirements Document

## Introduction

Implementar infinite scroll na página home para carregar automaticamente mais cards de eventos quando o usuário rolar até o final da tela. A solução deve ser otimizada para a stack atual (Next.js 15, React 19, Supabase) e manter a performance, UX fluida e compatibilidade com os filtros existentes (search, tags, bookmarks).

## Requirements

### Requirement 1

**User Story:** Como usuário, eu quero que mais eventos sejam carregados automaticamente quando eu rolar até o final da página, para que eu possa navegar por todos os eventos sem precisar clicar em botões de paginação.

#### Acceptance Criteria

1. WHEN o usuário rolar até 200px do final da página THEN o sistema SHALL carregar automaticamente a próxima página de eventos
2. WHEN novos eventos estão sendo carregados THEN o sistema SHALL exibir um indicador de loading no final da lista
3. WHEN não há mais eventos para carregar THEN o sistema SHALL exibir uma mensagem indicando o fim da lista
4. WHEN o carregamento falhar THEN o sistema SHALL exibir uma mensagem de erro com opção de tentar novamente

### Requirement 2

**User Story:** Como usuário, eu quero que o infinite scroll funcione com todos os filtros existentes (search, tags, bookmarks), para que eu possa navegar por resultados filtrados sem limitações.

#### Acceptance Criteria

1. WHEN o usuário aplicar um filtro de search THEN o infinite scroll SHALL carregar apenas eventos que correspondem ao termo de busca
2. WHEN o usuário selecionar uma tag específica THEN o infinite scroll SHALL carregar apenas eventos dessa categoria
3. WHEN o usuário filtrar por bookmarks THEN o infinite scroll SHALL carregar apenas eventos marcados como favoritos
4. WHEN o usuário alterar qualquer filtro THEN o sistema SHALL resetar a lista e reiniciar o infinite scroll do início

### Requirement 3

**User Story:** Como usuário, eu quero que o infinite scroll mantenha boa performance mesmo com muitos eventos carregados, para que a experiência de navegação permaneça fluida.

#### Acceptance Criteria

1. WHEN mais de 100 eventos estiverem carregados THEN o sistema SHALL implementar virtualização para manter performance
2. WHEN o usuário navegar para outra página e voltar THEN o sistema SHALL preservar o estado da lista carregada
3. WHEN eventos estão sendo carregados THEN o sistema SHALL evitar requisições duplicadas
4. WHEN o componente for desmontado THEN o sistema SHALL cancelar requisições pendentes

### Requirement 4

**User Story:** Como desenvolvedor, eu quero que a implementação seja compatível com a arquitetura server-side atual, para que não quebre a funcionalidade existente de SSR e SEO.

#### Acceptance Criteria

1. WHEN a página for carregada inicialmente THEN o sistema SHALL renderizar os primeiros eventos via SSR
2. WHEN o JavaScript for desabilitado THEN o usuário SHALL ainda ver os eventos iniciais
3. WHEN bots de SEO acessarem a página THEN o sistema SHALL servir o conteúdo inicial via SSR
4. WHEN o infinite scroll for ativado THEN o sistema SHALL usar client-side rendering apenas para eventos adicionais
