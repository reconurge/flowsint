import { type Settings } from '@/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_SETTINGS = {
    nodeSize: {
        value: 14,
        min: 1,
        max: 100,
        step: .1,
        description: "Defined the width of the link between two nodes."
    },
    linkWidth: {
        value: 2,
        min: 1,
        max: 10,
        step: .1,
        description: "Defined the width of the link between two nodes."
    },
    dagLevelDistance: {
        value: 50,
        min: 0,
        max: 100,
        step: 1,
        description: "Distance between different graph depths when using DAG (directed acyclic graph) layout mode"
    },
    linkDirectionalArrowRelPos: {
        value: 0.99,
        min: 0,
        max: 1,
        step: 0.01,
        description: "Position of directional arrows along the link line (0 = source node, 1 = target node, 0.5 = middle)"
    },
    linkDirectionalArrowLength: {
        value: 3,
        min: 1,
        max: 100,
        step: 0.1,
        description: "Length of the arrow heads that indicate link direction"
    },
    linkDirectionalParticleSpeed: {
        value: 0.005,
        min: 0,
        max: 0.05,
        step: 0.001,
        description: "Speed of moving particles along links (higher = faster movement)"
    },
    cooldownTicks: {
        value: 200,
        min: 50,
        max: 1000,
        step: 10,
        description: "Number of simulation frames to render before stopping and freezing the layout"
    },
    cooldownTime: {
        value: 15000,
        min: 1000,
        max: 60000,
        step: 1000,
        description: "Maximum time in milliseconds to run the simulation before stopping (15000 = 15 seconds)"
    },
    d3AlphaDecay: {
        value: 0.045,
        min: 0,
        max: 0.3,
        step: 0.005,
        description: "Rate at which the simulation intensity decays (higher = faster convergence, lower = longer simulation)"
    },
    d3AlphaMin: {
        value: 0,
        min: 0,
        max: 0.1,
        step: 0.001,
        description: "Minimum simulation intensity threshold - simulation stops when reaching this value"
    },
    d3VelocityDecay: {
        value: 0.41,
        min: 0,
        max: 1,
        step: 0.01,
        description: "Velocity decay factor that simulates friction/resistance (higher = more damping, nodes slow down faster)"
    },
    warmupTicks: {
        value: 0,
        min: 0,
        max: 100,
        step: 1,
        description: "Number of simulation cycles to run in background before starting to render (improves initial layout)"
    },
    // Additional Force Parameters
    d3AlphaTarget: {
        value: 0,
        min: 0,
        max: 1,
        step: 0.01,
        description: "Target alpha value for the simulation (0 = stop, higher values = continuous motion)"
    },
    linkStrength: {
        value: 1,
        min: 0,
        max: 2,
        step: 0.1,
        description: "Strength of the link force (higher = stronger connection between linked nodes)"
    },
    chargeStrength: {
        value: -30,
        min: -500,
        max: 100,
        step: 10,
        description: "Strength of the charge force (negative = repulsion, positive = attraction)"
    },
    centerStrength: {
        value: 1,
        min: 0,
        max: 2,
        step: 0.1,
        description: "Strength of the centering force (higher = stronger pull towards center)"
    },
    collisionRadius: {
        value: 0,
        min: 0,
        max: 50,
        step: 1,
        description: "Collision radius for nodes (0 = no collision detection, higher = larger collision area)"
    },
    collisionStrength: {
        value: 1,
        min: 0,
        max: 2,
        step: 0.1,
        description: "Strength of collision force (higher = stronger collision avoidance)"
    }
}

type GraphSettingsStore = {
    // Settings state
    settings: Settings
    updateSetting: (key: string, val: number) => void
    // UI State
    settingsModalOpen: boolean
    setSettingsModalOpen: (open: boolean) => void
    resetSettings: () => void
    getSettings: () => any
    // Force Presets
    currentPreset: string | null
    applyPreset: (presetName: string) => void
    getPresets: () => Record<string, any>
};
export const useGraphSettingsStore = create<GraphSettingsStore>()(
    persist((set, get) => ({
        settingsModalOpen: false,
        settings: DEFAULT_SETTINGS,
        currentPreset: null,
        setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
        updateSetting: (key, val) => set((state) => ({
            settings: {
                ...state.settings,
                [key]: {
                    ...state.settings[key],
                    value: val
                },
            },
            currentPreset: null, // Clear preset when manually changing settings
        })),
        getSettings: () => {
            let flatSettings = {}
            Object.keys(get().settings).map((key) => {
                flatSettings[key] = get().settings[key].value
            })
            return flatSettings
        },
        resetSettings: () => set({ settings: DEFAULT_SETTINGS, currentPreset: null }),
        
        // Force Presets Implementation
        getPresets: () => ({
            'Tight Clusters': {
                chargeStrength: -10,
                linkStrength: 2.5,
                centerStrength: 1.5,
                d3VelocityDecay: 0.8,
                collisionRadius: 8
            },
            'Compact Network': {
                chargeStrength: -20,
                linkStrength: 2.0,
                centerStrength: 1.2,
                d3VelocityDecay: 0.7,
                collisionRadius: 5
            },
            'Balanced Layout': {
                chargeStrength: -40,
                linkStrength: 1.5,
                centerStrength: 1.0,
                d3VelocityDecay: 0.6,
                collisionRadius: 6
            },
            'Loose Organic': {
                chargeStrength: -80,
                linkStrength: 1.0,
                centerStrength: 0.8,
                d3VelocityDecay: 0.4,
                collisionRadius: 10
            },
            'High Energy': {
                chargeStrength: -60,
                linkStrength: 1.2,
                centerStrength: 0.5,
                d3VelocityDecay: 0.3,
                d3AlphaTarget: 0.1,
                collisionRadius: 12
            }
        }),
        
        applyPreset: (presetName: string) => {
            const presets = get().getPresets();
            const preset = presets[presetName];
            if (!preset) return;
            
            set((state) => {
                const newSettings = { ...state.settings };
                Object.entries(preset).forEach(([key, value]) => {
                    if (newSettings[key]) {
                        newSettings[key] = {
                            ...newSettings[key],
                            value: value as number
                        };
                    }
                });
                return { 
                    settings: newSettings,
                    currentPreset: presetName
                };
            });
        }
    }    ),
        {
            name: 'graph-controls-storage',
            partialize: (state) => ({ 
                settings: state.settings,
                currentPreset: state.currentPreset 
            }),
        }
    ));
