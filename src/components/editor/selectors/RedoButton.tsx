import { cn } from "@/lib/utils";
import { EditorBubbleItem, useEditor } from "../core/index";
import { Button } from "../ui/EditorButton";
import { Redo } from "lucide-react";

export const RedoButton = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <div className="flex">
      <EditorBubbleItem
        key="redo"
        onSelect={() => {
          editor.chain().focus().redo().run();
        }}
      >
        <Button size="sm" className="rounded-none" variant="ghost">
          <Redo
            className={cn("h-4 w-4", {
              "text-blue-500": editor.can().redo(),
            })}
          />
        </Button>
      </EditorBubbleItem>
    </div>
  );
};
