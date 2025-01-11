import * as React from 'react';
import { useEffect, useState } from 'react';
import { HardDriveUpload, ImageUp, Star, Trash2, EllipsisVertical } from 'lucide-react';
import { PopoverTrigger, Popover, PopoverContent } from "@/components/ui/popover";
import { EdgeStoreApiClientError } from '@edgestore/react/shared';
import { useEdgeStore } from "@/lib/edgestore";
import { useCoverImage } from "@/hooks/useCoverImage";
import { PRODUCT } from '@/types/product';

interface ToolbarProps {
  initialData: PRODUCT;
  url?: string;
  preview?: boolean;
  onRemoveImage: (url: string) => Promise<void>;
  onSetFeaturedImage: (url: string) => void;
  onSelectUploadType: (type: 'local' | 'unsplash') => void;
  onSelectImageCommand: (command: 'add' | 'replace') => void;
}

const uploadOptions = [
  {
    value: "unsplash",
    label: "Unsplash",
    icon: HardDriveUpload,
  },
  {
    value: "local",
    label: "Local",
    icon: ImageUp,
  },
];


export const ImageUpload = ({ 
  initialData,
  url,
  onSetFeaturedImage,
  onRemoveImage,
  onSelectUploadType,
  onSelectImageCommand,
}: ToolbarProps) => {
  const theme = localStorage.getItem("theme");
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadPopoverOpen, setUploadPopoverOpen] = useState(false);
  const [groupOpacity, setGroupOpacity] = useState(false);
  const coverImage = useCoverImage();

  const handleImageAction = (action: 'add' | 'replace', type: 'local' | 'unsplash') => {
    onSelectImageCommand(action);
    onSelectUploadType(type);
    setUploadPopoverOpen(false);
    setMenuOpen(false);
    if (type === 'local')
      coverImage?.onOpen();
  };

  const handleRemoveImage = async (imageUrl: string) => {
    try {
      await onRemoveImage(imageUrl);
      setMenuOpen(false);
    } catch (error) {
      console.error("EdgeStore error:", error);
      alert(error.data.code === 'DELETE_NOT_ALLOWED' 
        ? "You don't have permission to delete this file."
        : "An error occurred while deleting the file.");
    }
  };

  const handleSetFeatured = (imageUrl: string) => {
    onSetFeaturedImage(imageUrl);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (menuOpen) {
      setGroupOpacity(true);
    } else {
      const timer = setTimeout(() => setGroupOpacity(false), 200);
      return () => clearTimeout(timer);
    }
  }, [menuOpen]);

  return (
    <div className={`${url ? "flex" : "hidden"} group/image relative top-5 px-6 h-full z-[99]`}>
      <div className={`${groupOpacity ? "opacity-100" : "opacity-0"} flex group-hover/image:opacity-100 items-center gap-x-1 py-4`}>
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button className="absolute right-10 inline-flex items-center px-1 py-1 rounded-xl hover:bg-gray-500/10 dark:hover:bg-slate-700 transition-colors duration-200 text-black text-sm flex-shrink-0 border dark:hover:text-white dark:text-slate-100 dark:border-white border-black/20">
              <EllipsisVertical size={20} className={`${ theme === 'light' ? 'text-gray-900' : 'text-gray-200'}`} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end" side="bottom">
            <div className="space-y-1">
              <Popover open={uploadPopoverOpen} onOpenChange={setUploadPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
                    <ImageUp className="mr-2 h-4 w-4" />
                    <span>Add Image</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-40" align="end" side="right">
                  {uploadOptions.map((option) => (
                    <button
                      key={option.value}
                      className="w-full flex items-center px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                      onClick={() => handleImageAction('add', option.value as 'local' | 'unsplash')}
                    >
                      <option.icon className="mr-2 h-4 w-4" />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {url && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
                        <HardDriveUpload className="mr-2 h-4 w-4" />
                        <span>Replace Image</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40" align="end" side="right">
                      {uploadOptions.map((option) => (
                        <button
                          key={option.value}
                          className="w-full flex items-center px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                          onClick={() => handleImageAction('replace', option.value as 'local' | 'unsplash')}
                        >
                          <option.icon className="mr-2 h-4 w-4" />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>

                  <button
                    className="w-full flex items-center px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                    onClick={() => handleRemoveImage(url)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Remove Image</span>
                  </button>

                  <button
                    className="w-full flex items-center px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                    onClick={() => handleSetFeatured(url)}
                  >
                    <Star className="mr-2 h-4 w-4" />
                    <span>Set as Featured</span>
                  </button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};