import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import debounce from 'lodash/debounce';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../ui/command';
import {
  RefreshCcwDot,
  WrapText,
  StepForward,
  ImagePlus,
  FileSearch,
  ScanText,
  BookText,
  Images,
  Search, 
  RefreshCw, 
  Copy, 
  Send, 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor } from '../core/index';
import { GradientLoadingCircle } from '@/components/GradientLoadingCircle';
import { Button } from '../ui/button';
import {
  WandIcon
} from '@shopify/polaris-icons';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { PopoverTrigger, Popover, PopoverContent } from '@/components/ui/popover';
import SearchBar from '@/components/Searchbar';
import RefreshButton from '@/components/ui/buttons/refresh-button';
import InsertButton from '@/components/ui/buttons/insert-button';
import CopyButton from '@/components/ui/buttons/copy-button';
import KeywordDetail from '../nodes';
import { toast } from 'sonner';
import { createAIImage } from "../plugins"
import { useEdgeStore } from '@/lib/edgestore';
import { EdgeStoreApiClientError } from '@edgestore/react/shared';
import { useDynamicSubmit } from "@/hooks/use-dynamic-submit";
import { useGeneralContext } from '@/context/general-context-provider';
import { useModelStore } from "@/stores/features/models/store";
import { useTranslation } from "react-i18next";
import Warning from '@/components/models/warning'; 

const LazyAIImage = React.lazy(() => import('../nodes/ai-image-node'));

interface AIImageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isGemini: boolean; 
}

interface DialogWrapperProps {
  children: React.ReactNode;
  isLoading: boolean;
}

const AIImageSelector: React.FC<AIImageSelectorProps> = ({ open, onOpenChange, isGemini }) => {
  const { editor } = useEditor();
  const { t } = useTranslation('api');
  const pos = editor.view.state.selection.from;
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [resData, setResData] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const setInputContext = useModelStore((state) => state.setInputContext);
  const inputModel = useModelStore((state) => state.inputModel);
  const setInputModel = useModelStore((state) => state.setInputModel);
  const { aiContext, aiModel, showWarning, warningType, nextTimeUsage, setAiContext, setAiModel, setIsSystemModel, setInputType, setOutputType, setShowWarning, setWarningType, setNextTimeUsage } = useGeneralContext();
  const { handleAIDynamicFunc } = useDynamicSubmit({ prompt: prompt, option: selectedOption, setIsLoading: setIsLoading, setResData: setResData, setError: setError, setShowWarning: setShowWarning, setWarningType: setWarningType, setNextTimeUsage: setNextTimeUsage });
  
  const handleSetup = useCallback((selectedOption: string) => {
    setIsSystemModel(true);
    setSelectedOption(selectedOption);
    setAiContext("image");
    setInputContext("general");
    if (isGemini) {
      setAiModel("gemini");
      setInputModel("gemini-1.5-pro");
      setInputType("text-image");
      setOutputType("text");
    } else {
      setAiModel("openai");
      setInputModel("dall-e-3");
      setInputType("text-only");
      setOutputType("image");
    }
    const slice = editor.state.selection.content();
    const text = editor.storage.markdown.serializer.serialize(slice.content);
    setPrompt(text);
  }, [editor, isGemini, setAiContext, setAiModel, setIsSystemModel, setSelectedOption, setInputContext, setInputModel, setInputType, setOutputType, setPrompt]);

  const handleAIGenerate = useCallback(async() => {
    if (aiContext === "image" && prompt && selectedOption && !isLoading) {
      setIsLoading(true);
      setOpenDialog(true);
      try {
        await handleAIDynamicFunc();
      } catch (error) {
        setOpenDialog(false);
        onOpenChange(false);
        console.error("Error generating image:", error);
        toast.error("Failed to generate image. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  }, [prompt, aiContext, isLoading, selectedOption, setIsLoading, setOpenDialog, onOpenChange, handleAIDynamicFunc]);

  const handleSubmit = useCallback((selectedOption: string) => {
    handleSetup(selectedOption);
    handleAIGenerate();
  }, [handleSetup, handleAIGenerate]);

  let imageOptions = [];

  switch (isGemini) {
    case true:
      imageOptions = [
        {
          value: 'describe',
          label: 'Image Description',
          icon: BookText,
        },
        {
          value: 'extract',
          label: 'Text Extraction',
          icon: ScanText,
        },
      ];
      break;
    case false:
      imageOptions = [
        {
          value: 'search',
          label: 'Search Image',
          icon: FileSearch,
        },
        {
          value: 'generate',
          label: 'Image Generator',
          icon: Images,
        },
      ];
      break;
    default:
      imageOptions = [
        {
          value: 'search',
          label: 'Search Image',
          icon: FileSearch,
        },
        {
          value: 'generate',
          label: 'Image Generator',
          icon: Images,
        },
      ];
  };

  const debouncedUpdateFilter = useRef(
    debounce((filteredResults: any[]) => {
      setSearchResults(filteredResults);
    }, 500)
  ).current;

  useEffect(() => {
    debouncedUpdateFilter(searchResults);
  }, [searchResults]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filteredResults = resData?.keywords
      ? resData.keywords.filter((keyword: { title: string }) =>
          keyword.title.toLowerCase().includes(e.target.value.toLowerCase())
        )
      : [];
    setSearchResults(filteredResults);
  };

  const insertTextAI = (content) => {
    const selection = editor.state.selection;
    const endPos = selection.$to.pos;
    editor
      .chain()
      .focus()
      .insertContentAt(endPos, ` ${content}`)
      .run();
  };

  const handleInsert = () => {
    switch (selectedOption) {
      case "generate":
      case "search":
        createAIImage(resData, editor.view, pos);
        break;
      case "describe":
      case "extract":
        insertTextAI(resData);
        break;
      default:
        break;
    }
    setOpenDialog(false);
    onOpenChange(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(resData || '');
  };

  const CommandButtonGroups: React.FC = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg shadow-lg"
      >
        <div className="flex justify-center items-center space-x-4">
          <AnimatedButton icon={<Send size={18} />} onClick={handleInsert} tooltip="Insert">
            Insert
          </AnimatedButton>
          <AnimatedButton icon={<RefreshCw size={18} />} onClick={() => handleSubmit({ value: selectedOption })} tooltip="Regenerate">
            Regenerate
          </AnimatedButton>
          <AnimatedButton icon={<Copy size={18} />} onClick={handleCopy} tooltip="Copy">
            Copy
          </AnimatedButton>
        </div>
      </motion.div>
    );
  };

  const AnimatedButton: React.FC<{ icon: React.ReactNode; onClick: () => void; tooltip: string; children: React.ReactNode }> = ({ icon, onClick, tooltip, children }) => (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 cursor-pointer"
      onClick={onClick}
      title={tooltip}
    >
      {icon}
      <span className="ml-2 font-medium">{children}</span>
    </motion.button>
  );

  const DialogWrapper: React.FC<DialogWrapperProps> = ({ children, isLoading }) => {
    return (
      <Dialog open={openDialog} onOpenChange={() => setOpenDialog(false)}>
        <DialogContent>
          <DialogHeader className="border-b pb-3">
            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-gray-800 dark:text-gray-100"
            >
              AI-Generated Details
            </motion.h2>
          </DialogHeader>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex-grow flex items-center w-full max-h-[500px justify-center p-8 overflow-auto"
              >
                <GradientLoadingCircle size={60} thickness={4} />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-grow flex flex-col space-y-4 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-200"
              >
                <SearchBar 
                  handleChange={handleSearch} 
                  disabled={isLoading} 
                  placeholder="Search keywords..."
                  icon={<Search className="text-gray-400" size={20} />}
                />
                {/*
                {searchResults.length === 0 ? (
                  <p className="text-center text-gray-500 italic">
                    No items found. Try a different search term.
                  </p>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <KeywordDetail keyword={searchResults[0]} />
                  </motion.div>
                )}*/}
                {children}
              </motion.div>
            )}
          </AnimatePresence>
          {resData && !isLoading && <CommandButtonGroups />}
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <React.Fragment>
      <Popover modal={true} open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            className="gap-1 rounded-none text-purple-500"
            variant="ghost"
            onClick={() => onOpenChange(true)}
            size="sm"
          >
            <ImagePlus className="h-5 w-5" />
            Image AI
          </Button>
        </PopoverTrigger>
        <PopoverContent
          sideOffset={5}
          className="my-1 flex max-h-80 w-60 flex-col overflow-hidden overflow-y-auto rounded border p-1 shadow-xl"
          align="start"
        >
          <Command className="w-[350px]">
            <CommandList>
              <CommandGroup heading="Describe or extract image">
                {imageOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    className="flex space-x-2 gap-2 px-4"
                    value={option.value}
                    onSelect={() => {
                      setSelectedOption(option.value);
                      handleSubmit(option.value);
                    }}
                  >
                    <option.icon className="h-4 w-4 text-purple-500" />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <DialogWrapper isLoading={isLoading} />
      {showWarning && (
        <Warning
          type={warningType}
          nextTimeUsage={nextTimeUsage}
          inputModel={inputModel}
        />
      )}
    </React.Fragment>
  );
};

export default AIImageSelector;






