import { useGraphSettingsStore } from '@/stores/graph-settings-store';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Zap, Move, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCallback } from 'react';

const ForceControls = ({ children }: { children: React.ReactNode }) => {
    const settings = useGraphSettingsStore(s => s.settings);
    const currentPreset = useGraphSettingsStore(s => s.currentPreset);
    const updateSetting = useGraphSettingsStore(s => s.updateSetting);
    const applyPreset = useGraphSettingsStore(s => s.applyPreset);
    const getPresets = useGraphSettingsStore(s => s.getPresets);
    const setSettingsModalOpen = useGraphSettingsStore(s => s.setSettingsModalOpen)

    const handleOpenSettingsModal = useCallback(() => {
        setSettingsModalOpen(true)
    }, [setSettingsModalOpen])

    const quickControls = [
        {
            key: 'd3AlphaDecay',
            label: 'Convergence',
            icon: <Zap className="w-3 h-3" />,
        },
        {
            key: 'd3VelocityDecay',
            label: 'Friction',
            icon: <Move className="w-3 h-3" />,
        },
        {
            key: 'cooldownTicks',
            label: 'Simulation',
            icon: <Target className="w-3 h-3" />,
        }
    ];

    const presets = getPresets();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div>
                    {children}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
                <div className="space-y-4">
                    <div className="text-sm font-medium text-foreground">Force Presets</div>
                    <Select value={currentPreset || ""} onValueChange={applyPreset}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a preset..." />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(presets).map((presetName) => (
                                <SelectItem key={presetName} value={presetName}>
                                    {presetName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="border-t pt-4">
                        <div className="text-sm font-medium text-foreground mb-3">Quick Controls</div>
                        {quickControls.map(({ key, label, icon }) => {
                            const setting = settings[key];
                            if (!setting) return null;

                            return (
                                <div key={key} className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2">
                                        {icon}
                                        <Label className="text-xs font-medium flex-1">
                                            {label} ({setting.value})
                                        </Label>
                                    </div>
                                    <Slider
                                        value={[setting.value]}
                                        onValueChange={(values) => updateSetting(key, values[0])}
                                        min={setting.min}
                                        max={setting.max}
                                        step={setting.step}
                                        className="w-full"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-right pt-3 border-t">
                        <button className='text-primary text-sm underline' onClick={handleOpenSettingsModal}> More settings</button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ForceControls; 