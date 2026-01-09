import { Button } from '@/components/ui/button'
import { useIcon } from '@/hooks/use-icon'

type NodeIconTriggerProps = {
  type: string
  onClick: () => void
}
export const NodeIconTrigger = ({ type, onClick }: NodeIconTriggerProps) => {
  const Icon = useIcon(type)
  return (
    <Button
      className="cursor-pointer hover:bg-muted"
      onClick={onClick}
      variant={'ghost'}
      size={'icon'}
    >
      <Icon size={24} />
    </Button>
  )
}
