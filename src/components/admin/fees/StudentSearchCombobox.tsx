import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Student {
  user_id: string;
  full_name: string;
  email?: string;
}

interface Props {
  students: Student[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const StudentSearchCombobox = ({ students, value, onChange, placeholder = "Search student..." }: Props) => {
  const [open, setOpen] = useState(false);

  const selectedStudent = students.find((s) => s.user_id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 min-w-[200px] justify-between font-normal"
        >
          {selectedStudent ? selectedStudent.full_name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type name to search..." />
          <CommandList>
            <CommandEmpty>No student found.</CommandEmpty>
            <CommandGroup className="max-h-[250px]">
              {students.map((s) => (
                <CommandItem
                  key={s.user_id}
                  value={s.full_name}
                  onSelect={() => {
                    onChange(s.user_id === value ? "" : s.user_id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === s.user_id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex flex-col">
                    <span>{s.full_name}</span>
                    {s.email && <span className="text-xs text-muted-foreground">{s.email}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default StudentSearchCombobox;
