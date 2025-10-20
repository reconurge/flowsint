# 📚 Système de Tutoriel Flowsint

Système de tutoriel global basé sur **React Joyride**, intégré avec **TanStack Router**.

## ✅ Installation complète

Le système est déjà installé et configuré :

```bash
✓ react-joyride installé
✓ TutorialProvider intégré dans main.tsx
✓ Structure de fichiers créée
```

## 📁 Structure

```
src/components/tutorial/
├── tutorial-provider.tsx   # Provider React + logique Joyride
├── use-tutorial.ts         # Hook pour contrôler le tutoriel
├── tutorial-steps.ts       # Configuration des étapes par route
└── index.ts                # Exports
```

## 🚀 Utilisation

### 1. Ajouter des étapes pour une route

Éditez `src/components/tutorial/tutorial-steps.ts` :

```typescript
export const tutorialSteps: Record<string, Step[]> = {
  '/ma-route': [
    {
      target: '[data-tour-id="mon-element"]',
      content: 'Description de l\'élément',
      disableBeacon: true, // Démarre sans animation initiale
    },
    {
      target: '[data-tour-id="autre-element"]',
      content: 'Autre description',
    },
  ],
};
```

### 2. Annoter vos composants

Ajoutez `data-tour-id` aux éléments cibles :

```tsx
<div data-tour-id="graph-toolbar">
  <button>Zoom</button>
</div>

<aside data-tour-id="sidebar">
  Panneau latéral
</aside>
```

### 3. Ajouter un bouton d'aide (optionnel)

```tsx
import { useTutorial } from '@/components/tutorial';

function MyPage() {
  const { startTutorial } = useTutorial();

  return (
    <div>
      <button onClick={startTutorial}>? Aide</button>
      {/* Votre contenu */}
    </div>
  );
}
```

## 🎯 Fonctionnalités

- ✅ **Détection automatique** : Le tutoriel se lance à la première visite d'une route
- ✅ **Persistance** : Historique sauvegardé dans `localStorage`
- ✅ **Multi-routes** : Chaque page a ses propres étapes
- ✅ **Contrôle manuel** : Hook `useTutorial()` pour contrôler le tutoriel
- ✅ **Traduction FR** : Boutons et textes en français
- ✅ **Style personnalisable** : Couleurs et thème configurables

## 🔧 API du hook

```tsx
const {
  startTutorial,   // Démarre le tutoriel pour la route actuelle
  stopTutorial,    // Arrête le tutoriel
  resetTutorial,   // Efface l'historique (force la revisite)
  isRunning,       // État du tutoriel (boolean)
} = useTutorial();
```

## 📝 Exemple complet

Voir `TUTORIAL_EXAMPLE.tsx` pour des exemples détaillés.

### Page avec tutoriel

```tsx
import { useTutorial } from '@/components/tutorial';

export function GraphPage() {
  const { startTutorial } = useTutorial();

  return (
    <div>
      <button onClick={startTutorial}>? Aide</button>

      <div data-tour-id="toolbar">Barre d'outils</div>
      <div data-tour-id="sidebar">Menu latéral</div>
      <div data-tour-id="canvas">Canvas principal</div>
    </div>
  );
}
```

### Configuration des étapes

```typescript
// src/components/tutorial/tutorial-steps.ts
export const tutorialSteps = {
  '/graph/$id': [
    {
      target: '[data-tour-id="toolbar"]',
      content: 'Voici la barre d\'outils',
      disableBeacon: true,
    },
    {
      target: '[data-tour-id="sidebar"]',
      content: 'Le panneau latéral affiche vos sources',
    },
    {
      target: '[data-tour-id="canvas"]',
      content: 'Le canvas affiche votre graphe',
    },
  ],
};
```

## 🎨 Personnalisation

### Modifier le style

Dans `tutorial-provider.tsx`, ligne 100+ :

```tsx
<Joyride
  styles={{
    options: {
      primaryColor: '#3b82f6',  // Couleur principale
      zIndex: 10000,            // Z-index
    },
  }}
  locale={{
    back: 'Retour',
    next: 'Suivant',
    skip: 'Passer',
    // ...
  }}
/>
```

### Délai de démarrage

Ligne 77 du `tutorial-provider.tsx` :

```tsx
setTimeout(() => {
  setRun(true);
}, 500); // Modifier le délai (ms)
```

## 📊 Clé localStorage

Le système utilise `flowsint-tutorial-completed` pour stocker les routes visitées.

### Réinitialiser manuellement

```tsx
const { resetTutorial } = useTutorial();
resetTutorial(); // Efface tout l'historique
```

Ou via console :

```javascript
localStorage.removeItem('flowsint-tutorial-completed');
```

## 🔍 Débogage

### Le tutoriel ne se lance pas ?

1. Vérifiez que la route est dans `tutorialSteps.ts`
2. Vérifiez que les `data-tour-id` correspondent
3. Vérifiez que les éléments sont montés dans le DOM (délai de 500ms configuré)
4. Consultez la console pour les erreurs

### Forcer le redémarrage

```tsx
const { resetTutorial, startTutorial } = useTutorial();

resetTutorial();     // Efface l'historique
startTutorial();     // Relance immédiatement
```

## 📚 Documentation React Joyride

https://docs.react-joyride.com/

## 🤝 Contribuer

Pour ajouter des étapes à une nouvelle page :

1. Ajouter la route dans `tutorial-steps.ts`
2. Annoter les éléments avec `data-tour-id`
3. Tester en visitant la page (effacer localStorage si besoin)
