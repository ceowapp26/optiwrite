import React, { useRef, useEffect } from 'react';
import { useEditor } from "../core/index";
import { Button } from "@/components/ui/button";

export const AIResponse = ({ response }) => {
  const chatResponse = useRef(null);
  const chatContainer = useRef(null);
  const { editor } = useEditor();
  const selection = editor.view.state.selection;

  const handleCopy = () => {
    if (chatResponse.current) {
      navigator.clipboard.writeText(chatResponse.current.innerText)
        .then(() => console.log('Text copied to clipboard'))
        .catch((err) => console.error('Unable to copy text to clipboard', err));
    }
  };

  const handleDeleteClick = () => {
    if (chatResponse.current) {
      chatResponse.current.innerHTML = '<p><faTrash> Deleted</p>';
      setTimeout(() => {
        if (chatContainer.current && chatContainer.current.contains(chatResponse.current)) {
          chatContainer.current.removeChild(chatResponse.current);
        }
      }, 1000);
    }
  };

  const handleInsert = () => {
    const startPos = selection.$from.pos;
    editor
      .chain()
      .focus()
      .insertContentAt(startPos, ` ${completion}`)
      .run();
  }

   const handleReplace = () => {
    editor
      .chain()
      .focus()
      .insertContentAt(
        {
          from: selection.from,
          to: selection.to,
        },
        completion,
      )
      .run();
  }

  return (
    <>
      {selection ? (
        null
      ) : (
        <div ref={chatContainer} className="relative w-full max-w-screen-lg">
          <div ref={chatResponse} className="absolute right-5 top-5 z-10 mb-5 rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground">
            {response}
          </div>
          {selection ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleReplace}>Replace</Button>
              <Button variant="ghost" size="sm" onClick={handleCopy}>Copy</Button>
              <Button variant="ghost" size="sm" onClick={handleDeleteClick}>Delete</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleInsert}>Insert</Button>
              <Button variant="ghost" size="sm" onClick={handleCopy}>Copy</Button>
              <Button variant="ghost" size="sm" onClick={handleDeleteClick}>Delete</Button>
            </>
          )}
        </div>
      )}
    </>
  );
};


