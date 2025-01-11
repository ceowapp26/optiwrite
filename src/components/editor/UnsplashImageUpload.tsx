import React, { useState } from 'react';
import { UnsplashImageSkeleton } from "./UnsplashImageSkeleton";
import { EdgeStoreApiClientError } from '@edgestore/react/shared';
import { createUnSplashImage } from "./plugins/UnsplashUploadImages";

interface UnsplashImageProp {
 view: EditorView;
 pos: number;
}

export const UnsplashImageModal = ({ view, pos }: UnsplashImageProp) => {
 const [isModalOpen, setIsModalOpen] = useState(true);
 const handleClose = () => {
   setIsModalOpen(false);
 };
 const handleUpdate = async (url: string) => {
  console.log("this is url", url)
   createUnSplashImage(url, view, pos);
 };
 if (!isModalOpen) {
   return null;
 }
 return (
   <React.Fragment>
     <UnsplashImageSkeleton handleUpdate={handleUpdate} handleClose={handleClose} />
   </React.Fragment>
 );
};