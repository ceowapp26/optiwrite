import { useEditor, EditorContent } from '../core';
import { Node } from '@tiptap/core';

const ContentExtension = Node.create({
  name: 'article',
  group: 'block',
  content: 'block+',
  parseHTML() {
    return [{ tag: 'article' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['article', HTMLAttributes, 0];
  }
});

