import { PlusIcon } from 'lucide-react'
import { memo } from 'react'
import { Button } from '@/components/ui/button'
import NewActions from './new-actions'


const EmptyState = memo(() => (
    <div className="flex relative bg-background gap-3 h-full flex-col w-full items-center justify-center">
        Your nodes will be displayed here.
        <NewActions>
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none">
                Add your first item <PlusIcon />
            </Button>
        </NewActions>
    </div>
))

EmptyState.displayName = "EmptyState"

export default EmptyState
