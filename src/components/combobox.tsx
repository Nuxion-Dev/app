"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type Option = {
    value: string;
    label: string;
}

type ComboboxProps = {
    className?: string;
    options: Option[];
    value?: string;
    onChange?: (value: Option) => void;
    placeholder?: string;
    noOptionsText?: string;
    searchText?: string;
}

export default function Combobox({
    className,
    options,
    value,
    onChange,
    placeholder,
    noOptionsText,
    searchText
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState(value || "")

  return (
    <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn("w-[200px] justify-between", className)}
            >
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {selected
                        ? options.find((option) => option.value === selected)?.label
                        : placeholder || "Select option..."
                    }
                </span>
                <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
                <CommandInput placeholder={searchText || "Search option..."} />
                <CommandList>
                    <CommandEmpty>{noOptionsText || "No options found."}</CommandEmpty>
                    <CommandGroup>
                        {options.map((option) => (
                            <CommandItem
                                key={option.value}
                                value={option.value}
                                onSelect={(currentValue) => {
                                    onChange?.(option)
                                    setSelected(currentValue === selected ? "" : currentValue)
                                    setOpen(false)
                                }}
                            >
                                <CheckIcon
                                    className={cn(
                                    "mr-2 h-4 w-4",
                                    selected === option.value ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {option.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
  )
}