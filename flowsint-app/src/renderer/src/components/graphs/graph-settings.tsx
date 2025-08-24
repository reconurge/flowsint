import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Label } from '../ui/label'
import { memo, useCallback } from 'react'
import { Button } from '../ui/button'
import { type Setting } from '@/types'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'

const GraphSettings = () => {
    const settings = useGraphSettingsStore(s => s.settings)
    const settingsModalOpen = useGraphSettingsStore(s => s.settingsModalOpen)
    const setSettingsModalOpen = useGraphSettingsStore(s => s.setSettingsModalOpen)
    const updateSetting = useGraphSettingsStore(s => s.updateSetting)
    const resetSettings = useGraphSettingsStore(s => s.resetSettings)

    // Categorize settings
    const categories = {
        'Simulation Control': [
            'd3AlphaDecay',
            'd3AlphaMin',
            'd3VelocityDecay',
            'cooldownTicks',
            'cooldownTime',
            'warmupTicks'
        ],
        'Visual Appearance': [
            'nodeSize',
            'linkWidth',
            'linkDirectionalArrowLength',
            'linkDirectionalArrowRelPos',
            'linkDirectionalParticleSpeed'
        ],
        'Layout': [
            'dagLevelDistance'
        ]
    }

    return (
        <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
            <DialogContent className='max-h-[90vh] !w-[90vw] !max-w-[700px] overflow-y-auto'>
                <DialogHeader>
                    <DialogTitle>Graph settings</DialogTitle>
                    <DialogDescription>
                        Update the settings of your graph. Changes apply in real-time.
                    </DialogDescription>
                </DialogHeader>
                
                <Accordion type="multiple" defaultValue={['Force Physics', 'Simulation Control']} className="w-full">
                    {Object.entries(categories).map(([categoryName, settingKeys]) => (
                        <AccordionItem key={categoryName} value={categoryName}>
                            <AccordionTrigger className="text-sm font-medium">
                                {categoryName}
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                {settingKeys.map((key) => {
                                    const setting = settings[key];
                                    if (!setting) return null;
                                    return (
                                        <SettingItem
                                            key={key}
                                            label={key}
                                            updateSetting={updateSetting}
                                            setting={setting}
                                        />
                                    );
                                })}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>

                <div className='text-right border-t pt-4'>
                    <Button onClick={resetSettings}>
                        Reset to defaults
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default GraphSettings

type SettingItemProps = {
    setting: Setting
    label: string
    updateSetting: (key: string, value: number) => void
}
const SettingItem = memo(({ setting, label, updateSetting }: SettingItemProps) => {

    const handleUpdateSetting = useCallback((newValues: number[]) => {
        updateSetting(label, newValues[0])
    }, [setting, updateSetting])

    return (
        <div className='grid grid-cols-1 gap-1'>
            <Label htmlFor={label}>{label} ({setting.value})</Label>
            <p className='opacity-60 text-sm'>{setting.description}</p>
            <Slider
                className='mt-2'
                id={label}
                onValueChange={handleUpdateSetting}
                value={[setting.value]}
                min={setting.min}
                max={setting.max}
                step={setting.step}
            />
        </div>
    )
})