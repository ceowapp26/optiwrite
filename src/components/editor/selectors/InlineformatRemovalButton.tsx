import { cn } from "@/lib/utils";
import { EditorBubbleItem, useEditor } from "../core/index";
import { Button } from "../ui/EditorButton";
import { RemoveFormatting } from "lucide-react";

export const InlineFormatRemovalButton = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <div className="flex">
      <EditorBubbleItem
        key="inline-format-removal"
        onSelect={(editor) => {
          editor?.chain().focus().unsetAllMarks().run();
        }}
      >
        <Button size="sm" className="rounded-none" variant="ghost">
          <RemoveFormatting
            className={cn("h-4 w-4", {
              "text-blue-500": editor.isActive('horizontalRule'),
            })}
          />
        </Button>
      </EditorBubbleItem>
    </div>
  );
};
