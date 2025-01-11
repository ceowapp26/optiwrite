import { cn } from "@/lib/utils";
import { EditorBubbleItem, useEditor } from "../core/index";
import { Button } from "../ui/EditorButton";
import { ALargeSmall, Check, ChevronDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type SelectorItem = {
  name: string;
  value: string;
  command: (editor: ReturnType<typeof useEditor>["editor"]) => void;
  isActive: (editor: ReturnType<typeof useEditor>["editor"]) => boolean;
};

const fontSizes = [
  8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72, 96
];

const items: SelectorItem[] = [
  {
    name: "Default",
    value: "default",
    command: (editor) => editor.chain().focus().unsetFontSize().run(),
    isActive: (editor) => !fontSizes.some(size => editor.isActive('textStyle', { fontSize: `${size}pt` }))
  },
  ...fontSizes.map(size => ({
    name: size,
    value: size,
    command: (editor) => editor.chain().focus().setFontSize(`${size}pt`).run(),
    isActive: (editor) => editor.isActive('textStyle', { fontSize: `${size}pt` })
  }))
];

interface FontSizeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FontSizeSelector = ({ open, onOpenChange }: FontSizeSelectorProps) => {
  const { editor } = useEditor();

  if (!editor) return null;

  const activeItem = items.find(item => item.isActive(editor)) || { name: "Size" };

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-2 rounded-none border-none hover:bg-accent focus:ring-0">
          <ALargeSmall className="h-4 w-4" />
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        sideOffset={5}
        className="my-1 flex max-h-80 w-48 flex-col overflow-hidden overflow-y-auto rounded border p-1 shadow-xl "
        align="start"
      >
        <div className="flex flex-col">
          <div className="my-1 px-2 text-sm font-semibold text-muted-foreground">Font Size</div>
          {items.map((item) => (
            <EditorBubbleItem
              key={item.name}
              onSelect={() => {
                item.command(editor);
                onOpenChange(false);
              }}
              className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1 hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <div
                  className="rounded-sm h-full border px-2 py-px font-medium"
                  style={{ fontSize: `${item.value === 'default' ? '14' : item.value}pt` }}
                >
                  A
                </div>
                <span>{item.name}</span>
              </div>
              {activeItem.name === item.name && <Check className="h-4 w-4" />}
            </EditorBubbleItem>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

FontSizeSelector.displayName = "FontSizeSelector";
