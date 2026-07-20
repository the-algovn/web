"use client"

import { Button } from "@algovn/ui/button"
import { Calendar } from "@algovn/ui/calendar"
import { Checkbox } from "@algovn/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@algovn/ui/command"
import { Input } from "@algovn/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@algovn/ui/input-otp"
import { Label } from "@algovn/ui/label"
import { cn } from "@algovn/ui/lib/utils"
import { PageHeader } from "@algovn/ui/page-header"
import { Popover, PopoverContent, PopoverTrigger } from "@algovn/ui/popover"
import { RadioGroup, RadioGroupItem } from "@algovn/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@algovn/ui/select"
import { Slider } from "@algovn/ui/slider"
import { Switch } from "@algovn/ui/switch"
import { Textarea } from "@algovn/ui/textarea"
import { format } from "date-fns"
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react"
import * as React from "react"
import { Demo } from "@/components/demo"

const frameworks = [
  { value: "next.js", label: "Next.js" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt.js", label: "Nuxt.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
]

function DatePickerDemo() {
  const [date, setDate] = React.useState<Date>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-56 justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={setDate} />
      </PopoverContent>
    </Popover>
  )
}

function ComboboxDemo() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-56 justify-between"
        >
          {value
            ? frameworks.find((framework) => framework.value === value)?.label
            : "Select framework..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Search framework..." />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {frameworks.map((framework) => (
                <CommandItem
                  key={framework.value}
                  value={framework.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      value === framework.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {framework.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function InputsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title="Inputs"
        description="Text, select, date and combobox controls."
      />
      <Demo title="Input">
        <Input className="w-56" />
        <Input className="w-56" placeholder="Email address" />
        <Input className="w-56" placeholder="Disabled" disabled />
        <Input className="w-56" type="password" defaultValue="hunter2!" />
        <div className="grid w-56 gap-1.5">
          <Label htmlFor="input-name">Name</Label>
          <Input id="input-name" placeholder="Ada Lovelace" />
        </div>
      </Demo>
      <Demo title="Textarea">
        <Textarea className="w-64" placeholder="Type your message here." />
        <Textarea className="w-64" placeholder="Disabled" disabled />
      </Demo>
      <Demo title="Select">
        <Select>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select a framework" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next">Next.js</SelectItem>
            <SelectItem value="remix">Remix</SelectItem>
            <SelectItem value="astro">Astro</SelectItem>
            <SelectItem value="gatsby" disabled>
              Gatsby (deprecated)
            </SelectItem>
          </SelectContent>
        </Select>
      </Demo>
      <Demo title="Checkbox">
        <Checkbox aria-label="Unchecked" />
        <Checkbox aria-label="Checked" defaultChecked />
        <Checkbox aria-label="Disabled" disabled />
        <div className="flex items-center gap-2">
          <Checkbox id="checkbox-terms" />
          <Label htmlFor="checkbox-terms">Accept terms and conditions</Label>
        </div>
      </Demo>
      <Demo title="Radio Group">
        <RadioGroup defaultValue="daily">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="daily" id="radio-daily" />
            <Label htmlFor="radio-daily">Daily</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="weekly" id="radio-weekly" />
            <Label htmlFor="radio-weekly">Weekly</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="monthly" id="radio-monthly" disabled />
            <Label htmlFor="radio-monthly">Monthly (unavailable)</Label>
          </div>
        </RadioGroup>
      </Demo>
      <Demo title="Switch">
        <Switch aria-label="Off" />
        <Switch aria-label="On" defaultChecked />
        <Switch aria-label="Disabled" disabled />
        <div className="flex items-center gap-2">
          <Switch id="switch-airplane-mode" />
          <Label htmlFor="switch-airplane-mode">Airplane mode</Label>
        </div>
      </Demo>
      <Demo title="Slider">
        <Slider className="w-56" defaultValue={[50]} />
        <Slider className="w-56" defaultValue={[20, 80]} />
      </Demo>
      <Demo title="Input OTP">
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </Demo>
      <Demo title="Date Picker">
        <DatePickerDemo />
      </Demo>
      <Demo title="Combobox">
        <ComboboxDemo />
      </Demo>
    </div>
  )
}
