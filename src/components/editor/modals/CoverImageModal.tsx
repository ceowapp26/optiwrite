"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useCoverImage } from "@/hooks/useCoverImage";
import { SingleImageDropzone } from "../SingleImageDropzone";
import { useEdgeStore } from "@/lib/edgestore";
import { EdgeStoreApiClientError } from "@edgestore/react/shared";
import { UnsplashCoverModal } from "./UnsplashImageModal";
import { supabase } from '@/lib/supabase';

export const CoverImageModal = ({ shopName, imageCommand, uploadType, onSelectUploadType, handleAddImage, handleReplaceImage }) => {
  const params = useParams(); 
  const coverImage = useCoverImage();
  const [file, setFile] = useState<File>();
  const [unsplashModalOpened, setUnsplashModalOpened] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onCloseUnsplashUpload = () => {
    setUnsplashModalOpened(false);
    onSelectUploadType(undefined);
  };

  const onCloseLocalUpload = () => {
    setFile(undefined);
    setIsSubmitting(false);
    coverImage.onClose();
    onSelectUploadType(undefined);
  };

  const onUnsplashChange = (url: string) => {
    if (url && uploadType === "unsplash") {
      switch (imageCommand) {
        case "replace":
          handleReplaceImage(url);
          break;
        case "add":
          handleAddImage(url);
          break;
        default:
          console.warn("Unknown image command:", imageCommand);
          break;
      }
    }
    onCloseUnsplashUpload();
  };

  const onLocalChange = async (file?: File) => {
    if (file) {
      setIsSubmitting(true);
      setFile(file);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${shopName}/${fileName}`;
        const { data, error } = await supabase.storage
          .from(`optiwrite-images`)
          .upload(filePath, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
          .from(`optiwrite-images`)
          .getPublicUrl(filePath);
        if (uploadType === "local") {
          switch (imageCommand) {
            case "replace":
              await handleReplaceImage(publicUrl);
              break;
            case "add":
              if (publicUrl) {
                await handleAddImage(publicUrl);
              }
              break;
            default:
              console.warn("Unknown image command:", imageCommand);
              break;
          }
        }
        onCloseLocalUpload();
      } catch (error) {
        console.error("Error occurred while uploading cover image:", error);
        toast("An error occurred while uploading cover image. Please try again later.");
        setIsSubmitting(false);
        setFile(undefined);
      }
    }
  };

  if (!uploadType) return;

  return uploadType === "local" ? (
    <Dialog open={coverImage.isOpen} onOpenChange={coverImage.onClose}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-center text-lg font-semibold">Cover Image</h2>
        </DialogHeader>
        <SingleImageDropzone
          className="w-full outline-none"
          disabled={isSubmitting}
          value={file}
          onChange={onLocalChange}
        />
      </DialogContent>
    </Dialog>
  ) : (
    <UnsplashCoverModal handleClose={onCloseUnsplashUpload} onImageUpdate={onUnsplashChange} />
  );
};
