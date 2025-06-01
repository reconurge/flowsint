import { TabInfo } from '@/types/tabs'
import { cn } from '@/utils/cn'
import { motion, Reorder } from 'framer-motion'
import { VscClose } from 'react-icons/vsc'

interface Props {
  item: TabInfo
  isSelected: boolean
  showSeparator: boolean
  onClick: () => void
  onRemove: () => void
}

export const Tab = ({ item, onClick, onRemove, isSelected, showSeparator }: Props) => {
  return (
    <Reorder.Item
      value={item}
      id={item.id}
      initial={{
        opacity: 1,
        y: 30
      }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.1, ease: 'easeInOut' }
      }}
      exit={{ opacity: 0, y: 20, transition: { duration: 0.15 } }}
      whileDrag={{
        transition: { ease: 'easeInOut' }
      }}
      className={cn(
        isSelected ? 'selected bg-card text-white border-border border-b-transparent' : 'bg-background text-white border-transparent',
        'titlebar-button min-w-[120px] max-w-[200px]',
        `h-8 pl-4 relative cursor-pointer flex justify-between items-center
        flex-1 overflow-hidden select-none border border-transparent`
      )}
      onPointerDown={onClick}
    >
      <motion.span
        className={cn(
          `text-xs text-center flex-shrink flex-grow leading-[18px] whitespace-nowrap block
          min-w-0 pr-[30px] truncate`,
          isSelected ? 'text-foreground' : 'text-white'
        )}
        layout="position"
      >{`${item.title} ${item.id}`}</motion.span>
      <motion.div
        layout
        className="absolute top-0 bottom-0 right-[0px] flex align-center items-center justify-end
          flex-shrink-0 pr-2"
      >
        <motion.button
          onPointerDown={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          initial={false}
          animate={{
            backgroundColor: 'hsl(var(--transparent))'
          }}
          className="h-full flex items-center"
        >
          <VscClose
            className={cn(
              'rounded-full transition-all duration-300',
              isSelected ? 'hover:bg-black/20' : 'hover:bg-white/20'
            )}
          />
        </motion.button>
        <div
          className={cn(
            isSelected || !showSeparator ? 'invisible' : 'visible',
            'bg-white/20 w-[1.5px] h-[15px] ml-2'
          )}
        />
      </motion.div>
    </Reorder.Item>
  )
}
