import React, { useState } from 'react';
import { ImageUp } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/Command";
import {
  PopoverTrigger,
  Popover,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "../ui/EditorButton";
import { useEditor } from "../core/index";
import { UnsplashImageModal } from "../UnsplashImageUpload"

interface ImageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageSelector = ({ open, onOpenChange }: ImageSelectorProps) => {
  const { editor } = useEditor();
  const pos = editor.view.state.selection.from;
  
  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button className="gap-2 rounded-none" variant="ghost">
          <ImageUp className="w-5 h-6"/>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        sideOffset={5}
        className="my-1 flex max-h-80 w-full flex-col overflow-hidden overflow-y-auto rounded border p-1 shadow-xl "
        align="start"
      >
        <UnsplashImageModal view={editor.view} pos={pos} />
      </PopoverContent>
    </Popover>
  );
}



