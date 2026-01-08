import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type * as LucideIcons from 'lucide-react'

export type ItemType =
  | 'individual'
  | 'phone'
  | 'location'
  | 'email'
  | 'ip'
  | 'port'
  | 'socialaccount'
  | 'organization'
  | 'vehicle'
  | 'car'
  | 'motorcycle'
  | 'boat'
  | 'plane'
  | 'website'
  | 'domain'
  | 'document'
  | 'financial'
  | 'event'
  | 'device'
  | 'media'
  | 'education'
  | 'relationship'
  | 'online_activity'
  | 'digital_footprint'
  | 'biometric'
  | 'credential'
  | 'username'
  | 'siret'
  | 'siren'
  | 'cryptowallet'
  | 'cryptotransaction'
  | 'cryptonft'
  | 'asn'
  | 'cidr'
  | 'whois'
  | 'gravatar'
  | 'breach'
  | 'webtracker'
  | 'session'
  | 'dnsrecord'
  | 'ssl'
  | 'message'
  | 'malware'
  | 'weapon'
  | 'script'
  | 'reputation'
  | 'risk'
  | 'file'
  | 'bank'
  | 'creditcard'
  | 'alias'
  | 'affiliation'
  | 'phrase'

export const ITEM_TYPES: ItemType[] = [
  'individual',
  'phone',
  'location',
  'email',
  'ip',
  'port',
  'socialaccount',
  'organization',
  'vehicle',
  'car',
  'motorcycle',
  'boat',
  'plane',
  'website',
  'domain',
  'document',
  'financial',
  'event',
  'device',
  'media',
  'education',
  'relationship',
  'online_activity',
  'digital_footprint',
  'biometric',
  'credential',
  'username',
  'siret',
  'siren',
  'cryptowallet',
  'cryptotransaction',
  'cryptonft',
  'asn',
  'cidr',
  'whois',
  'gravatar',
  'breach',
  'webtracker',
  'session',
  'dnsrecord',
  'ssl',
  'message',
  'malware',
  'weapon',
  'script',
  'reputation',
  'risk',
  'file',
  'bank',
  'creditcard',
  'alias',
  'affiliation',
  'phrase'
]

// Icon mapping for each item type (Lucide icons)
export const TYPE_TO_ICON: Record<string, keyof typeof LucideIcons> = {
  individual: 'User',
  phone: 'Phone',
  location: 'MapPin',
  email: 'Mail',
  ip: 'Network',
  port: 'Plug',
  socialaccount: 'Share2',
  organization: 'Building2',
  vehicle: 'Car',
  car: 'Car',
  motorcycle: 'Bike',
  boat: 'Ship',
  plane: 'Plane',
  website: 'Globe',
  domain: 'Globe',
  document: 'FileText',
  financial: 'DollarSign',
  event: 'Calendar',
  device: 'Smartphone',
  media: 'Image',
  education: 'GraduationCap',
  relationship: 'Users',
  online_activity: 'Activity',
  digital_footprint: 'Footprints',
  biometric: 'Fingerprint',
  credential: 'Key',
  username: 'UserPlus',
  siret: 'Building',
  siren: 'Building',
  cryptowallet: 'Wallet',
  cryptotransaction: 'ArrowRightLeft',
  cryptonft: 'Image',
  asn: 'Network',
  cidr: 'Network',
  whois: 'Info',
  gravatar: 'UserCircle',
  breach: 'ShieldAlert',
  webtracker: 'Target',
  session: 'Clock',
  dnsrecord: 'Database',
  ssl: 'Lock',
  message: 'MessageSquare',
  malware: 'Bug',
  weapon: 'Sword',
  script: 'FileCode',
  reputation: 'Star',
  risk: 'AlertTriangle',
  file: 'File',
  bank: 'Landmark',
  creditcard: 'CreditCard',
  alias: 'UserCog',
  affiliation: 'Link2',
  phrase: 'Quote',
  default: 'Circle'
}

const DEFAULT_COLORS: Record<ItemType, string> = {
  individual: '#4C8EDA', // bleu moyen
  phone: '#4CB5AE', // teal doux
  location: '#E57373', // rouge rosé
  email: '#8E7CC3', // violet pastel
  ip: '#5AA1C8', // orange chaud
  port: '#4CB5DA', // cyan clair
  socialaccount: '#A76DAA', // mauve
  organization: '#BCA18A', // taupe clair
  vehicle: '#E1B84D', // jaune doux
  car: '#BFAF7A', // olive beige
  motorcycle: '#A78B6C', // brun taupe
  boat: '#6FB1C5', // bleu teal
  plane: '#C1A78E', // brun clair
  website: '#D279A6', // rose pastel
  domain: '#66A892', // vert sauge
  document: '#8F9CA3', // gris bleuté
  financial: '#E98973', // corail doux
  event: '#6DBBA2', // vert menthe
  device: '#E3A857', // orange sable
  media: '#C97C73', // terracotta
  education: '#6C8CBF', // bleu acier
  relationship: '#B18B84', // brun rosé
  online_activity: '#7EAD6F', // vert sauge
  digital_footprint: '#B97777', // brique
  username: '#8B83C1', // pervenche
  credential: '#D4B030', // doré doux
  biometric: '#7F868D', // gris ardoise
  siret: '#7D8B99', // gris bleu
  siren: '#687684', // gris foncé
  cryptowallet: '#D4B030', // or clair
  cryptotransaction: '#BFA750', // or chaud
  cryptonft: '#A5BF50', // vert lime doux
  asn: '#D97474', // pêche rosée
  cidr: '#80BF80', // vert menthe
  whois: '#9B6F9B', // violet doux
  gravatar: '#6CB7CA', // cyan clair
  breach: '#CC7A7A', // rose chaud
  webtracker: '#C7BF50', // jaune doux
  session: '#A8BF50', // lime atténué
  dnsrecord: '#BFAF80', // vert teal clair
  ssl: '#BFAF80', // sable chaud
  message: '#897FC9', // violet lavande
  malware: '#4AA29E', // teal saturé
  weapon: '#E98973', // corail brun
  script: '#A36FA3', // violet doux
  reputation: '#6FA8DC', // bleu clair
  risk: '#D97474', // rouge doux
  file: '#8F9CA3', // gris bleuté
  bank: '#D4B030', // or clair
  creditcard: '#285E8E', // bleu profond
  alias: '#A36FA3', // violet
  affiliation: '#66A892', // vert sauge
  phrase: '#BFA77A' // beige chaud
}

const hslToHex = (h: number, s: number, l: number): string => {
  const s1 = s / 100
  const l1 = l / 100
  const c = (1 - Math.abs(2 * l1 - 1)) * s1
  const hh = h / 60
  const x = c * (1 - Math.abs((hh % 2) - 1))
  let r1 = 0,
    g1 = 0,
    b1 = 0
  if (hh >= 0 && hh < 1) {
    r1 = c
    g1 = x
    b1 = 0
  } else if (hh >= 1 && hh < 2) {
    r1 = x
    g1 = c
    b1 = 0
  } else if (hh >= 2 && hh < 3) {
    r1 = 0
    g1 = c
    b1 = x
  } else if (hh >= 3 && hh < 4) {
    r1 = 0
    g1 = x
    b1 = c
  } else if (hh >= 4 && hh < 5) {
    r1 = x
    g1 = 0
    b1 = c
  } else {
    r1 = c
    g1 = 0
    b1 = x
  }
  const m = l1 - c / 2
  const r = Math.round((r1 + m) * 255)
  const g = Math.round((g1 + m) * 255)
  const b = Math.round((b1 + m) * 255)
  const toHex = (v: number) => v.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const randomizeColors = (colors: Record<ItemType, string>): Record<ItemType, string> => {
  const next: Record<ItemType, string> = { ...colors }
  ITEM_TYPES.forEach((t) => {
    // Simple, slightly vibrant but not neon
    const h = Math.floor(Math.random() * 360)
    const s = Math.floor(45 + Math.random() * 15) // 45% - 60%
    const l = Math.floor(65 + Math.random() * 10) // 65% - 75%
    next[t] = hslToHex(h, s, l)
  })
  return next
}

interface NodesDisplaySettingsState {
  colors: Record<ItemType, string>
  customIcons: Record<string, keyof typeof LucideIcons>
  setColor: (itemType: ItemType, color: string) => void
  setIcon: (itemType: string, iconName: keyof typeof LucideIcons) => void
  resetSettings: () => void
  randomizeColors: () => void
  resetAll: () => void
  getIcon: (itemType: ItemType) => keyof typeof LucideIcons
}

export const useNodesDisplaySettings = create<NodesDisplaySettingsState>()(
  persist(
    (set, get) => ({
      colors: { ...DEFAULT_COLORS },
      customIcons: { ...TYPE_TO_ICON },
      setColor: (itemType, color) =>
        set((state) => ({
          colors: {
            ...state.colors,
            [itemType]: color
          }
        })),
      setIcon: (itemType, iconName) =>
        set((state) => ({
          customIcons: {
            ...state.customIcons,
            [itemType]: iconName
          }
        })),
      resetSettings: () => set({ colors: { ...DEFAULT_COLORS }, customIcons: TYPE_TO_ICON }),
      randomizeColors: () => set({ colors: randomizeColors(get().colors) }),
      resetAll: () =>
        set({
          colors: { ...DEFAULT_COLORS },
          customIcons: {}
        }),
      getIcon: (itemType) => {
        const customIcon = get().customIcons[itemType]
        if (customIcon) return customIcon
        return TYPE_TO_ICON[itemType] || TYPE_TO_ICON.default
      }
    }),
    {
      name: 'nodes-display-settings'
    }
  )
)
