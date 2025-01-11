import React, { useEffect } from "react";
import { CommandGroup, CommandItem, CommandSeparator, CommandList } from "../ui/command";
import { useEditor } from "../core/index";
import { useContentStore } from '@/stores/zustand/store';
import { Check, TextQuote, TrashIcon } from "lucide-react";

export const AIBasicCommand = () => {
  const { editor } = useEditor();
  const setReplaceAI = useContentStore((state) => state.setReplaceAI);
  const setInsertAboveAI = useContentStore((state) => state.setInsertAboveAI);
  const setInsertBelowAI = useContentStore((state) => state.setInsertBelowAI);
  const setInsertLeftAI = useContentStore((state) => state.setInsertLeftAI);
  const setInsertRightAI = useContentStore((state) => state.setInsertRightAI);

  useEffect(() => {
    const replace = (content) => {
      const selection = editor.view.state.selection;
      editor
        .chain()
        .focus()
        .insertContentAt(
          {
            from: selection.from,
            to: selection.to,
          },
          content,
        )
        .run();
    }

    const insertLeft = (content) => {
      const selection = editor.view.state.selection;
      const endPos = selection.$to.pos;
      editor
        .chain()
        .focus()
        .insertContentAt(endPos, ` ${content}`)
        .run();
    }

    const insertRight = (content) => {
      const selection = editor.view.state.selection;
      const startPos = selection.$from.pos;
      editor
        .chain()
        .focus()
        .insertContentAt(startPos, ` ${content}`)
        .run();
    }

    const insertAbove = (content) => {
      const selection = editor.view.state.selection;
      editor
        .chain()
        .focus()
        .insertContentAt(selection.to - 1, content)
        .run();
    }

    const insertBelow = (content) => {
      const selection = editor.view.state.selection;
      editor
        .chain()
        .focus()
        .insertContentAt(selection.to + 1, content)
        .run();
    }

    setReplaceAI(replace);
    setInsertLeftAI(insertLeft);
    setInsertRightAI(insertRight);
    setInsertAboveAI(insertAbove);
    setInsertBelowAI(insertBelow);
  }, [editor, setReplaceAI, setInsertAboveAI, setInsertBelowAI, setInsertLeftAI, setInsertRightAI]);

  return null;
};
