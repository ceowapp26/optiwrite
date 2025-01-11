import { cn } from "@/lib/utils";
import { EditorBubbleItem, useEditor } from "../core/index";
import { Button } from "../ui/EditorButton";
import { Minus } from "lucide-react";

export const HorizontalRuleButton = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <div className="flex">
      <EditorBubbleItem
        key="horizontal-rule"
        onSelect={(editor) => {
          editor.chain().focus().setHorizontalRule().run();
        }}
      >
        <Button size="sm" className="rounded-none" variant="ghost">
          <Minus
            className={cn("h-4 w-4", {
              "text-blue-500": editor.isActive('horizontalRule'),
            })}
          />
        </Button>
      </EditorBubbleItem>
    </div>
  );
};
