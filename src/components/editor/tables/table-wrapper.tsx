import React from "react";
import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";

export const TableWrapper = (props) => {
  return (
    <NodeViewWrapper className='draggable-table' >
      <NodeViewContent className='content' as='table'></NodeViewContent>
      <div
        className='drag-handle'
        contentEditable='false'
      />
    </NodeViewWrapper>
  );
};