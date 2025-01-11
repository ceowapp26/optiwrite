import { cn } from "@/lib/utils";
import { EditorBubbleItem, useEditor } from "../core/index";
import { Button } from "../ui/EditorButton";
import { ChevronDown, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type SelectorItem = {
  name: string;
  value: string;
  fontFamily: string;
  command: (editor: ReturnType<typeof useEditor>["editor"]) => void;
  isActive: (editor: ReturnType<typeof useEditor>["editor"]) => boolean;
};

const items: SelectorItem[] = [
  {
    name: "Default",
    value: "default",
    fontFamily: "inherit",
    command: (editor) => editor.chain().focus().unsetFontFamily().run(),
    isActive: (editor) => editor.isActive({ textStyle: { fontFamily: "" } })
  },
  {
    name: "Inter",
    value: "Inter",
    fontFamily: "Inter",
    command: (editor) => editor.chain().focus().setFontFamily("Inter").run(),
    isActive: (editor) => editor.isActive({ textStyle: { fontFamily: "Inter" } })
  },
  {
    name: "Comic Sans",
    value: "Comic Sans MS, Comic Sans",
    fontFamily: "Comic Sans MS, Comic Sans",
    command: (editor) => editor.chain().focus().setFontFamily("Comic Sans MS, Comic Sans").run(),
    isActive: (editor) => editor.isActive({ textStyle: { fontFamily: "Comic Sans MS, Comic Sans" } })
  },
  {
    name: "Cursive",
    value: "cursive",
    fontFamily: "cursive",
    command: (editor) => editor.chain().focus().setFontFamily("cursive").run(),
    isActive: (editor) => editor.isActive({ textStyle: { fontFamily: "cursive" } })
  },
  {
    name: "Monospace",
    value: "monospace",
    fontFamily: "monospace",
    command: (editor) => editor.chain().focus().setFontFamily("monospace").run(),
    isActive: (editor) => editor.isActive({ textStyle: { fontFamily: "monospace" } })
  },
  {
    name: "Serif",
    value: "serif",
    fontFamily: "serif",
    command: (editor) => editor.chain().focus().setFontFamily("serif").run(),
    isActive: (editor) => editor.isActive({ textStyle: { fontFamily: "serif" } })
  },
];

interface FontFamilySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FontFamilySelector = ({ open, onOpenChange }: FontFamilySelectorProps) => {
  const { editor } = useEditor();

  if (!editor) return null;

  const activeItem = items.find((item) => item.isActive(editor)) || { name: "Font" };

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild className="gap-2 rounded-none border-none hover:bg-accent focus:ring-0">
        <Button size="sm" variant="ghost" className="gap-2">
          <span className="whitespace-nowrap text-sm">{activeItem.name}</span>
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
              <span style={{ fontFamily: item.fontFamily }}>{item.name}</span>
            </div>
            {activeItem.name === item.name && <Check className="h-4 w-4" />}
          </EditorBubbleItem>
        ))}
      </PopoverContent>
    </Popover>
  );
};

FontFamilySelector.displayName = "FontFamilySelector";
