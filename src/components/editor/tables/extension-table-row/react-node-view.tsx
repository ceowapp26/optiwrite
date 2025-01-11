import React from "react";
import { NodeViewWrapper } from "@tiptap/react";

export const ReactNodeView = () => {
  return (
    <NodeViewWrapper
      className="react-row"
      style={{ userSelect: "none" }}
      contentEditable={false}
    >
      <div
        contentEditable={false}
        data-drag-handle=""
      >
        <tr />
      </div>
    </NodeViewWrapper>
  );
};



