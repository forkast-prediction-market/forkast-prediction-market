# Design Document

## Overview

A implementação de infinite scroll será feita através de uma abordagem híbrida que mantém a renderização server-side inicial e adiciona funcionalidade client-side para carregamento progressivo. A solução utilizará Intersection Observer API para detectar quando o usuário está próximo do final da lista e React hooks customizados para gerenciar o estado de paginação.

## Architecture

### Hybrid Rendering Strategy

- **Initial Load**: Mantém SSR atual com os primeiros 20 eventos
- **Progressive Loading**: Client-side rendering para eventos adicionais
- **State Management**: Zustand store para gerenciar estado de paginação
- **API Integration**: Extensão da API atual para suportar offset/limit

### Component Structure

```
HomePage (SSR)
├── FilterToolbar (Client)
├── EventsGridContainer (Client)
    ├── EventsGrid (Server Component - initial)
    ├── InfiniteEventsLoader (Client Component)
    └── LoadingIndicator (Client Component)
```

## Components and Interfaces

### 1. useInfiniteEvents Hook

```typescript
interface UseInfiniteEventsProps {
  initialEvents: Event[];
  tag: string;
  search: string;
  bookmarked: string;
}

interface UseInfiniteEventsReturn {
  events: Event[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
}
```

**Responsabilidades:**

- Gerenciar lista de eventos carregados
- Controlar estado de loading/error
- Implementar debounce para evitar requisições duplicadas
- Resetar estado quando filtros mudarem

### 2. useIntersectionObserver Hook

```typescript
interface UseIntersectionObserverProps {
  threshold?: number;
  rootMargin?: string;
  onIntersect: () => void;
  enabled?: boolean;
}
```

**Responsabilidades:**

- Detectar quando elemento trigger está visível
- Configurar threshold para carregamento antecipado (200px)
- Cleanup automático de observers

### 3. EventsGridContainer Component

```typescript
interface EventsGridContainerProps {
  initialEvents: Event[];
  tag: string;
  search: string;
  bookmarked: string;
}
```

**Responsabilidades:**

- Orquestrar infinite scroll
- Gerenciar transições entre estados
- Renderizar loading states e error states

### 4. InfiniteEventsLoader Component

```typescript
interface InfiniteEventsLoaderProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  isError: boolean;
}
```

**Responsabilidades:**

- Elemento trigger para intersection observer
- Renderizar estados de loading/error/fim da lista
- Botão "Try Again" para casos de erro

## Data Models

### Extended EventModel Methods

```typescript
interface ListEventsProps {
  tag: string;
  search?: string;
  userId?: string;
  bookmarked?: boolean;
  offset?: number; // Novo
  limit?: number; // Novo
}

interface ListEventsResponse {
  data: Event[];
  error: any;
  hasMore: boolean; // Novo
  total: number; // Novo
}
```

### Pagination Store (Zustand)

```typescript
interface PaginationState {
  currentPage: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  incrementPage: () => void;
  reset: () => void;
}
```

## API Integration

### Extended Events API

- **Endpoint**: `/api/events` (novo endpoint client-side)
- **Method**: GET
- **Query Params**:
  - `tag`, `search`, `bookmarked` (existentes)
  - `offset`, `limit` (novos)
- **Response**: `{ events: Event[], hasMore: boolean, total: number }`

### Database Query Optimization

```sql
-- Adicionar contagem total para hasMore calculation
SELECT
  events.*,
  COUNT(*) OVER() as total_count
FROM events
WHERE conditions...
ORDER BY created_at DESC
LIMIT ? OFFSET ?
```

## Error Handling

### Error States

1. **Network Error**: Retry button com exponential backoff
2. **No More Data**: "You've reached the end" message
3. **Filter Change**: Reset automático da lista
4. **Component Unmount**: Cancelamento de requests pendentes

### Error Recovery

```typescript
const retryWithBackoff = (attempt: number) => {
  const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
  setTimeout(() => loadMore(), delay);
};
```

## Performance Optimizations

### 1. Request Deduplication

- Debounce de 300ms para scroll events
- Flag para prevenir múltiplas requisições simultâneas
- AbortController para cancelar requests pendentes

### 2. Memory Management

- Virtualização após 100+ eventos usando react-window
- Cleanup de event listeners no unmount
- Memoização de event handlers

### 3. Caching Strategy

- Cache de 5 minutos para mesmos parâmetros de filtro
- Invalidação automática quando filtros mudam
- SWR pattern para background updates

## Testing Strategy

### Unit Tests

- `useInfiniteEvents` hook behavior
- `useIntersectionObserver` trigger logic
- Pagination state management
- Error handling scenarios

### Integration Tests

- Filter changes reset pagination
- Loading states transitions
- API integration with different parameters
- SSR + client-side hydration

### E2E Tests

- Scroll to load more events
- Filter application with infinite scroll
- Network failure recovery
- Performance with large datasets

## Implementation Phases

### Phase 1: Core Infrastructure

- Create pagination store
- Implement useIntersectionObserver hook
- Extend EventModel with pagination

### Phase 2: Component Integration

- Create EventsGridContainer
- Implement InfiniteEventsLoader
- Add client-side API endpoint

### Phase 3: Optimization & Polish

- Add virtualization for large lists
- Implement caching strategy
- Error handling improvements

### Phase 4: Testing & Refinement

- Comprehensive test coverage
- Performance optimization
- UX polish (loading animations, etc.)

## Migration Strategy

A implementação será backward-compatible:

1. Manter HomePage atual como fallback
2. Gradual rollout via feature flag
3. A/B testing para validar performance
4. Rollback plan se necessário

## SEO Considerations

- Primeiros 20 eventos sempre via SSR
- Meta tags e structured data preservados
- Sitemap inclui apenas eventos iniciais
- Canonical URLs não afetadas pelo infinite scroll
