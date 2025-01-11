import {
  callOrReturn, getExtensionField, mergeAttributes, Node, ParentConfig,
} from '@tiptap/core';
import { EditorView } from "@tiptap/pm/view";
import { DOMOutputSpec, Schema, DOMParser as PDOMParser } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  CellSelection,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  fixTables,
  goToNextCell,
  mergeCells,
  setCellAttr,
  splitCell,
  tableEditing,
  toggleHeader,
  toggleHeaderCell,
  toggleHeaderColumn,
  toggleHeaderRow,
  tableNodes,
} from '@tiptap/pm/tables';
import { baseKeymap } from "@tiptap/pm/commands";
import { keymap } from "@tiptap/pm/keymap";
import { schema as baseSchema } from "@tiptap/pm/schema-basic";
import { exampleSetup, buildMenuItems } from "./setup";
import { MenuItem, Dropdown } from "@tiptap/pm/menu";
import { NodeView } from '@tiptap/pm/view';
import { EditorState } from '@tiptap/pm/state';

let schema = new Schema({
  nodes: baseSchema.spec.nodes.append(
    tableNodes({
      tableGroup: "block",
      cellContent: "block+",
      cellAttributes: {
        background: {
          default: null,
          getFromDOM(dom) {
            return (dom.style && dom.style.backgroundColor) || null;
          },
          setDOMAttr(value, attrs) {
            if (value)
              attrs.style = (attrs.style || "") + `background-color: ${value};`;
          }
        }
      }
    })
  ),
  marks: baseSchema.spec.marks
});

let menu = buildMenuItems(schema).fullMenu;
function item(label, cmd) {
  return new MenuItem({ label, select: cmd, run: cmd });
}

let tableMenu = [
  item("Insert column before", addColumnBefore),
  item("Insert column after", addColumnAfter),
  item("Delete column", deleteColumn),
  item("Insert row before", addRowBefore),
  item("Insert row after", addRowAfter),
  item("Delete row", deleteRow),
  item("Delete table", deleteTable),
  item("Merge cells", mergeCells),
  item("Split cell", splitCell),
  item("Toggle header column", toggleHeaderColumn),
  item("Toggle header row", toggleHeaderRow),
  item("Toggle header cells", toggleHeaderCell),
  item("Make cell green", setCellAttr("background", "#dfd")),
  item("Make cell not-green", setCellAttr("background", null))
];

menu.splice(2, 0, [new Dropdown(tableMenu, { label: "Table" })]);

declare module '@tiptap/core' {
  interface NodeConfig<Options, Storage> {
    /**
     * Table Role
     */
    editorMonitor?:
      | string
      | ((this: {
          name: string
          options: Options
          storage: Storage
          parent: ParentConfig<NodeConfig<Options>>['editorMonitor']
    }) => string)
  }
}

const EditorMonitor = Node.create<Options, Data>({

  name: 'editor',

  content: 'tableRow+',

  isolating: true,

  group: 'block',

  parseHTML() {
    return [{ tag: 'editor' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const state = this.editor.state;
    const tableEditor = document.createElement("div");
    tableEditor.id = "tableEditor";

    if (!document.querySelector("#tableEditor") && document.querySelector("div.tableWrapper")) {
      document.querySelector("div.tableWrapper").appendChild(tableEditor);
      window.view = new EditorView(document.querySelector("#tableEditor"), { state });
    }

    document.execCommand("enableObjectResizing", false, false);
    document.execCommand("enableInlineTableEditing", false, false);
  },

  addProseMirrorPlugins() {
    const schema = this.editor.schema;
    return [].concat(exampleSetup({ schema, menuContent: menu }));
  },

  extendNodeSchema(extension) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
    };

    return {
      editorMonitor: callOrReturn(getExtensionField(extension, 'editorMonitor', context)),
    };
  },
});

export default EditorMonitor;