import React, { useCallback, useState, memo } from "react";
import { Command, CommandGroup, CommandItem, CommandSeparator, CommandList } from "../ui/Command";
import { useEditor } from "../core/index";
import { Button as NextButton, ButtonGroup, Tooltip } from "@nextui-org/react";
import { Button } from "../ui/EditorButton";
import MagicIcon from "@/icons/MagicIcon";
import { PopoverTrigger, Popover, PopoverContent } from "@/components/ui/popover";
import {
  ArrowDownWideNarrow, CheckCheck, RefreshCcwDot, StepForward,
  WrapText, FileType, MessageSquareText, SquarePen, ListPlus,
  Loader2
} from "lucide-react";
import {
  BetweenVerticalStart, BetweenVerticalEnd, BetweenHorizontalStart,
  BetweenHorizontalEnd, Replace, FileCode, FileText
} from 'lucide-react';
import { withAuthWrapper } from "@/providers/SessionProvider";
import { useTranslation } from "react-i18next";

const optionsEdit = [
  {
    value: "continue",
    label: "Continue writing",
    icon: StepForward,
  },
  {
    value: "complete",
    label: "Complete writing",
    icon: ListPlus,
  },
  {
    value: "improve",
    label: "Improving writing",
    icon: RefreshCcwDot,
  },
  {
    value: "sorter",
    label: "Make shorter",
    icon: ArrowDownWideNarrow,
  },
  {
    value: "longer",
    label: "Make longer",
    icon: WrapText,
  },
  {
    value: "fix",
    label: "Fix Grammar",
    icon: CheckCheck,
  },
];

const optionsMore = [
  {
    value: "adjust",
    label: "Adjust tone",
    icon: FileType,
  },
  {
    value: "feedback",
    label: "Feedback",
    icon: MessageSquareText,
  },
  {
    value: "rephrase",
    label: "Rephrase",
    icon: SquarePen,
  },
  {
    value: "summary",
    label: "Summary writing",
    icon: SquarePen,
  },
];

const ContentPopover = ({ children, content, isLoading, onAction }) => {
  return (
    <Popover>
      <PopoverTrigger className="w-full">
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        sideOffset={32}
        className="w-80 p-4 shadow-xl"
        align="start"
      >
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            <span className="ml-2 text-sm text-gray-600">Generating content...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto rounded border p-3 text-sm">
              {content}
            </div>
            <ContentActions onAction={onAction} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const ContentActions = ({ onAction }) => {
  const [markdownMode, setMarkdownMode] = useState(false);
  return (
    <ButtonGroup variant="ghost" className="flex items-center px-4">
      <Tooltip content="Insert Above" placement="top">
        <Button isIconOnly variant="bordered" onClick={() => onAction('insertAbove')}>
          <BetweenVerticalEnd />
        </Button>
      </Tooltip>
      <Tooltip content="Insert Below" placement="top">
        <Button isIconOnly variant="bordered" onClick={() => onAction('insertBelow')}>
          <BetweenVerticalStart />
        </Button>
      </Tooltip>
      <Tooltip content="Insert Left" placement="top">
        <Button isIconOnly variant="bordered" onClick={() => onAction('insertLeft')}>
          <BetweenHorizontalEnd />
        </Button>
      </Tooltip>
      <Tooltip content="Insert Right" placement="top">
        <Button isIconOnly variant="bordered" onClick={() => onAction('insertRight')}>
          <BetweenHorizontalStart />
        </Button>
      </Tooltip>
      <Tooltip content="Replace" placement="top">
        <Button isIconOnly variant="bordered" onClick={() => onAction('replace')}>
          <Replace />
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
};

interface BaseProps {
  appSession?: any;
}

interface AIBasicSelectorProps extends BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handleShopifyAI?: (shopName: string, userId: string, action: string, content: string) => Promise<any>;
}

const AIBasicSelector = ({
  open,
  onOpenChange,
  handleShopifyAI,
  appSession,
}: AIBasicSelectorProps) => {
  const { editor } = useEditor();
  const { t } = useTranslation("api");
  const [generationState, setGenerationState] = useState({
    isLoading: false,
    activeOption: null,
    generatedContent: null,
  });
  const { shopName, shopifyUserId: userId } = appSession;
  const handleContentAction = useCallback((action: string, content: string) => {
    if (!editor) return;
    const selection = editor.view.state.selection;
    switch (action) {
      case 'replace':
        editor.chain().focus().insertContentAt(
          { from: selection.from, to: selection.to },
          content
        ).run();
        break;
      case 'insertBelow':
        editor.chain().focus().insertContentAt(selection.to + 1, content).run();
        break;
      case 'insertAbove':
        editor.chain().focus().insertContentAt(selection.to - 1, content).run();
        break;
      case 'insertRight':
        editor.chain().focus().insertContentAt(selection.$from.pos, ` ${content}`).run();
        break;
      case 'insertLeft':
        editor.chain().focus().insertContentAt(selection.$to.pos, ` ${content}`).run();
        break;
    }
  }, [editor]);

  const handleGenerate = useCallback(
    async (command: string, content: string) => {
      if (!shopName || !userId || !content || content.trim() === "") return;
      setGenerationState(prev => ({
        ...prev,
        isLoading: true,
        activeOption: command,
      }));
      try {
        const result = await handleShopifyAI(shopName, userId, `CONTENT_${command}`, 
          { description: content }
        );
        setGenerationState(prev => ({
          ...prev,
          isLoading: false,
          generatedContent: result?.data?.content,
        }));
      } catch (error) {
        setGenerationState(prev => ({
          ...prev,
          isLoading: false,
          generatedContent: null,
        }));
      }
    },
    [shopName, userId, handleShopifyAI]
  );

  const handleSelect = useCallback(
    (option) => {
      if (!editor?.state) return;
      const { selection } = editor.state;
      const text = editor.storage.markdown.serializer.serialize(
        selection.content().content
      );
      handleGenerate(option.value, text);
    },
    [editor, handleGenerate]
  );

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          className="gap-1 rounded-none text-purple-500"
          variant="ghost"
          onClick={() => onOpenChange(true)}
          size="sm"
        >
          <MagicIcon className="h-5 w-5" />
          Ask AI
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        sideOffset={2}
        className="my-1 flex max-h-80 max-w-60 flex-col overflow-x-hidden overflow-y-auto rounded border p-1 shadow-xl"
        align="start"
      >
        <Command>
          <CommandList>
            {[
              { heading: "Ask AI to Customize Content", options: optionsEdit },
              { heading: "Unlock More AI Possibilities", options: optionsMore }
            ].map((group, index) => (
              <React.Fragment key={index}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={t(group.heading)}>
                  {group.options.map((option) => (
                    <ContentPopover
                      key={option.value}
                      content={generationState.generatedContent}
                      isLoading={generationState.isLoading && generationState.activeOption === option.value}
                      onAction={(action) => handleContentAction(action, generationState.generatedContent)}
                    >
                      <CommandItem
                        onSelect={() => handleSelect(option)}
                        className="flex gap-2 px-4"
                        value={option.value}
                        disabled={generationState.isLoading && generationState.activeOption !== option.value}
                      >
                        <option.icon className="h-4 w-4 text-purple-500" />
                        {option.label}
                        {generationState.isLoading && generationState.activeOption === option.value && (
                          <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                        )}
                      </CommandItem>
                    </ContentPopover>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default memo(withAuthWrapper(AIBasicSelector));