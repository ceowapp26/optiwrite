import StarterKit from "@tiptap/starter-kit";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import TiptapLink from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapUnderline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from '@tiptap/extension-font-family';
import FontSize from 'tiptap-extension-font-size';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from "@tiptap/extension-color";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { InputRule } from "@tiptap/core";
import { Markdown } from "tiptap-markdown";
import Highlight from "@tiptap/extension-highlight";
import UpdatedImage from "./updated-image";
import CustomKeymap from "./custom-keymap";
import { ImageResizer } from "./image-resizer";
import GlobalDragHandle from 'tiptap-extension-global-drag-handle'
import AutoJoiner from "tiptap-extension-auto-joiner";
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '../tables/extension-table-row/index';
import TableImproved from "../tables/table-improved";
import { cx } from "class-variance-authority";
import { common, createLowlight } from "lowlight";
import CharacterCount from "@tiptap/extension-character-count";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Youtube from "@tiptap/extension-youtube";
import Mention from '@tiptap/extension-mention';
import Typography from '@tiptap/extension-typography';
import { UploadFilePlugin } from '../plugins';
import { ContentExtension } from './content-extension';
import { ColorHighlighter } from './color-highlighter';
import SmilieReplacer from './smilie-replacer';

const limit = 8000;

const PlaceholderExtension = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === "heading") {
      return `Heading ${node.attrs.level}`;
    }
    if (node.type.name === "tableCell") {
      return null; 
    }
    return "Press '/' for commands";
  },
  includeChildren: true,
});

const simpleExtensions = [
  TiptapUnderline,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  CodeBlockLowlight.configure({
    lowlight: createLowlight(common),
  }),
  TableImproved.configure({
    resizable: true,
    allowTableNodeSelection: false
  }),
  TableRow,
  TableHeader,
  TableCell,
  Text, 
  FontSize,
  Subscript,
  Superscript,
  UploadFilePlugin({ fileClass: 'file-upload-placeholder' }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  TextStyle, 
  FontFamily,
  Typography,
  ColorHighlighter,
  SmilieReplacer,
  Markdown.configure({
    html: false,
    transformCopiedText: true,
  }),
  ContentExtension,
  CustomKeymap,
  GlobalDragHandle.configure({
    dragHandleWidth: 20, 
    scrollTreshold: 0, 
    dragHandleSelector: ".custom-drag-handle",
  }),
  Youtube.configure({
    HTMLAttributes: {
      class: cx("rounded-lg border border-muted"),
    },
    inline: true,
  }),
  CharacterCount.configure({
    limit,
  }),
  AutoJoiner,
] as const;

const optionalExtensions = () => {
  if (widgets) return widgets;
  return factoryPlugins;
}

const Horizontal = HorizontalRule.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/u,
        handler: ({ state, range }) => {
          const attributes = {};

          const { tr } = state;
          const start = range.from;
          const end = range.to;

          tr.insert(start - 1, this.type.create(attributes)).delete(tr.mapping.map(start), tr.mapping.map(end));
        },
      }),
    ];
  },
});

export {
  CodeBlockLowlight,
  Horizontal as HorizontalRule,
  ImageResizer,
  InputRule,
  PlaceholderExtension as Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TiptapImage,
  TiptapLink,
  UpdatedImage,
  simpleExtensions,
  Youtube,
  CharacterCount,
  GlobalDragHandle,
};

export * from "./ai-highlight";
export * from "./slash-command";

//Todo: Maybe I should create an utils entry
export { getPrevText } from "@/utils/utilities";
