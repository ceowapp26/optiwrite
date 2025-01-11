import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Blockquote from '@tiptap/extension-blockquote';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import { Markdown } from "tiptap-markdown";
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from '@tiptap/extension-font-family';
import FontSize from 'tiptap-extension-font-size';
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";

export const editorExtensions = [
  TaskList,
  TaskItem,
  Code,
  Markdown,
  CodeBlock,
  Highlight,
  Heading,
  Link,
  TextStyle,
  FontFamily,
  TextAlign,
  FontSize,
  Image,
  Italic,
  Strike,
  Underline,
  Youtube,
  Table,
  TableRow,
  TableCell,
  TableHeader,
  Blockquote,
  BulletList,
  OrderedList,
  Placeholder,
  ListItem,
  HorizontalRule,
  Subscript,
  Superscript,
  Text,
  Bold,
  Document,
  Paragraph,
];
