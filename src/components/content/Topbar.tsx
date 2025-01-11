"use client"

import { useGeneralContext, useGeneralActions } from "@/context/GeneralContextProvider";
import { Button } from "@shopify/polaris";
import {
  ViewIcon,
  EditIcon,
  PlusIcon
} from '@shopify/polaris-icons';
import { motion } from "framer-motion";

const Topbar = ({ handleAddField }) => {
  const { state } = useGeneralContext();
  const { isEditFullScreen } = state;
  const { setIsEditFullScreen } = useGeneralActions();
  const onEditFullScreenToggle = () => setIsEditFullScreen(!isEditFullScreen);
  return (
    <motion.div 
      className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-divider"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Content Editor</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant ="primary"
            icon={isEditFullScreen ? <ViewIcon /> : <EditIcon />}
            onClick={onEditFullScreenToggle}
          >
            {isEditFullScreen ? "View Mode" : "Edit Mode"}
          </Button>
          <Button
            variant="primary"
            icon={<PlusIcon />}
          >
            Add Field
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default Topbar;