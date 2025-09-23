import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { KeyService } from '@/api/key-service'
import { type Key as KeyType } from '@/types/key'

export default function KeySelector({
  onChange,
  value
}: {
  onChange: (value: KeyType) => void
  value?: KeyType
}) {
  // Fetch keys
  const { data: keys = [], isLoading } = useQuery<KeyType[]>({
    queryKey: ['keys'],
    queryFn: () => KeyService.get()
  })

  const handleValueChange = (keyId: string) => {
    const selectedKey = keys.find((key) => key.id === keyId)
    if (selectedKey) {
      onChange(selectedKey)
    }
  }

  return (
    <Select onValueChange={handleValueChange} value={value?.id || ''} disabled={isLoading}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a key" />
      </SelectTrigger>
      <SelectContent>
        {keys.map((key: KeyType) => (
          <SelectItem key={key.id} value={key.id}>
            {key.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
