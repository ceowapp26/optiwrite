import { cn } from "@/lib/utils";
import { EditorBubbleItem, useEditor } from "../core/index";
import { Button } from "../ui/EditorButton";
import { Undo } from "lucide-react";

export const UndoButton = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <div className="flex">
      <EditorBubbleItem
        key="undo"
        onSelect={() => {
          editor.chain().focus().undo().run();
        }}
      >
        <Button size="sm" className="rounded-none" variant="ghost">
          <Undo
            className={cn("h-4 w-4", {
              "text-blue-500": editor.can().undo(),
            })}
          />
        </Button>
      </EditorBubbleItem>
    </div>
  );
};
