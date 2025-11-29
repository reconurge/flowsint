import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Centralized default settings organized by categories
const DEFAULT_SETTINGS = {
  information: {},
  general: {
    showFlow: {
      type: 'boolean',
      value: false,
      description: 'Display Flo, your AI assistant.'
    },
    autoZoomOnCurrentNode: {
      type: 'boolean',
      value: true,
      description: 'Automatically zoom to the current node when it changes.'
    },
  },
  graph: {
    nodeSize: {
      type: 'number',
      value: 1,
      min: .2,
      max: 20,
      step: 0.1,
      description: 'Defines the width of the link between two nodes.'
    },
    linkWidth: {
      type: 'number',
      value: 2,
      min: 1,
      max: 10,
      step: 0.1,
      description: 'Defines the width of the link between two nodes.'
    },
    nodeLabelFontSize: {
      type: 'number',
      value: 100,
      min: 50,
      max: 200,
      step: 5,
      description: 'Adjusts the font size of node labels (percentage of base size, scales with zoom)'
    },
    linkLabelFontSize: {
      type: 'number',
      value: 100,
      min: 50,
      max: 200,
      step: 5,
      description: 'Adjusts the font size of link labels (percentage of base size, scales with zoom)'
    },
    dagLevelDistance: {
      type: 'number',
      value: 50,
      min: 0,
      max: 100,
      step: 1,
      description:
        'Distance between different graph depths when using DAG (directed acyclic graph) layout mode'
    },
    d3ForceChargeStrength: {
      type: 'number',
      value: -150,
      min: -500,
      max: 0,
      step: 5,
      description:
        'Base repulsion strength (adaptive: highly connected nodes/cluster hubs repel 2-3x more to separate clusters)'
    },
    d3ForceLinkDistance: {
      type: 'number',
      value: 35,
      min: 10,
      max: 200,
      step: 1,
      description:
        'Target distance between connected nodes (higher = nodes further apart)'
    },
    d3ForceLinkStrength: {
      type: 'number',
      value: 1.0,
      min: 0,
      max: 2,
      step: 0.1,
      description:
        'Strength of links to maintain their target distance (higher = stronger cluster cohesion, lower = weaker clusters)'
    },
    linkDirectionalArrowRelPos: {
      type: 'number',
      value: 1,
      min: 0,
      max: 1,
      step: 0.01,
      description:
        'Position of directional arrows along the link line (0 = source node, 1 = target node, 0.5 = middle)'
    },
    linkDirectionalArrowLength: {
      type: 'number',
      value: 1,
      min: 1,
      max: 10,
      step: 0.1,
      description: 'Length of the arrow heads that indicate link direction'
    },
    linkDirectionalParticleSpeed: {
      type: 'number',
      value: 0.005,
      min: 0,
      max: 0.05,
      step: 0.001,
      description: 'Speed of moving particles along links (higher = faster movement)'
    },
    cooldownTicks: {
      type: 'number',
      value: 200,
      min: 50,
      max: 1000,
      step: 10,
      description: 'Number of simulation frames to render before stopping and freezing the layout'
    },
    cooldownTime: {
      type: 'number',
      value: 15000,
      min: 1000,
      max: 60000,
      step: 1000,
      description:
        'Maximum time in milliseconds to run the simulation before stopping (15000 = 15 seconds)'
    },
    d3AlphaDecay: {
      type: 'number',
      value: 0.06,
      min: 0,
      max: 0.3,
      step: 0.005,
      description:
        'Rate at which the simulation intensity decays (higher = faster convergence, lower = longer simulation)'
    },
    d3AlphaMin: {
      type: 'number',
      value: 0.001,
      min: 0,
      max: 0.1,
      step: 0.001,
      description:
        'Minimum simulation intensity threshold - simulation stops when reaching this value'
    },
    d3VelocityDecay: {
      type: 'number',
      value: 0.75,
      min: 0,
      max: 1,
      step: 0.01,
      description:
        'Velocity decay factor that simulates friction/resistance (higher = more damping, nodes slow down faster)'
    },
    collisionRadius: {
      type: 'number',
      value: 22,
      min: 10,
      max: 50,
      step: 1,
      description:
        'Radius of collision detection around nodes (prevents node overlap and improves readability)'
    },
    collisionStrength: {
      type: 'number',
      value: 0.95,
      min: 0,
      max: 1,
      step: 0.05,
      description:
        'Strength of collision force (1 = fully rigid collision, 0 = no collision)'
    },
    centerGravity: {
      type: 'number',
      value: 0.15,
      min: 0,
      max: 1,
      step: 0.05,
      description:
        'Gravity force pulling all nodes toward the center (prevents clusters from drifting apart, higher = stronger pull to center)'
    },
    // warmupTicks: {
    //   type: 'number',
    //   value: 0,
    //   min: 0,
    //   max: 100,
    //   step: 1,
    //   description:
    //     'Number of simulation cycles to run in background before starting to render (improves initial layout)'
    // }
  }
}

// Force Presets - Include all relevant force simulation parameters
const FORCE_PRESETS = {
  'Tight Clusters': {
    d3AlphaDecay: 0.1,
    d3AlphaMin: 0.001,
    d3VelocityDecay: 0.8,
    d3ForceChargeStrength: -50,
    d3ForceLinkDistance: 10,
    d3ForceLinkStrength: 2,
    cooldownTicks: 300,
    cooldownTime: 20000,
    collisionRadius: 15,
    collisionStrength: 0.7,
    centerGravity: 0.2
  },
  'Compact Network': {
    d3AlphaDecay: 0.08,
    d3AlphaMin: 0.001,
    d3VelocityDecay: 0.7,
    d3ForceChargeStrength: -80,
    d3ForceLinkDistance: 20,
    d3ForceLinkStrength: 2,
    cooldownTicks: 250,
    cooldownTime: 18000,
    collisionRadius: 18,
    collisionStrength: 0.75,
    centerGravity: 0.18
  },
  'Balanced Layout': {
    d3AlphaDecay: 0.06,
    d3AlphaMin: 0,
    d3VelocityDecay: 0.6,
    d3ForceChargeStrength: -120,
    d3ForceLinkDistance: 30,
    d3ForceLinkStrength: 2,
    cooldownTicks: 200,
    cooldownTime: 15000,
    collisionRadius: 22,
    collisionStrength: 0.8,
    centerGravity: 0.15
  },
  'Loose Organic': {
    d3AlphaDecay: 0.04,
    d3AlphaMin: 0,
    d3VelocityDecay: 0.4,
    d3ForceChargeStrength: -200,
    d3ForceLinkDistance: 30,
    d3ForceLinkStrength: 2,
    cooldownTicks: 150,
    cooldownTime: 12000,
    collisionRadius: 25,
    collisionStrength: 0.85,
    centerGravity: 0.12
  },
  'High Energy': {
    d3AlphaDecay: 0.02,
    d3AlphaMin: 0,
    d3VelocityDecay: 0.3,
    d3ForceChargeStrength: -300,
    d3ForceLinkDistance: 20,
    d3ForceLinkStrength: 2,
    cooldownTicks: 100,
    cooldownTime: 10000,
    collisionRadius: 20,
    collisionStrength: 0.8,
    centerGravity: 0.08
  },
  'Readable clusters': {
    d3AlphaDecay: 0.06,
    d3AlphaMin: 0.001,
    d3VelocityDecay: 0.75,
    d3ForceChargeStrength: -150,
    d3ForceLinkDistance: 35,
    d3ForceLinkStrength: 1.0,
    cooldownTicks: 300,
    cooldownTime: 20000,
    collisionRadius: 22,
    collisionStrength: 0.95,
    centerGravity: 0.15
  },
  'Medium spacing': {
    d3AlphaDecay: 0.055,
    d3AlphaMin: 0.001,
    d3VelocityDecay: 0.7,
    d3ForceChargeStrength: -200,
    d3ForceLinkDistance: 40,
    d3ForceLinkStrength: 0.8,
    cooldownTicks: 320,
    cooldownTime: 22000,
    collisionRadius: 26,
    collisionStrength: 0.9,
    centerGravity: 0.2
  },
  'Osint friendly': {
    d3AlphaDecay: 0.07,
    d3AlphaMin: 0.001,
    d3VelocityDecay: 0.8,
    d3ForceChargeStrength: -100,
    d3ForceLinkDistance: 28,
    d3ForceLinkStrength: 1.4,
    cooldownTicks: 280,
    cooldownTime: 18000,
    collisionRadius: 18,
    collisionStrength: 1.0,
    centerGravity: 0.25
  }
}

type GraphGeneralSettingsStore = {
  // Settings state
  settings: typeof DEFAULT_SETTINGS
  forceSettings: any
  updateSetting: (category: string, key: string, value: any) => void
  resetSettings: () => void
  getSettings: () => Record<string, any>
  getCategorySettings: (category: string) => Record<string, any>

  // Force Presets
  currentPreset: string | null
  applyPreset: (presetName: string) => void
  getPresets: () => Record<string, any>

  // UI State
  settingsModalOpen: boolean
  setSettingsModalOpen: (open: boolean) => void
  toggleSettingsModal: () => void
  keyboardShortcutsOpen: boolean
  setKeyboardShortcutsOpen: (open: boolean) => void
  toggleKeyboardShortcutsModal: () => void
  importModalOpen: boolean
  setImportModalOpen: (open: boolean) => void

  // Helper methods
  getSettingValue: (category: string, key: string) => any
  getSettingType: (category: string, key: string) => string | undefined
  getSettingOptions: (
    category: string,
    key: string
  ) => { value: string; label: string }[] | undefined
  getSettingDescription: (category: string, key: string) => string | undefined
  getSettingConstraints: (
    category: string,
    key: string
  ) => { min?: number; max?: number; step?: number } | undefined
}

export const useGraphSettingsStore = create<GraphGeneralSettingsStore>()(
  persist(
    (set, get) => ({
      // Settings state
      settings: DEFAULT_SETTINGS,
      currentPreset: '🎯 Clusters Lisibles',
      forceSettings: DEFAULT_SETTINGS.graph,
      // UI State
      settingsModalOpen: false,
      keyboardShortcutsOpen: false,
      importModalOpen: false,
      // Core methods
      updateSetting: (category, key, value) =>
        set((state) => {
          const categorySettings = state.settings[category as keyof typeof state.settings] as any
          const newSettings = {
            ...state.settings,
            [category]: {
              ...categorySettings,
              [key]: {
                ...(categorySettings?.[key] || {}),
                value: value
              }
            }
          }
          // Also update forceSettings if we're updating a graph setting
          let newForceSettings = state.forceSettings
          if (category === 'graph') {
            newForceSettings = {
              ...state.forceSettings,
              [key]: {
                ...(state.forceSettings[key] || {}),
                value: value
              }
            }
          }
          return {
            settings: newSettings,
            forceSettings: newForceSettings,
            currentPreset: null // Clear preset when manually changing settings
          }
        }),

      resetSettings: () =>
        set({
          settings: DEFAULT_SETTINGS,
          forceSettings: DEFAULT_SETTINGS.graph,
          currentPreset: 'Balanced Layout'
        }),

      getSettings: () => {
        const flatSettings: Record<string, any> = {}
        Object.entries(get().settings).forEach(([category, categorySettings]) => {
          Object.entries(categorySettings as Record<string, any>).forEach(([key, setting]) => {
            flatSettings[`${category}.${key}`] = (setting as any).value
          })
        })
        return flatSettings
      },

      getCategorySettings: (category: string) => {
        const categorySettings: Record<string, any> = {}
        // @ts-ignore
        const settings = get().settings[category]
        if (settings) {
          Object.entries(settings as Record<string, any>).forEach(([key, setting]) => {
            categorySettings[key] = (setting as any).value
          })
        }
        return categorySettings
      },

      // Force Presets
      getPresets: () => FORCE_PRESETS,

      applyPreset: (presetName: string) => {
        const preset = FORCE_PRESETS[presetName as keyof typeof FORCE_PRESETS]
        if (!preset) return

        set((state) => {
          // Create completely new objects with new references
          const newGraphSettings = { ...state.settings.graph } as any
          const newForceSettings = { ...state.forceSettings } as any

          // Update each preset value, creating new objects for each setting
          Object.entries(preset).forEach(([key, value]) => {
            if (newGraphSettings[key]) {
              newGraphSettings[key] = {
                ...newGraphSettings[key],
                value: value
              }
            }
            if (newForceSettings[key]) {
              newForceSettings[key] = {
                ...newForceSettings[key],
                value: value
              }
            }
          })

          // Create new settings object with new graph reference
          const newSettings = {
            ...state.settings,
            graph: newGraphSettings
          }

          return {
            settings: newSettings,
            forceSettings: newForceSettings,
            currentPreset: presetName
          }
        })
      },

      // UI State methods
      setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
      setKeyboardShortcutsOpen: (open) => set({ keyboardShortcutsOpen: open }),
      setImportModalOpen: (open) => set({ importModalOpen: open }),
      toggleSettingsModal: () => set({ settingsModalOpen: !get().settingsModalOpen }),
      toggleKeyboardShortcutsModal: () => set({ keyboardShortcutsOpen: !get().keyboardShortcutsOpen }),

      // Helper methods
      getSettingValue: (category: string, key: string) => {
        const categorySettings = get().settings[category as keyof typeof DEFAULT_SETTINGS] as any
        return categorySettings?.[key]?.value
      },
      getSettingType: (category: string, key: string) => {
        const categorySettings = get().settings[category as keyof typeof DEFAULT_SETTINGS] as any
        return categorySettings?.[key]?.type
      },
      getSettingOptions: (category: string, key: string) => {
        const categorySettings = get().settings[category as keyof typeof DEFAULT_SETTINGS] as any
        return categorySettings?.[key]?.options
      },
      getSettingDescription: (category: string, key: string) => {
        const categorySettings = get().settings[category as keyof typeof DEFAULT_SETTINGS] as any
        return categorySettings?.[key]?.description
      },
      getSettingConstraints: (category: string, key: string) => {
        const categorySettings = get().settings[category as keyof typeof DEFAULT_SETTINGS] as any
        const setting = categorySettings?.[key]
        if (setting && 'min' in setting) {
          return {
            min: setting.min,
            max: setting.max,
            step: setting.step
          }
        }
        return undefined
      }
    }),
    {
      name: 'graph-settings-storage',
      partialize: (state) => ({
        settings: state.settings,
        forceSettings: state.forceSettings,
        currentPreset: state.currentPreset
      })
    }
  )
)
