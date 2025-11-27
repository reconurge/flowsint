# Query Key Factory Implementation

This project now uses the [@lukemorales/query-key-factory](https://tanstack.com/query/v4/docs/framework/react/community/lukemorales-query-key-factory) library to manage TanStack Query keys in a type-safe and organized way.

## Overview

Query Key Factory provides:
- **Type-safe query keys** with auto-completion
- **Centralized key management** - all keys in one place
- **Easy invalidation** - no more hardcoded key strings
- **Consistent patterns** across your application

## Files structure

```
src/api/
├── query-keys.ts          # Main query key definitions
├── query-keys-examples.ts # Usage examples and custom hooks
└── README-query-keys.md   # This documentation
```

## How to use

### 1. Basic query usage

```tsx
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { investigationService } from '@/api/investigation-service'

// Before (hardcoded keys)
const { data } = useQuery({
  queryKey: ['investigations', 'list'],
  queryFn: investigationService.get,
})

// After (using query key factory)
const { data } = useQuery({
  queryKey: queryKeys.investigations.list,
  queryFn: investigationService.get,
})
```

### 2. Dynamic Keys with Parameters

```tsx
// Before
const { data } = useQuery({
  queryKey: ['investigations', investigationId],
  queryFn: () => investigationService.getById(investigationId),
})

// After
const { data } = useQuery({
  queryKey: queryKeys.investigations.detail(investigationId),
  queryFn: () => investigationService.getById(investigationId),
})
```

### 3. Mutation with Invalidation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

const createAnalysisMutation = useMutation({
  mutationFn: analysisService.create,
  onSuccess: (data, variables) => {
    const queryClient = useQueryClient()
    
    // Invalidate specific queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.investigations.analyses(variables.investigation_id)
    })
    
    // Invalidate general lists
    queryClient.invalidateQueries({
      queryKey: queryKeys.analyses.list
    })
  },
})
```

### 4. Cache Updates

```tsx
const updateAnalysisMutation = useMutation({
  mutationFn: analysisService.update,
  onSuccess: (data, variables) => {
    const queryClient = useQueryClient()
    
    // Update cache directly for better UX
    queryClient.setQueryData(
      queryKeys.analyses.detail(variables.analysisId),
      data
    )
    
    // Invalidate related queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.analyses.byInvestigation(data.investigation_id)
    })
  },
})
```

## Available Query Keys

### Auth
- `queryKeys.auth.session`
- `queryKeys.auth.currentUser`

### Investigations
- `queryKeys.investigations.list`
- `queryKeys.investigations.detail(investigationId)`
- `queryKeys.investigations.sketches(investigationId)`
- `queryKeys.investigations.analyses(investigationId)`
- `queryKeys.investigations.flows(investigationId)`

### Sketches/Graphs
- `queryKeys.sketches.list`
- `queryKeys.sketches.detail(sketchId)`
- `queryKeys.sketches.byInvestigation(investigationId)`
- `queryKeys.sketches.graph(investigationId, sketchId)`
- `queryKeys.sketches.types`

### Analyses
- `queryKeys.analyses.list`
- `queryKeys.analyses.detail(analysisId)`
- `queryKeys.analyses.byInvestigation(investigationId)`

### Flows
- `queryKeys.flows.list`
- `queryKeys.flows.detail(flowId)`
- `queryKeys.flows.byInvestigation(investigationId)`

### Chats
- `queryKeys.chats.list`
- `queryKeys.chats.detail(chatId)`
- `queryKeys.chats.byInvestigation(investigationId)`
- `queryKeys.chats.messages(chatId)`

### API Keys
- `queryKeys.keys.list`
- `queryKeys.keys.detail(keyId)`

### Logs/Events
- `queryKeys.logs.bySketch(sketchId)`

### Action Items
- `queryKeys.actionItems`

### Scans
- `queryKeys.scans.list`
- `queryKeys.scans.detail(scanId)`

### Enrichers
- `queryKeys.enrichers.list`
- `queryKeys.enrichers.detail(enricherId)`

## Migration Guide

### Step 1: Update Existing Hooks

Find your existing `useQuery` calls and replace hardcoded keys:

```tsx
// Before
queryKey: ['investigations', 'list']

// After
queryKey: queryKeys.investigations.list
```

### Step 2: Update Mutations

Replace hardcoded invalidation keys:

```tsx
// Before
queryClient.invalidateQueries({ queryKey: ['investigations'] })

// After
queryClient.invalidateQueries({ queryKey: queryKeys.investigations.list })
```

### Step 3: Update Cache Operations

Replace hardcoded keys in `setQueryData` and `removeQueries`:

```tsx
// Before
queryClient.setQueryData(['analyses', analysisId], data)

// After
queryClient.setQueryData(queryKeys.analyses.detail(analysisId), data)
```

## Benefits

1. **Type Safety**: TypeScript will catch typos and provide autocomplete
2. **Refactoring**: Change a key structure in one place
3. **Consistency**: All keys follow the same pattern
4. **Maintainability**: Easy to see all available keys
5. **IDE Support**: Better autocomplete and IntelliSense

## Best Practices

1. **Always use the factory**: Don't hardcode query keys
2. **Group related keys**: Use the logical grouping provided
3. **Invalidate properly**: Use the exact key for invalidation
4. **Update cache**: Use `setQueryData` with the factory keys
5. **Consistent naming**: Follow the established patterns

## Troubleshooting

### Common Issues

1. **Type errors**: Make sure you're calling the key function with parameters
2. **Invalidation not working**: Ensure you're using the exact same key structure
3. **Cache updates failing**: Verify the key matches the query key exactly

### Debug Tips

1. **Console log keys**: `console.log(queryKeys.investigations.list)`
2. **Check key structure**: Compare generated keys with existing ones
3. **Verify imports**: Ensure you're importing from the correct path

## Examples

See `query-keys-examples.ts` for comprehensive usage examples including:
- Basic queries
- Mutations with invalidation
- Cache updates
- Complex invalidation patterns
- Prefetching strategies
