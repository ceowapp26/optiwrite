"use client";
import { ElementRef, useRef, useState } from "react";
import { ImageIcon, Smile, X } from "lucide-react";
import { type PRODUCT } from "@/types/product";
import { LengthConstraintSchema } from '@/schemas/product.schema';
import { Box, Text, InlineStack, Tag, Tooltip, Select, Button as PolarisButton, TextField } from '@shopify/polaris';
import TextareaAutosize from "react-textarea-autosize";
import { LightbulbIcon } from '@shopify/polaris-icons';
import { useCoverImage } from "@/hooks/useCoverImage";
import { toast } from 'sonner';
import { type UserIds } from '@/types/auth';
import { Button } from "@/components/ui/button";
import { IconPicker } from "./IconPicker";

interface ToolbarProps {
  initialData: PRODUCT;
  url?: string;
  preview?: boolean;
  onAddIcon?: (icon: string) => void;
  onRemoveIcon?: (icon: string) => void;
  onUpdateTitle?: (value: string) => void;
  onSelectUploadType: (type: 'local' | 'unsplash') => void;
  onSelectImageCommand: (command: 'add' | 'replace') => void;
  shopName: string;
  userIds: UserIds;
  handleShopifyAI: (shopName: string, userIds: UserIds, action: string, content: Record<string, string>) => Promise<any>;
}


const KeyboardEventWrapper: React.FC<{ children: React.ReactNode; onKeyDown: (event: React.KeyboardEvent) => void }> = ({ children, onKeyDown }) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    onKeyDown(event);
  };
  return (
    <div className="w-full px-4 flex-1" onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
};


export const Toolbar = ({
  shopName,
  userIds,
  handleShopifyAI,
  initialData,
  url,
  preview,
  onAddIcon,
  onRemoveIcon,
  onUpdateTitle,
  onSelectUploadType,
  onSelectImageCommand
}: ToolbarProps) => {
  const theme = localStorage.getItem('theme') || 'light';
  const inputRef = useRef<ElementRef<"textarea">>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [value, setValue] = useState(initialData.title);
  const coverImage = useCoverImage();

  const handleUploadLocal = () => {
    onSelectImageCommand('add');
    onSelectUploadType('local');
    coverImage?.onOpen();
  };

  const enableInput = () => {
    if (preview) return;
    setIsEditing(true);
    setTimeout(() => {
      setValue(initialData.title);
      inputRef.current?.focus();
    }, 0);
  };

  const disableInput = () => setIsEditing(false);

  const onInput = (value: string) => {
    setValue(value);
    onUpdateTitle?.(value || "Untitled");
  };

  const onKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      disableInput();
    }
  };

  const onIconSelect = (icon: string) => {
    onAddIcon?.(icon);
  };

  const onIconRemove = (icon: string) => {
    onRemoveIcon?.(icon);
  };

  const handleAIGenerate = async () => {
    if (isGenerating) return;
    try {
      const validation = LengthConstraintSchema.shape.title.safeParse(value);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message, {
          duration: 5000,
          position: 'top-center',
          icon: '❌'
        });
        return;
      }
      setError(null);
      setIsGenerating(true);
      setIsEditing(false);
      const result = await handleShopifyAI(shopName, userIds, 'SEOSINGLE', { title: value });
      if (result?.title) {
        setValue(result.title);
        onUpdateTitle?.(result.title);
        toast.success('Title generated successfully', {
          duration: 3000,
          position: 'top-center',
          icon: '✨'
        });
      }
    } catch (error) {
      setError(error);
      toast.error(error.message || 'Failed to generate title', {
        duration: 5000,
        position: 'top-center',
        icon: '❌'
      });
    } finally {
      setError(null);
      setIsGenerating(false);
    }
  };

  return (
    <div className="group/toolbar relative w-full">
      <div className="opacity-0 group-hover/toolbar:opacity-100 flex items-center gap-x-2 px-4 py-4">
        {!initialData.icon && !preview ? (
          <IconPicker asChild onChange={onIconSelect}>
            <Button
              className="text-muted-foreground text-xs"
              variant="outline"
              size="sm"
            >
              <Smile className="h-4 w-4 mr-2" />
              Add icon
            </Button>
          </IconPicker>
        ) : (
          <Button
            onClick={() => onIconRemove(initialData.icon)}
            className="text-muted-foreground text-xs"
            variant="outline"
            size="sm"
          >
            <X className="h-4 w-4 mr-2" />
            Remove icon
          </Button>
        )}
        {((!initialData?.images?.length ||
          !initialData?.images?.every(Boolean)) &&
          !initialData?.image?.src &&
          !url
        ) ? (
          <Button
            onClick={handleUploadLocal}
            className="text-muted-foreground text-xs"
            variant="outline"
            size="sm"
          >
            <ImageIcon className={`h-4 w-4 mr-2 ${theme === 'light' ? 'text-gray-900' : 'text-gray-200'}`} />
            Add cover
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col">
        <div className="py-2 px-4">
          <Text variant="headingMd" as="h2">Title</Text>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center max-w-4/5">
            {!!initialData.icon && !preview ? (
              <div className="flex items-center gap-x-2 px-6 py-6">
                <IconPicker onChange={onIconSelect}>
                  <p className="text-2xl hover:opacity-75 transition">
                    {initialData.icon}
                  </p>
                </IconPicker>
              </div>
            ) : (
              !!initialData.icon && preview && (
                <p className="text-2xl px-6 py-6">{initialData.icon}</p>
              )
            )}
            {isEditing && !preview ? (
              <KeyboardEventWrapper onKeyDown={onKeyDown}>
                <div className="w-full">
                  <TextField
                    value={value}
                    onChange={(newValue) => onInput(newValue)}
                    onBlur={disableInput}
                    type="text"
                    autoComplete="off"
                    placeholder={"Enter your product title"}
                    multiline={2}
                    showCharacterCount
                    maxLength={200}
                    readOnly={isGenerating}
                    error={error}
                  />
                </div>
              </KeyboardEventWrapper>
            ) : (
              <div
                onClick={enableInput}
                className={`mx-4 mb-4 text-2xl py-2 font-bold break-words outline-none ${theme === 'light' ? 'text-[#3F3F3F]' : 'text-[#CFCFCF]'}`}
              >
                {initialData.title}
              </div>
            )}
          </div>
          {!preview && (
            <div className="mb-4">
              <Tooltip content="Generate AI title">
                <PolarisButton
                  disabled={isGenerating}
                  icon={LightbulbIcon}
                  onClick={handleAIGenerate}
                  loading={isGenerating}
                />
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};