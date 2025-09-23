import React from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit3, Eye, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DraggableCardProps {
  id: string
  title: string
  children: React.ReactNode
  isEditing: boolean
  onToggleEdit: () => void
  className?: string
  showEditButton?: boolean
  description?: string
}

export const DraggableCard: React.FC<DraggableCardProps> = ({
  id,
  title,
  children,
  isEditing,
  onToggleEdit,
  className,
  showEditButton = true,
  description
}) => {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, zIndex: 10 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn('border bg-card/50 transition-all', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing reorder-handle ">
              <div className="p-4" onPointerDown={(e) => controls.start(e)}>
                <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
              </div>
              <CardTitle className="text-base font-medium">{title}</CardTitle>
            </div>
            {showEditButton && (
              <Button variant="ghost" size="sm" onClick={onToggleEdit} className="h-8 w-8 p-0">
                {isEditing ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </Reorder.Item>
  )
}
