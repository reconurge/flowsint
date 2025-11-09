# Analysis Components Architecture

This directory contains the refactored analysis components that provide reusable functionality for editing analyses.

## Components

### `AnalysisEditor` (Core Component)
The main reusable component that contains all analysis editing logic.

**Props:**
- `analysis: Analysis | null` - The current analysis to edit
- `investigationId: string` - The investigation ID
- `onAnalysisUpdate?: (analysis: Analysis) => void` - Callback when analysis is updated
- `onAnalysisDelete?: (analysisId: string) => void` - Callback when analysis is deleted
- `onAnalysisCreate?: (investigationId: string) => void` - Callback when New analysis is created
- `onAnalysisSelect?: (analysisId: string) => void` - Callback when analysis is selected from dropdown
- `showHeader?: boolean` - Whether to show the header (default: true)
- `showActions?: boolean` - Whether to show action buttons (default: true)
- `showAnalysisSelector?: boolean` - Whether to show analysis dropdown selector (default: false)
- `showNavigation?: boolean` - Whether to show navigation button (default: false)
- `className?: string` - Additional CSS classes
- `isLoading?: boolean` - Loading state
- `isRefetching?: boolean` - Refetching state
- `analyses?: Analysis[]` - List of analyses for selector dropdown
- `currentAnalysisId?: string | null` - Current analysis ID for selector

**Features:**
- Rich text editing with TipTap
- AI prompt integration with context
- Save/delete/create operations
- Keyboard shortcuts (Ctrl+S to save, Ctrl+E for AI prompt)
- Title editing
- Analysis selector dropdown
- Navigation controls
- External link to full page
- Context-aware AI prompts

### `AnalysisPanel` (Panel Component)
A panel component that uses `AnalysisEditor` with analysis selection functionality.

**Features:**
- Analysis selector dropdown
- Integration with analysis panel store
- Navigation to full-page view
- All original action buttons (Save, AI Chat, New analysis, Delete, Open in Page)

### `AnalysisPage` (Full Page Component)
A full-page component that uses `AnalysisEditor` for dedicated analysis editing.

**Features:**
- Full-page layout
- Navigation controls
- All editing functionality

## Usage Examples

### Using AnalysisEditor as a disposable component:

```tsx
import { AnalysisEditor } from "@/components/analyses/analysis-editor"

// Basic usage
<AnalysisEditor
    analysis={currentAnalysis}
    investigationId={investigationId}
    onAnalysisUpdate={handleUpdate}
    onAnalysisDelete={handleDelete}
    onAnalysisCreate={handleCreate}
/>

// With analysis selector
<AnalysisEditor
    analysis={currentAnalysis}
    investigationId={investigationId}
    onAnalysisUpdate={handleUpdate}
    onAnalysisDelete={handleDelete}
    onAnalysisCreate={handleCreate}
    onAnalysisSelect={handleSelect}
    showAnalysisSelector={true}
    showNavigation={true}
    analyses={analyses}
    currentAnalysisId={currentAnalysisId}
/>

// Minimal usage without header
<AnalysisEditor
    analysis={analysis}
    investigationId={investigationId}
    showHeader={false}
    showActions={false}
    className="border rounded-lg"
/>
```

### Using AnalysisPanel in a layout:

```tsx
import AnalysisPanel from "@/components/analyses/notes-panel"

// In a layout component
<AnalysisPanel />
```

### Using AnalysisPage in a route:

```tsx
import { AnalysisPage } from "@/components/analyses/analysis-page"

// In a route component
<AnalysisPage />
```

## Action Buttons

The `AnalysisEditor` includes all the original action buttons:

- **Save** (💾) - Save the current analysis
- **AI Chat** (✨) - Open AI prompt panel
- **New analysis** (➕) - Create a New analysis
- **Delete** (🗑️) - Delete the current analysis
- **Open in Page** (🔗) - Open analysis in full page view

## Architecture Benefits

1. **Reusability**: The core `AnalysisEditor` can be used in any context
2. **Separation of Concerns**: UI logic is separated from routing logic
3. **Minimal Code Rewriting**: Existing functionality is preserved
4. **Flexibility**: Components can be customized via props
5. **Consistency**: All analysis editing uses the same core component
6. **Complete Functionality**: All original features are maintained

## Migration Notes

The existing `AnalysisPanel` has been refactored to use the new `AnalysisEditor` component. All original functionality including:
- Analysis selector dropdown
- All action buttons (Save, AI Chat, New analysis, Delete, Open in Page)
- Navigation controls
- AI prompt integration
- Keyboard shortcuts

Everything works exactly as before, but the code is now more modular and reusable. 