import React, { createContext, useCallback, useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLocation } from '@tanstack/react-router';
import { getStepsForRoute } from './tutorial-steps';

interface TutorialContextValue {
  startTutorial: () => void;
  stopTutorial: () => void;
  resetTutorial: () => void;
  isRunning: boolean;
}

export const TutorialContext = createContext<TutorialContextValue | null>(null);

const STORAGE_KEY = 'flowsint-tutorial-completed';

interface TutorialProviderProps {
  children: React.ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  const getCompletedRoutes = useCallback((): Set<string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }, []);

  const markRouteAsCompleted = useCallback((route: string) => {
    const completed = getCompletedRoutes();
    completed.add(route);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  }, [getCompletedRoutes]);

  const startTutorial = useCallback(() => {
    const currentPath = location.pathname;
    const routeSteps = getStepsForRoute(currentPath);

    if (routeSteps.length > 0) {
      setSteps(routeSteps);
      setStepIndex(0);
      setRun(true);
    }
  }, [location.pathname]);

  const stopTutorial = useCallback(() => {
    setRun(false);
  }, []);

  const resetTutorial = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRun(false);
    setSteps([]);
    setStepIndex(0);
  }, []);

  useEffect(() => {
    const currentPath = location.pathname;
    const routeSteps = getStepsForRoute(currentPath);

    if (routeSteps.length > 0) {
      const completed = getCompletedRoutes();

      if (!completed.has(currentPath)) {
        setSteps(routeSteps);
        setStepIndex(0);
        setTimeout(() => {
          setRun(true);
        }, 500);
      }
    } else {
      setRun(false);
    }
  }, [location.pathname, getCompletedRoutes]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      markRouteAsCompleted(location.pathname);
    }
  }, [location.pathname, markRouteAsCompleted]);

  const contextValue: TutorialContextValue = {
    startTutorial,
    stopTutorial,
    resetTutorial,
    isRunning: run,
  };

  return (
    <TutorialContext.Provider value={contextValue}>
      {/* <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#3b82f6',
            zIndex: 10000,
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Last',
          next: 'Next',
          skip: 'Skip',
        }}
      /> */}
      {children}
    </TutorialContext.Provider>
  );
}
