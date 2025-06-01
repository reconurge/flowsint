import { memo, useState } from 'react'
import { Card } from '../ui/card'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const MAX_ENTRIES = 6

const Legend = () => {
    const [showAll, setShowAll] = useState(false)

    const getIcon = useNodesDisplaySettings(s => s.getIcon)
    const colors = useNodesDisplaySettings(s => s.colors)
    const entries = Object.entries(colors)
    const visibleEntries = showAll ? entries : entries.slice(0, MAX_ENTRIES)
    const left = entries.length - MAX_ENTRIES


    return (
        <div className='absolute text-xs bottom-2 left-2'>
            <Card className='p-2 rounded backdrop-blur-sm bg-background/30 border-none'>
                <div>
                    <ul className={cn('grid grid-cols-2 items-center gap-1', showAll && 'grid-cols-3')}>
                        <AnimatePresence initial={false}>
                            {visibleEntries.map(([key, value]) => (
                                <motion.li
                                    key={key}
                                    layout
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className='flex items-center gap-2'>
                                        {/* @ts-ignore */}
                                        <span>{getIcon(key)}</span>
                                        <span className='capitalize'>{key.split("_").join(" ")}</span>
                                        <span
                                            className='w-2 h-2 rounded-full'
                                            style={{ backgroundColor: value }}
                                        ></span>
                                    </div>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </ul>
                    {entries.length > MAX_ENTRIES && (
                        <motion.button
                            onClick={() => setShowAll(prev => !prev)}
                            className='mt-2 text-blue-500 hover:underline'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {showAll ? 'Show less' : `Show  more (${left})`}
                        </motion.button>
                    )}
                </div>
            </Card>
        </div>
    )
}

export default memo(Legend)
