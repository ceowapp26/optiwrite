import { createSuggestionItems } from "./lib/slash-command";
import { Command, renderItems } from "./lib/slash-command";

export const suggestionItems = createSuggestionItems([
  {
    title: "Search Image",
    description: "Search image from UnSplash.",
    icon: <MessageSquarePlus size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.open("/search-image", "_blank");
    },
  },
  {
    title: "Image Generator",
    description: "Generate AI Image from prompt.",
    icon: <MessageSquarePlus size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.open("/image-generator", "_blank");
    },
  },
  {
    title: "Image Description",
    description: "Generate description from image.",
    icon: <MessageSquarePlus size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.open("/image-description", "_blank");
    },
  },
]);

export const slashCommandImg = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});
