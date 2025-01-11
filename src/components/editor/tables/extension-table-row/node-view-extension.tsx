import { ReactNodeViewRenderer } from '@tiptap/react';
import { callOrReturn, getExtensionField, mergeAttributes, Node, ParentConfig, wrappingInputRule } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { ReactNodeView } from "./react-node-view";

export const inputRegex = /^\s*(\[([( |x])?\])\s$/

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    table: {
      insertAdvancedTable: () => ReturnType;
    };
  }

  interface NodeConfig<Options, Storage> {
    /**
     * Table Role
     */
    advancedTableRole?:
      | string
      | ((this: {
          name: string;
          options: Options;
          storage: Storage;
          parent: ParentConfig<NodeConfig<Options>>['advancedTableRole'];
        }) => string);
  }
}


export interface Props {}

const ReactExtension = Node.create<Props>({

  name: "reactExtension",

  draggable: true,

  group: "block",

  name: 'reactComponent',

  group: 'block',

  content: 'inline*',

  atom: true,

  parseHTML() {
    return [
      {
        tag: 'react-component',
      },
    ]
  },

  addCommands() {
    return {
      insertAdvancedTable: () => ({ tr, editor, commands }) => {
          return commands.insertContentAt(tr.selection.head, { type: this.type.name });
      }
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        return this.editor.commands.insertAdvancedTable();
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['react-component', mergeAttributes(HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ReactNodeView)
  },

  addInputRules() {
      return [
        wrappingInputRule({
          find: inputRegex,
          type: this.type,
        }),
      ]
    },

  extendNodeSchema(extension) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
    }

    return {
      advancedTableRole: callOrReturn(getExtensionField(extension, 'advancedTableRole', context)),
    }
  },
})

export default ReactExtension;



