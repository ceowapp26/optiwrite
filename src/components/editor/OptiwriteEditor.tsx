"use client";
import './styles.scss';
import React, { useEffect, useState, useRef, memo } from "react";
import { type AppSession, type UserIds } from '@/types/auth';
import { defaultEditorContent } from "@/constants/editor";
import { useDebouncedCallback } from "use-debounce";
import { useMediaQuery } from "usehooks-ts";
import Spinner from "@/components/Spinner";
import dynamic from 'next/dynamic';
import {
  EditorRoot,
  EditorCommand,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorContent,
  type JSONContent,
  EditorInstance,
  EditorCommandList,
} from "./core/index";
import { ImageResizer } from "./lib/image-resizer";
import { handleCommandNavigation } from "./lib/slash-command";
import { defaultExtensions } from "./extensions";
import { expandExtensions } from "./expand-extensions";
import { Separator } from "./ui/Separator";
import { NodeSelector } from "./selectors/NodeSelector";
import { LinkSelector } from "./selectors/LinkSelector";
import { ColorSelector } from "./selectors/ColorSelector";
import { ImageSelector } from "./selectors/ImageSelector";
import { TextButtons } from "./selectors/TextButtons";
import { FontFamilySelector } from "./selectors/FontFamilySelector";
import { FontSizeSelector } from "./selectors/FontSizeSelector";
import { TextAlignSelector } from "./selectors/TextAlignSelector";
import { HorizontalRuleButton } from "./selectors/HorizontalRuleButton";
import { InlineFormatRemovalButton } from "./selectors/InlineFormatRemovalButton";
import { SubscriptButton } from "./selectors/SubscriptButton";
import { SuperscriptButton } from "./selectors/SuperscriptButton";
import { UndoButton } from "./selectors/UndoButton";
import { RedoButton } from "./selectors/RedoButton";
import { slashCommand, textSuggestionItems, nodeSuggestionItems, exportSuggestionItems } from "./SlashCommand";
import GenerativeMenuSwitch from "./GenerativeMenuSwitch";
import { handleImageDrop, handleImagePaste, handleFileDrop, handleFilePaste } from "./plugins/index";
import { uploadFn } from "./upload-image";
import { uploadFile } from "./plugins/UploadFiles";
import Warning from "@/components/editor/modals/WarningModal";
import TableBubbleMenu from "./tables/table-bubble-menu";
import { exportToWord } from "./export";
import { useUploadFile } from "@/hooks/useUploadFile";
import { DOMParser } from 'prosemirror-model';
import { generateJSON, generateHTML } from '@tiptap/html';
import { editorExtensions } from '@/components/editor/lib/editor-extensions';
import { UploadFileModal } from "@/components/editor/modals/UploadFileModal";
import AIBasicSelector from './generative/AIBasicSelector';
import $ from 'jquery';
import "./styles.css";
const hljs = require('highlight.js');

const extensions = [...defaultExtensions, slashCommand];

const CHARACTER_LIMIT = 8000;

interface EditorProps {
  onChange: (value: string) => void;
  contentId?: string;
  contentTitle?: string;
  initialContent?: string;
  handleShopifyAI?: (shopName: string, userId: string, action: string, content: string) => Promise<any>;
}

const OptiwriteEditor = ({ onChange, contentId, contentTitle, initialContent, handleShopifyAI }: EditorProps) => {
  const [data, setData] = useState<JSONContent | string>('');
  const [cloudData, setCloudData] = useState<JSONContent | string>('');
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openSnippet, setOpenSnippet] = useState(false);
  const [openImage, setOpenImage] = useState(false);
  const [openTable, setOpenTable] = useState(false);
  const [openTextFont, setOpenTextFont] = useState(false);
  const [openTextSize, setOpenTextSize] = useState(false);
  const [openTextAlign, setOpenTextAlign] = useState(false);
  const [openBasicAI, setOpenBasicAI] = useState(false);
  const [openAdvancedAI, setOpenAdvancedAI] = useState(false);
  const [openImageAI, setOpenImageAI] = useState(false);
  const [openAIImage, setOpenAIImage] = useState(false);
  const [editorWidth, setEditorWidth] = useState(0);
  const [status, setStatus] = useState(true);
  const [wordsCount, setWordsCount] = useState(0);
  const [charsCount, setCharsCount] = useState(0);
  const [charsPercentage, setCharsPercentage] = useState(0);
  const [updatedExportSuggestionItems, setUpdatedExportSuggestionItems] = useState([]);
  const [syncWithCloudWarning, setSyncWithCloudWarning] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const ref = useRef();

  const highlightCodeblocks = (content: string) => {
    if (!content) {
      console.warn("No content provided for highlighting");
      return content;
    }
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const codeBlocks = tempDiv.querySelectorAll('pre code');
      if (codeBlocks.length > 0) {
        codeBlocks.forEach((block) => {
          try {
            hljs.highlightElement(block);
          } catch (highlightError) {
            console.warn('Error highlighting individual code block:', highlightError);
          }
        });
      }
      return tempDiv.innerHTML;
    } catch (error) {
      console.error("Error highlighting code blocks:", error);
      return content;
    }
  };

  const parseHTMLContent = (htmlString: string): any => {
    try {
      if (!htmlString || typeof htmlString !== "string") {
        console.warn("Invalid input: Expected a non-empty string.");
        return null;
      }
      const cleanHTML = htmlString.trim().replace(/\n\s+/g, "\n");
      return generateJSON(cleanHTML, editorExtensions);
    } catch (error) {
      console.error("Error parsing HTML content:", error);
      return null;
    }
  };
  const convertDOMToJSON = (element) => {
    const nodeType = element.nodeName.toLowerCase();
    const attrs = {};
    Array.from(element.attributes).forEach(attr => {
      attrs[attr.name] = attr.value;
    });

    const node = {
      type: nodeType,
      attrs: Object.keys(attrs).length ? attrs : null
    };
    if (!element.children.length) {
      if (element.textContent) {
        node.content = [{
          type: 'text',
          text: element.textContent
        }];
      }
    } else {
      node.content = Array.from(element.children).map(child => 
        convertDOMToJSON(child)
      );
    }
    return node;
  };

  const debouncedUpdates = useDebouncedCallback(
    async (editor: EditorInstance) => {
      const json = editor.getJSON();
      const characterCount = editor.storage.characterCount.characters();
      const characterPercentage = Math.round((100 / CHARACTER_LIMIT) * characterCount);
      const wordCount = editor.storage.characterCount.words();
      setCharsCount(characterCount);
      setCharsPercentage(characterPercentage);
      setWordsCount(wordCount);
      window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
      window.localStorage.setItem(contentId, JSON.stringify(json));
      window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());
      setSaveStatus("Saved");
      setSyncWithCloudWarning(false);
    },
    500,
  );

  useEffect(() => {
    try {
      const cloudContent = initialContent ?? defaultEditorContent;
      if (!cloudContent) return;
      const parsedContent = parseHTMLContent(cloudContent);
      onChange?.(parsedContent);
      setCloudData(parsedContent);
      const localContent = window.localStorage.getItem(contentId);
      if (localContent) {
        const parsedLocalContent = JSON.parse(localContent);
        setData(parsedLocalContent);
        onChange?.(parsedLocalContent);
        if (JSON.stringify(parsedLocalContent) !== JSON.stringify(cloudContent)) {
          setSyncWithCloudWarning(true);
        }
      } else {
        setData(parsedContent);
        window.localStorage.setItem(contentId, JSON.stringify(parsedContent));
      }
    } catch (error) {
      console.error('Error processing content:', error);
    }
  }, [contentId]);

  const handleKeepLocalStorage = () => {
    setSyncWithCloudWarning(false);
  };

  const handleKeepCloudStorage = () => {
    window.localStorage.setItem(contentId, JSON.stringify(cloudData));
    setData(cloudData);
    setSyncWithCloudWarning(false);
  };

  return (
    <React.Fragment>
      {syncWithCloudWarning && (
        <Warning
          handleKeepLocalStorage={handleKeepLocalStorage}
          handleKeepCloudStorage={handleKeepCloudStorage}
        />
      )}
      <div className="w-full overflow-x-hidden">
        <div ref={ref} className="relative optiwrite-editor w-full mx-auto" 
          style={{ 
            maxHeight: '60vh', 
            overflowY: 'auto',
            width: '100%',
            maxWidth: '100%',
            margin: '0 auto',
            padding: '0 1rem'
          }}
        >
          <div className={`absolute flex justify-end right-14 top-4 z-10`}>
            <div className={`character-count ${charsCount === CHARACTER_LIMIT ? 'character-count--warning' : ''}`}>
              <svg
                height="20"
                width="20"
                viewBox="0 0 20 20"
              >
                <circle
                  r="10"
                  cx="10"
                  cy="10"
                  fill="#e9ecef"
                />
                <circle
                  r="5"
                  cx="10"
                  cy="10"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={`calc(${charsPercentage} * 31.4 / 100) 31.4`}
                  transform="rotate(-90) translate(-20)"
                />
                <circle
                  r="6"
                  cx="10"
                  cy="10"
                  fill="white"
                />
              </svg>
              {charsCount} / {CHARACTER_LIMIT} characters
              <br />
              {wordsCount} words
            </div>
          </div>
          <EditorRoot>
            <EditorContent
              initialContent={data}
              key={JSON.stringify(data)}
              storageKey={contentId}
              extensions={extensions}
              className="relative min-w-full px-6 py-10 mb-10 border-muted bg-background sm:rounded-lg sm:border sm:shadow-lg"
              editorProps={{
                scrollThreshold: 0,
                scrollMargin: 0,
                scrollIntoView: false,
                handleDOMEvents: {
                  keydown: (_view, event) => handleCommandNavigation(event),
                },
                handlePaste: (view, event) => {
                  handleImagePaste(view, event, uploadFn);
                  handleFilePaste(view, event, uploadFile);
                },
                handleDrop: (view, event, _slice, moved) => {
                  handleImageDrop(view, event, moved, uploadFn);
                  handleFileDrop(view, event, moved, uploadFile);
                },
                attributes: {
                  class: `prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full`,
                },
              }}

              onEditor={(editor) => {
                if (!editor) return;
                editorRef.current = editor;
              }}
              onUpdate={({ editor }) => {
                if (!editor) return;
                if (onChange) {
                  onChange?.(editor.getJSON());
                }
                debouncedUpdates(editor);
                setSaveStatus("Unsaved");
              }}
              slotAfter={<ImageResizer />}
            >
              <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
                <EditorCommandEmpty className="px-2 text-muted-foreground">
                  No results
                </EditorCommandEmpty>
                <EditorCommandList>
                  <span className="flex font-semibold text-indigo-800 p-2">Text & Layout</span>
                  {textSuggestionItems.map((item) => (
                    <EditorCommandItem
                      value={item.title}
                      onCommand={(val) => item.command(val)}
                      className={`flex w-full items-center space-x-4 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent cursor-pointer`}
                      key={item.title}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </EditorCommandItem>
                  ))}
                </EditorCommandList>
                <EditorCommandList>
                  <span className="flex font-semibold text-indigo-800 p-2">Nodes</span>
                  {nodeSuggestionItems.map((item) => (
                    <EditorCommandItem
                      value={item.title}
                      onCommand={(val) => item.command(val)}
                      className={`flex w-full items-center space-x-4 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent `}
                      key={item.title}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      {item.status && (
                        <span
                          className="flex rounded-full text-white text-xs p-4 py-1 left-1"
                          style={{ backgroundColor: item.color }}
                        >
                         {item.status}
                        </span>
                      )}
                    </EditorCommandItem>
                  ))}
                </EditorCommandList>
                {/*<EditorCommandList>
                  <span className="flex font-semibold text-indigo-800 p-2">Export</span>
                  {updatedExportSuggestionItems.map((item) => (
                    <EditorCommandItem 
                      value={item.title}
                      onCommand={(val) => item.command(val)}
                      className={`flex w-full items-center space-x-4 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent `}
                      key={item.title}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </EditorCommandItem>
                  ))}
                </EditorCommandList>*/}
              </EditorCommand>
              <UploadFileModal />
              <GenerativeMenuSwitch>
                <AIBasicSelector open={openBasicAI} onOpenChange={setOpenBasicAI} handleShopifyAI={handleShopifyAI} />
                <Separator orientation="vertical" />
                <NodeSelector open={openNode} onOpenChange={setOpenNode} />
                <Separator orientation="vertical" />
                <LinkSelector open={openLink} onOpenChange={setOpenLink} />
                <Separator orientation="vertical" />
                <TextButtons />
                <Separator orientation="vertical" />
                <FontFamilySelector open={openTextFont} onOpenChange={setOpenTextFont} />
                <Separator orientation="vertical" />
                <FontSizeSelector open={openTextSize} onOpenChange={setOpenTextSize} />
                <Separator orientation="vertical" />
                <TextAlignSelector open={openTextAlign} onOpenChange={setOpenTextAlign} />
                <Separator orientation="vertical" />
                <InlineFormatRemovalButton />
                <Separator orientation="vertical" />
                <SubscriptButton />
                <Separator orientation="vertical" />
                <SuperscriptButton />
                <Separator orientation="vertical" />
                <ColorSelector open={openColor} onOpenChange={setOpenColor} />
                <Separator orientation="vertical" />
                <ImageSelector open={openImage} onOpenChange={setOpenImage} />
                <Separator orientation="vertical" />
                <UndoButton />
                <Separator orientation="vertical" />
                <RedoButton />
              </GenerativeMenuSwitch>
              <TableBubbleMenu />
            </EditorContent>
          </EditorRoot>
        </div>
      </div>
    </React.Fragment>
  );
};

export default memo(OptiwriteEditor);


