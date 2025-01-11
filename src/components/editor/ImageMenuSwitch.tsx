import { EditorImageBubble, useEditor } from "./core/index";
import React, { Fragment, useEffect, type ReactNode } from "react";
import { removeAIHighlight } from "./lib/ai-highlight";
import dynamic from 'next/dynamic';

const AIImageSelector = dynamic(() => import("./generative/AIImageSelector"), {
  ssr: false,
});

interface ImageMenuSwitchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImageMenuSwitch = ({ open, onOpenChange }: ImageMenuSwitchProps) => {
  const { editor } = useEditor();
  useEffect(() => {
    if (!open) removeAIHighlight(editor);
  }, [open]);

  return (
    <EditorImageBubble
      tippyOptions={{
        placement: open ? "bottom-start" : "top",
        onHidden: () => {
          editor.chain().unsetHighlight().run();
        },
      }}
      className="flex w-fit max-w-[40vw] overflow-x-auto rounded-md border border-muted bg-background shadow-xl"
    >
      <AIImageSelector open={open} onOpenChange={onOpenChange} isGemini={true} />
    </EditorImageBubble>
  );
};

export default ImageMenuSwitch;