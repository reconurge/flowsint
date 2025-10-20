import { useContext } from 'react';
import { TutorialContext } from './tutorial-provider';

export function useTutorial() {
  const context = useContext(TutorialContext);

  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }

  return context;
}
