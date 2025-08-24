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
        value: 1,
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
                d3AlphaDecay: 0.1,
                d3VelocityDecay: 0.8,
                cooldownTicks: 300,
                cooldownTime: 20000
            },
            'Compact Network': {
                d3AlphaDecay: 0.08,
                d3VelocityDecay: 0.7,
                cooldownTicks: 250,
                cooldownTime: 18000
            },
            'Balanced Layout': {
                d3AlphaDecay: 0.06,
                d3VelocityDecay: 0.6,
                cooldownTicks: 200,
                cooldownTime: 15000
            },
            'Loose Organic': {
                d3AlphaDecay: 0.04,
                d3VelocityDecay: 0.4,
                cooldownTicks: 150,
                cooldownTime: 12000
            },
            'High Energy': {
                d3AlphaDecay: 0.02,
                d3VelocityDecay: 0.3,
                cooldownTicks: 100,
                cooldownTime: 10000
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
    }),
        {
            name: 'graph-controls-storage',
            partialize: (state) => ({
                settings: state.settings,
                currentPreset: state.currentPreset
            }),
        }
    ));
