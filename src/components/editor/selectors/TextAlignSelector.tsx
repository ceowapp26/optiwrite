import { cn } from "@/lib/utils";
import { EditorBubbleItem, useEditor } from "../core/index";
import { Button } from "../ui/EditorButton";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RemoveFormatting,
  Check,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export type SelectorItem = {
  name: string;
  icon: LucideIcon;
  command: (editor: ReturnType<typeof useEditor>["editor"]) => void;
  isActive: (editor: ReturnType<typeof useEditor>["editor"]) => boolean;
};

const items: SelectorItem[] = [
  {
    name: "Left",
    icon: AlignLeft,
    command: (editor) => editor.chain().focus().setTextAlign("left").run(),
    isActive: (editor) => editor.isActive({ textAlign: "left" }),
  },
  {
    name: "Center",
    icon: AlignCenter,
    command: (editor) => editor.chain().focus().setTextAlign("center").run(),
    isActive: (editor) => editor.isActive({ textAlign: "center" }),
  },
  {
    name: "Right",
    icon: AlignRight,
    command: (editor) => editor.chain().focus().setTextAlign("right").run(),
    isActive: (editor) => editor.isActive({ textAlign: "right" }),
  },
  {
    name: "Justify",
    icon: AlignJustify,
    command: (editor) => editor.chain().focus().setTextAlign("justify").run(),
    isActive: (editor) => editor.isActive({ textAlign: "justify" }),
  },
  {
    name: "Unset",
    icon: RemoveFormatting,
    command: (editor) => editor.chain().focus().unsetTextAlign().run(),
    isActive: (editor) => !editor.isActive({ textAlign: "left" }) && 
                           !editor.isActive({ textAlign: "center" }) &&
                           !editor.isActive({ textAlign: "right" }) &&
                           !editor.isActive({ textAlign: "justify" }),
  },
];

interface TextAlignSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TextAlignSelector = ({ open, onOpenChange }: TextAlignSelectorProps) => {
  const { editor } = useEditor();
  
  if (!editor) return null;

  const activeItem = items.find((item) => item.isActive(editor));
  const ActiveIcon = activeItem ? activeItem.icon : AlignJustify;

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-2 rounded-none border-none hover:bg-accent focus:ring-0">
          <ActiveIcon className="h-4 w-4" />
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={5} align="start" className="w-48 p-1">
        {items.map((item) => (
          <EditorBubbleItem
            key={item.name}
            onSelect={() => {
              item.command(editor);
              onOpenChange(false);
            }}
            className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1 text-sm hover:bg-accent"
          >
            <div className="flex items-center space-x-2">
              <div className="rounded-sm border p-1">
                <item.icon className="h-3 w-3" />
              </div>
              <span>{item.name}</span>
            </div>
            {activeItem.name === item.name && <Check className="h-4 w-4" />}
          </EditorBubbleItem>
        ))}
      </PopoverContent>
    </Popover>
  );
};

TextAlignSelector.displayName = "TextAlignSelector";
