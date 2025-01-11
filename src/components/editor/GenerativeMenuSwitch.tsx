import { EditorBubble, useEditor } from "./core/index";
import React, { Fragment, useEffect, type ReactNode } from "react";
import { removeAIHighlight } from "./lib/ai-highlight";

interface GenerativeMenuSwitchProps {
  children: ReactNode;
}
const GenerativeMenuSwitch = ({ children }: GenerativeMenuSwitchProps) => {
  const { editor } = useEditor();
  useEffect(() => {
    if (!open) removeAIHighlight(editor);
  }, [open]);

  return (
    <EditorBubble
      tippyOptions={{
        placement: open ? "bottom-start" : "top",
        onHidden: () => {
          editor.chain().unsetHighlight().run();
        },
      }}
      className="flex w-fit max-w-[40vw] overflow-x-auto rounded-md border border-muted bg-background shadow-xl custom-scrollbar"
    >
      {children}
    </EditorBubble>
  );
};

export default GenerativeMenuSwitch;