import {keymap} from "@tiptap/pm/keymap"
import {history} from "@tiptap/pm/history"
import {baseKeymap} from "@tiptap/pm/commands"
import {Plugin} from "@tiptap/pm/state"
import {dropCursor} from "@tiptap/pm/dropcursor"
import {gapCursor} from "@tiptap/pm/gapcursor"
import {menuBar, MenuItem} from "@tiptap/pm/menu"
import {Schema} from "@tiptap/pm/model"

import {buildMenuItems} from "./menu"
import {buildKeymap} from "./keymap"
import {buildInputRules} from "./inputrules"

export {buildMenuItems, buildKeymap, buildInputRules}

/// Create an array of plugins pre-configured for the given schema.
/// The resulting array will include the following plugins:
///
///  * Input rules for smart quotes and creating the block types in the
///    schema using markdown conventions (say `"> "` to create a
///    blockquote)
/// 
///  * A keymap that defines keys to create and manipulate the nodes in the
///    schema
/// 
///  * A keymap binding the default keys provided by the
///    prosemirror-commands module
/// 
///  * The undo history plugin
/// 
///  * The drop cursor plugin
/// 
///  * The gap cursor plugin
/// 
///  * A custom plugin that adds a `menuContent` prop for the
///    prosemirror-menu wrapper, and a CSS class that enables the
///    additional styling defined in `style/style.css` in this package
///
/// Probably only useful for quickly setting up a passable
/// editor—you'll need more control over your settings in most
/// real-world situations.
export function exampleSetup(options: {
  /// The schema to generate key bindings and menu items for.
  schema: Schema

  /// Can be used to [adjust](#example-setup.buildKeymap) the key bindings created.
  mapKeys?: {[key: string]: string | false}

  /// Set to false to disable the menu bar.
  menuBar?: boolean

  /// Set to false to disable the history plugin.
  history?: boolean

  /// Set to false to make the menu bar non-floating.
  floatingMenu?: boolean

  /// Can be used to override the menu content.
  menuContent?: MenuItem[][]
}) {
  let plugins = [
    buildInputRules(options.schema),
    keymap(buildKeymap(options.schema, options.mapKeys)),
    keymap(baseKeymap),
    dropCursor(),
    gapCursor()
  ]
  if (options.menuBar !== false)
    plugins.push(menuBar({floating: options.floatingMenu !== false,
                          content: options.menuContent || buildMenuItems(options.schema).fullMenu}))
  return plugins.concat(new Plugin({
    props: {
      attributes: {class: "ProseMirror-example-setup-style"}
    }
  }))
}
