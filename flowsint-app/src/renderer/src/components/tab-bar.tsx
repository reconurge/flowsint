import { useBoundStore } from '@/store/useBoundStore'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { MdAdd } from 'react-icons/md'
import { Tab } from './tab'

export default function TabBar() {
  const tabs = useBoundStore((state) => state.tabs.items)
  const setSelectedTab = useBoundStore((state) => state.tabs.setSelectedTab)
  const remove = useBoundStore((state) => state.tabs.remove)
  const add = useBoundStore((state) => state.tabs.add)
  const setTabs = useBoundStore((state) => state.tabs.reorder)
  const selectedTab = useBoundStore((state) => state.tabs.selectedTabId)
  const selectedTabIndex = useBoundStore((state) => state.tabs.selectedTabIndex)
  return (
    <div className="flex flex-row flex-grow bg-background">
      <Reorder.Group
        as="ul"
        axis="x"
        onReorder={setTabs}
        className="flex-grow flex-nowrap flex justify-start items-center pr-[10px]"
        values={tabs}
      >
        <AnimatePresence initial={false}>
          {tabs.map((item, index) => (
            <Tab
              key={item.id}
              item={item}
              isSelected={selectedTab === item.id}
              onClick={() => setSelectedTab(item)}
              onRemove={() => remove(item)}
              showSeparator={index !== selectedTabIndex - 1 && tabs.length > 2}
            />
          ))}
          <motion.button
            className="titlebar-button flex items-center justify-center hover:bg-white/5
              rounded-full h-6 w-6  transition-all duration-300 ml-2"
            onClick={add}
            whileTap={{ scale: 0.9 }}
          >
            <MdAdd className="opacity-55 hover:opacity-100 transition-all text-white duration-300" />
          </motion.button>
        </AnimatePresence>
      </Reorder.Group>
    </div>
  )
}

