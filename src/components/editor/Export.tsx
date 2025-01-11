import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect } from "react"; 
import {
  writeDocx,
  DocxSerializer,
  defaultNodes,
  defaultMarks
} from "prosemirror-docx";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button"; 

const nodeSerializer = {
  ...defaultNodes,
  hardBreak: defaultNodes.hard_break,
  codeBlock: defaultNodes.code_block,
  orderedList: defaultNodes.ordered_list,
  listItem: defaultNodes.list_item,
  bulletList: defaultNodes.bullet_list,
  horizontalRule: defaultNodes.horizontal_rule,
  image(state, node) {
    state.renderInline(node);
    state.closeBlock(node);
  }
};

export const exportToWord = (editor, title) => {
  const docxSerializer = new DocxSerializer(nodeSerializer, defaultMarks);
  const write = async () => {
    if (!editor || !editor.state) {
      console.error("Editor or editor state is not available.");
      return;
    }
    const opts = {
      getImageBuffer(src) {
        return Buffer.from("Real buffer here");
      }
    };

    const wordDocument = docxSerializer.serialize(editor.state.doc, opts);

    await writeDocx(wordDocument, (buffer) => {
      saveAs(new Blob([buffer]), `${title}.docx`);
    });
  };
  write();
};
