import { cn } from "@/lib/utils";
import { EditorBubbleItem, useEditor } from "../core/index";
import { Button } from "../ui/EditorButton";
import { Subscript } from "lucide-react";

export const SubscriptButton = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <div className="flex">
      <EditorBubbleItem
        key="subscript"
        onSelect={(editor) => {
          editor.chain().focus().toggleSubscript().run();
        }}
      >
        <Button size="sm" className="rounded-none" variant="ghost">
          <Subscript
            className={cn("h-4 w-4", {
              "text-blue-500": editor.isActive('subscript'),
            })}
          />
        </Button>
      </EditorBubbleItem>
    </div>
  );
};
