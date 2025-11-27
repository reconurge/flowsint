import { Step } from 'react-joyride';

export const tutorialSteps: Record<string, Step[]> = {
  '/dashboard': [
    {
      target: '[data-tour-id="welcome"]',
      content: 'Welcome to Flowsint! This tutorial will guide you through the main features.',
      disableBeacon: true,
    },
    {
      target: '[data-tour-id="navigation"]',
      content: 'Use this navigation bar to access different sections.',
    },
  ],

  '/dashboard/flows/$flowId': [
    {
      target: '[data-tour-id="flow-sidebar"]',
      content: 'Welcome to the flow editor! Use the sidebar to drag enrichers into your flow.',
      disableBeacon: true,
    },
    {
      target: '[data-tour-id="flow-canvas"]',
      content: 'The canvas is your workspace. Drag and drop enrichers here and connect them to create your data pipeline.',
    },
    {
      target: '[data-tour-id="add-type-node"]',
      content: 'Start by adding a Type node to define the input data type for your flow.',
    },
    {
      target: '[data-tour-id="add-enricher-node"]',
      content: 'Then add enrichers to process your data. Connect them by clicking on the connection points.',
    },
    {
      target: '[data-tour-id="node-params"]',
      content: 'Double-click on a node or right-click to configure its parameters.',
    },
    {
      target: '[data-tour-id="layout-button"]',
      content: 'Use the auto-layout button to organize your nodes neatly.',
    },
    {
      target: '[data-tour-id="save-button"]',
      content: 'Save your flow to reuse and share it.',
    },
    {
      target: '[data-tour-id="compute-button"]',
      content: 'Use the "Compute" button to simulate your flow execution and visualize the data path.',
    },
    {
      target: '[data-tour-id="simulation-controls"]',
      content: 'Control the simulation with Pause, Skip, and Reset buttons. Adjust the speed as needed.',
    },
  ],

  '/dashboard/flows': [
    {
      target: '[data-tour-id="create-flow"]',
      content: 'Click here to create a new data enrichment flow.',
      disableBeacon: true,
    },
    {
      target: '[data-tour-id="flow-list"]',
      content: 'All your flows are listed here. Click on a flow to edit or launch it.',
    },
  ],

  '/dashboard/investigations': [
    {
      target: '[data-tour-id="create-investigation"]',
      content: 'Start a new investigation here.',
      disableBeacon: true,
    },
    {
      target: '[data-tour-id="investigation-list"]',
      content: 'Manage your ongoing investigations and access their relationship graphs.',
    },
  ],
};

export function hasStepsForRoute(route: string): boolean {
  return route in tutorialSteps;
}

export function getStepsForRoute(route: string): Step[] {
  return tutorialSteps[route] || [];
}
