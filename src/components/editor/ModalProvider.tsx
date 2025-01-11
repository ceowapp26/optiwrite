"use client";
import React, { useEffect, useState } from "react";
import { CoverImageModal } from "./modals/CoverImageModal";
import dynamic from 'next/dynamic';

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }
  
  return (
    <React.Fragment>
      <CoverImageModal />
    </React.Fragment>
  );
};
