import { Plugin, PluginKey, Transaction, EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

const uploadKey = new PluginKey("upload-file");

interface AddAction {
  id: string;
  pos: number;
  content: string;
}

interface RemoveAction {
  id: string;
}

interface Action {
  add?: AddAction;
  remove?: RemoveAction;
}

export const UploadFilePlugin = ({ fileClass }: { fileClass: string }) =>
  new Plugin({
    key: uploadKey,
    state: {
      init(): DecorationSet {
        return DecorationSet.empty;
      },
      apply(tr: Transaction, set: DecorationSet): DecorationSet {
        set = set.map(tr.mapping, tr.doc);
        const action = tr.getMeta(this) as Action;
        if (action?.add) {
          const { id, pos, content } = action.add;
          const deco = Decoration.widget(pos, () => {
            const div = document.createElement("div");
            div.innerHTML = content;
            div.className = fileClass;
            div.dataset.uploadId = id;
            return div;
          });
          set = set.add(tr.doc, [deco]);
        } else if (action?.remove) {
          set = set.remove(
            set.find(undefined, undefined, (spec) => spec.id === action.remove.id)
          );
        }
        return set;
      },
    },
    props: {
      decorations(state: EditorState) {
        return this.getState(state);
      },
    },
  });

function findPlaceholder(state: EditorState, id: string): number | null {
  const decos = uploadKey.getState(state) as DecorationSet | undefined;
  if (!decos) return null; // Handle case where state is undefined
  const found = decos.find(undefined, undefined, (spec) => spec.id === id);
  return found.length ? found[0]?.from ?? null : null;
}

export interface UploadFn {
  (file: File, view: EditorView, pos: number): void;
}

export const handleFilePaste = (
  view: EditorView,
  event: ClipboardEvent,
  uploadFn: UploadFn
) => {
  if (event.clipboardData?.files.length) {
    event.preventDefault();
    const [file] = Array.from(event.clipboardData.files);
    const pos = view.state.selection.from;

    if (file) uploadFn(file, view, pos);
    return true;
  }
  return false;
};

export const handleFileDrop = (
  view: EditorView,
  event: DragEvent,
  moved: boolean,
  uploadFn: UploadFn
) => {
  if (!moved && event.dataTransfer?.files.length) {
    event.preventDefault();
    const [file] = Array.from(event.dataTransfer.files);
    const coordinates = view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });
    if (file) uploadFn(file, view, (coordinates?.pos ?? 0) - 1);
    return true;
  }
  return false;
};

const createContentFromFile = async (file: File): Promise<string> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  let content = '';

  switch (fileExtension) {
    case 'docx':
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        content = result.value;
      } catch (error) {
        console.error('Error converting docx to HTML:', error);
        content = 'Error converting docx file';
      }
      break;
    case 'xlsx':
      // Handle xlsx file processing
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      content = `<table>${json
        .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
        .join('')}</table>`;
      break;
    case 'txt':
    case 'html':
      // Handle txt or html file processing
      content = await file.text();
      break;
    case 'json':
      // Handle json file processing
      const jsonData = await file.text();
      const jsonObj = JSON.parse(jsonData);
      content = `<pre>${JSON.stringify(jsonObj, null, 2)}</pre>`;
      break;
    default:
      // Handle unsupported file types
      content = 'Unsupported file type';
  }

  return content;
};

export const uploadFile = async (file: File, view: EditorView, pos: number) => {
  const id = Math.random().toString(36).substr(2, 9);
  const content = await createContentFromFile(file);

  view.dispatch(view.state.tr.setMeta(uploadKey, { add: { id, pos, content } }));

  setTimeout(() => {
    const placeholderPos = findPlaceholder(view.state, id);
    if (placeholderPos !== null) {
      const node = view.state.schema.nodes.paragraph.create({}, ProseMirrorNode.fromJSON(view.state.schema, { type: 'doc', content: [{ type: 'text', text: content }] }));
      const transaction = view.state.tr
        .replaceWith(placeholderPos, placeholderPos, node)
        .setMeta(uploadKey, { remove: { id } });
      view.dispatch(transaction);
    }
  }, 2000);
};
