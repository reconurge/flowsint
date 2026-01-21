import { Dispatch, SetStateAction, useMemo, useRef, useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useVirtualizer } from '@tanstack/react-virtual'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'

// Curated list of popular and useful Lucide icons
const AVAILABLE_ICONS = [
  'User',
  'Users',
  'UserPlus',
  'UserMinus',
  'UserCheck',
  'UserX',
  'UserCog',
  'UserCircle',
  'UserCircle2',
  'Phone',
  'PhoneCall',
  'PhoneIncoming',
  'PhoneOutgoing',
  'Smartphone',
  'Mail',
  'MailOpen',
  'Inbox',
  'Send',
  'MapPin',
  'Map',
  'Navigation',
  'Globe',
  'Globe2',
  'Network',
  'Wifi',
  'WifiOff',
  'Share2',
  'Link',
  'Link2',
  'Unlink',
  'Building',
  'Building2',
  'Home',
  'Briefcase',
  'Landmark',
  'Store',
  'Factory',
  'Warehouse',
  'Car',
  'Bike',
  'Ship',
  'Plane',
  'Rocket',
  'Train',
  'Bus',
  'Truck',
  'FileText',
  'File',
  'Files',
  'FileCode',
  'FileJson',
  'FileLock',
  'FileKey',
  'Folder',
  'FolderOpen',
  'DollarSign',
  'Wallet',
  'CreditCard',
  'Coins',
  'Banknote',
  'TrendingUp',
  'Calendar',
  'CalendarDays',
  'Clock',
  'Timer',
  'Image',
  'Images',
  'Video',
  'Film',
  'Music',
  'Mic',
  'Camera',
  'GraduationCap',
  'BookOpen',
  'Library',
  'School',
  'Activity',
  'TrendingUp',
  'BarChart',
  'LineChart',
  'PieChart',
  'Fingerprint',
  'ScanFace',
  'Key',
  'Lock',
  'Unlock',
  'Shield',
  'ShieldAlert',
  'ShieldCheck',
  'Bug',
  'AlertTriangle',
  'AlertCircle',
  'AlertOctagon',
  'Target',
  'Crosshair',
  'Database',
  'Server',
  'HardDrive',
  'Cpu',
  'MessageSquare',
  'MessageCircle',
  'Mail',
  'Sword',
  'Star',
  'StarHalf',
  'Heart',
  'ThumbsUp',
  'ThumbsDown',
  'Circle',
  'Square',
  'Triangle',
  'Hexagon',
  'Diamond',
  'Award',
  'Trophy',
  'Medal',
  'Gift',
  'Package',
  'Archive',
  'Plug',
  'Cable',
  'Wifi',
  'Bluetooth',
  'Usb',
  'Info',
  'HelpCircle',
  'CheckCircle',
  'XCircle',
  'Plus',
  'Minus',
  'X',
  'Check',
  'Search',
  'Filter',
  'SlidersHorizontal',
  'Settings',
  'Tool',
  'Wrench',
  'Hash',
  'AtSign',
  'Percent',
  'Power',
  'Zap',
  'Flame',
  'Droplet',
  'Wind',
  'Cloud',
  'Sun',
  'Moon',
  'Eye',
  'EyeOff',
  'Download',
  'Upload',
  'Shuffle',
  'Repeat',
  'RotateCw',
  'RefreshCw',
  'Copy',
  'Clipboard',
  'Edit',
  'Edit3',
  'Trash',
  'Trash2',
  'Save',
  'Bookmark',
  'Tag',
  'Tags',
  'Flag',
  'Bell',
  'BellOff',
  'Volume2',
  'VolumeX',
  'Play',
  'Pause',
  'StopCircle',
  'SkipForward',
  'SkipBack',
  'FastForward',
  'Rewind',
  'Maximize',
  'Minimize',
  'Expand',
  'Shrink',
  'ArrowRight',
  'ArrowLeft',
  'ArrowUp',
  'ArrowDown',
  'ArrowRightLeft',
  'ArrowUpDown',
  'ChevronsRight',
  'ChevronsLeft',
  'ChevronsUp',
  'ChevronsDown',
  'MoreHorizontal',
  'MoreVertical',
  'Footprints',
  'Smile',
  'Frown',
  'Meh',
  'Code',
  'Code2',
  'Terminal',
  'Command',
  'Binary',
  'Braces',
  'GitBranch',
  'GitCommit',
  'GitMerge',
  'Github',
  'Chrome',
  'Facebook',
  'Twitter',
  'Instagram',
  'Linkedin',
  'Quote',
  'BookmarkPlus'
] as const

type IconPopoverProps = {
  iconType: string | null
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  onIconChange: (
    iconType: IconPopoverProps['iconType'],
    iconName: keyof typeof AVAILABLE_ICONS
  ) => void
}

export default function IconPicker({ iconType, open, setOpen, onIconChange }: IconPopoverProps) {
  const [search, setSearch] = useState('')
  const [isReady, setIsReady] = useState(false)
  const parentRef = useRef<HTMLDivElement>(null)

  const filteredIcons = useMemo(() => {
    const searchLower = search.toLowerCase()
    return AVAILABLE_ICONS.filter((icon) => icon.toLowerCase().includes(searchLower))
  }, [search])

  const COLUMNS = 6
  const ICON_SIZE = 56

  const rows = Math.ceil(filteredIcons.length / COLUMNS)

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ICON_SIZE,
    overscan: 5
  })

  const handleClick = (
    iconType: IconPopoverProps['iconType'],
    iconName: keyof typeof AVAILABLE_ICONS
  ) => {
    onIconChange(iconType, iconName)
    setOpen(false)
  }

  // Reset and initialize when dialog opens
  useEffect(() => {
    if (open) {
      setSearch('')
      setIsReady(false)
      // Wait for dialog to render and measure
      const timer = setTimeout(() => {
        setIsReady(true)
        virtualizer.measure()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      setIsReady(false)
    }
  }, [open, virtualizer])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {iconType ? (
              <>
                Change icon for <span className="text-primary">{iconType}</span>
              </>
            ) : (
              <>Select an icon</>
            )}
          </DialogTitle>
          <DialogDescription>
            Choose from {AVAILABLE_ICONS.length} available Lucide icons
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />

          <div ref={parentRef} className="h-[400px] overflow-auto rounded-md border border-border">
            {!isReady ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground text-sm">Loading icons...</div>
              </div>
            ) : filteredIcons.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground text-sm">
                  No icons found matching "{search}"
                </div>
              </div>
            ) : (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative'
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const startIdx = virtualRow.index * COLUMNS
                  const rowIcons = filteredIcons.slice(startIdx, startIdx + COLUMNS)

                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`
                      }}
                    >
                      <div className="grid grid-cols-6 gap-2 p-2">
                        {rowIcons.map((iconName) => {
                          const Icon = (LucideIcons as any)[iconName]

                          if (!Icon) return null

                          return (
                            <button
                              key={iconName}
                              onClick={() => handleClick(iconType, iconName)}
                              className={cn(
                                'flex h-12 w-full flex-col items-center justify-center gap-1 rounded-md border border-border p-2 transition-colors hover:bg-accent hover:text-accent-foreground',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                              )}
                              title={iconName}
                            >
                              <Icon size={24} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
