import { cn } from "@/lib/utils";
import { EditorBubbleItem, useEditor } from "../core/index";
import { Button } from "../ui/EditorButton";
import { Superscript } from "lucide-react"; 

export const SuperscriptButton = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <div className="flex">
      <EditorBubbleItem
        key="superscript"
        onSelect={(editor) => {
          editor.chain().focus().toggleSuperscript().run();
        }}
      >
        <Button size="sm" className="rounded-none" variant="ghost">
          <Superscript
            className={cn("h-4 w-4", {
              "text-blue-500": editor.isActive('superscript'), 
            })}
          />
        </Button>
      </EditorBubbleItem>
    </div>
  );
};
