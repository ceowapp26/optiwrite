// plugins/unsplash-upload-images.ts
import { EditorState, Plugin, PluginKey, Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";

const uploadKey = new PluginKey("upload-ai-image");

interface AddAction {
  id: {};
  pos: number;
  src: string;
}

interface RemoveAction {
  id: {};
}

interface Action {
  add?: AddAction;
  remove?: RemoveAction;
}

export const UploadAIImagesPlugin = ({ imageClass }: { imageClass: string }) =>
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
          const { id, pos, src } = action.add;
          const placeholder = document.createElement("div");
          placeholder.setAttribute("class", "img-placeholder");
          const image = document.createElement("img");
          image.setAttribute("class", imageClass);
          image.src = src;
          placeholder.appendChild(image);
          const deco = Decoration.widget(pos + 1, placeholder, { id });
          set = set.add(tr.doc, [deco]);
        } else if (action?.remove) {
          set = set.remove(set.find(undefined, undefined, (spec) => spec.id === action.remove.id));
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

function findPlaceholder(state: EditorState, id: {}): number | null {
  const decos = uploadKey.getState(state) as DecorationSet;
  const found = decos.find(undefined, undefined, (spec) => spec.id === id);
  return found.length ? found[0]?.from ?? null : null;
}

export interface ImageUploadOptions {
  url: string;
}

export const createAIImage = (url: string, view: EditorView, pos: number) => {
  const id = {};
  const tr = view.state.tr;
  if (!tr.selection.empty) tr.deleteSelection();

  tr.setMeta(uploadKey, {
    add: {
      id,
      pos,
      src: url,
    },
  });
  view.dispatch(tr);

  const { schema } = view.state;
  let placeholderPos = findPlaceholder(view.state, id);

  if (placeholderPos === null) return;

  const node = schema.nodes.image?.create({ src: url });
  if (!node) return;

  const transaction = view.state.tr
    .replaceWith(placeholderPos, placeholderPos, node)
    .setMeta(uploadKey, { remove: { id } });
  view.dispatch(transaction);
};

