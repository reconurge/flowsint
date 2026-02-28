// src/components/ui/tags-input.tsx
import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TagsInputProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  orientation: 'vertical' | 'horizontal';
}

function TagsInput({
  value,
  onChange,
  placeholder = "Input new tag...",
  disabled = false,
  orientation = 'vertical',
  className,
  ...props
}: TagsInputProps) {
  const [inputValue, setInputValue] = React.useState("");

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        orientation === 'horizontal' 
          ? "flex-wrap items-center gap-2" 
          : "flex-col items-end gap-2",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1">
          {tag}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => removeTag(tag)}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Delete tag {tag}</span>
          </Button>
        </Badge>
      ))}
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 border-0 bg-transparent p-0 text-sm outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
          "text-center"
        )}
      />
    </div>
  );
}

export { TagsInput }