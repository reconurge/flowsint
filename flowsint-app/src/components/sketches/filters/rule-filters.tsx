import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, XIcon } from "lucide-react"
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { memo, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import type { RuleFilter, Filters, RuleKey, RuleOperator } from "@/types/filter"

type RuleFiltersProps = {
  filters: Filters
  setFilters: (filters: Filters) => void
}

function RuleFilters({ filters, setFilters }: RuleFiltersProps) {
  const [draft, setDraft] = useState<Filters>(filters)

  const { rules } = draft

  const setDraftRules = (newRules: RuleFilter[]) => {
    setDraft(prev => ({ ...prev, rules: newRules }))
  }

  const addRule = () => {
    setDraftRules([
      ...rules,
      {
        id: uuidv4(),
        key: "label",
        operator: "is",
        matcher: ""
      }
    ])
  }

  const removeRule = (id: string) => {
    setDraftRules(rules.filter(r => r.id !== id))
  }

  const updateRule = (id: string, patch: Partial<Omit<RuleFilter, "id">>) => {
    setDraftRules(
      rules.map(r => (r.id === id ? { ...r, ...patch } : r))
    )
  }

  const applyChanges = () => {
    setFilters(draft)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="opacity-90 text-sm">Filter by rule</p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-dashed h-7 text-xs"
            size="sm"
            onClick={addRule}
          >
            <Plus className="text-muted-foreground !h-3 !w-3" /> New rule
          </Button>

          <Button
            disabled={rules.length === 0}
            variant="default"
            className="h-7 text-xs"
            size="sm"
            onClick={applyChanges}
          >
            Apply
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Start by adding a filter rule.
        </p>
      ) : (
        <ul className="space-y-2">
          {rules.map(rule => (
            <RuleItem
              key={rule.id}
              rule={rule}
              onChange={patch => updateRule(rule.id, patch)}
              onRemove={() => removeRule(rule.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}


type RuleItemProps = {
  rule: RuleFilter
  onChange: (patch: Partial<Omit<RuleFilter, "id">>) => void
  onRemove: () => void
}

const RuleItem = memo(({ rule, onChange, onRemove }: RuleItemProps) => (
  <li>
    <div className="flex gap-2 justify-between">
      <KeyDropDown value={rule.key} onChange={(v) => onChange({ key: v })} />

      <OperatorDropDown value={rule.operator} onChange={(v) => onChange({ operator: v })} />

      <Input
        value={rule.matcher}
        onChange={e => onChange({ matcher: e.target.value })}
        className="h-7 grow w-1/3"
        placeholder="matcher"
      />

      <Button
        onClick={onRemove}
        variant="ghost"
        size="icon"
        className="rounded-full h-7 w-7 hover:bg-muted"
      >
        <XIcon />
      </Button>
    </div>
  </li>
))


const KEYS: RuleKey[] = ["label", "domain", "ip"]
const OPERATORS: RuleOperator[] = ["is", "not", "like", "startsWith", "endsWith"]

const KeyDropDown = memo(({ value, onChange }: { value: RuleKey, onChange: (v: RuleKey) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="!h-7 w-1/3">
      <SelectValue placeholder="property" />
    </SelectTrigger>
    <SelectContent>
      {KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
    </SelectContent>
  </Select>
))

const OperatorDropDown = memo(({ value, onChange }: { value: RuleOperator, onChange: (v: RuleOperator) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="!h-7 grow w-1/3">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {OPERATORS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
    </SelectContent>
  </Select>
))

export default RuleFilters
