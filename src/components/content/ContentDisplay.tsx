"use client";
import React, { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Badge,
  BlockStack,
  Checkbox,
  Page,
  TextField,
  SkeletonBodyText,
  SkeletonDisplayText,
  Toast,
  Modal,
  Spinner,
  Frame
} from '@shopify/polaris';
import {
  Maximize2,
  RefreshCw,
  Clipboard,
  Check,
} from 'lucide-react';
import dynamic from 'next/dynamic'
import { withAuthWrapper } from '@/providers/SessionProvider';
import { ImageUpload } from "@/components/editor/ImageUpload";
import { Toolbar } from "@/components/editor/Toolbar";
import { Cover } from "@/components/editor/Cover";
import { type AppSession } from '@/types/auth';

interface ContentData {
  title: string;
  bodyContent: string;
  images: string[];
}

interface BaseContentDisplayProps {
  appSession?: AppSession;
}

interface ContentDisplayProps extends BaseContentDisplayProps {
  contentId: string;
  content: ContentData;
  onContentChange: (newContent: ContentData) => void;
  onContentUpdate: (newContent: ContentData) => void;
  isRealtimeEditing: boolean;
  setIsRealtimeEditing: React.Dispatch<React.SetStateAction<boolean>>;
  handleGenerateAI: (userId: string, action: string, content: string) => Promise<any>;
}

const ContentDisplay: React.FC<ContentDisplayProps> = ({
  session,
  contentId,
  content,
  onContentChange,
  onContentUpdate,
  isRealtimeEditing,
  setIsRealtimeEditing,
}) => {
  const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [toastActive, setToastActive] = useState(false);

  const handleCopy = () => {
    setIsCopied(true);
    setToastActive(true);
    setTimeout(() => setToastActive(false), 3000);
  };

  const Editor = useMemo(() => dynamic(() => import("@/components/editor"), { ssr: false }), []);

  if (content === undefined) {
    return (
      <div>
        <SkeletonBodyText lines={4} />
        <div className="w-full p-4 mx-auto mt-10">
          <SkeletonDisplayText size="large" />
          <SkeletonBodyText lines={4} />
        </div>
      </div>
    );
  }

  if (content === null) {
    return <div>Not found</div>;
  }

  const handleContentChange = (field: keyof ContentData, value: string) => {
    onContentChange({
      ...content,
      [field]: value,
    });
  };

  const handleContentUpdate = (field: keyof ContentData, value: string) => {
    onContentUpdate({
      ...content,
      [field]: value,
    });
  };

  return (
    <Frame>
      <Page>
        <Card sectioned>
          <div className="flex justify-between items-center mb-8">
            <Badge status="info">Product Preview</Badge>
            <div className="flex gap-4">
              <BlockStack vertical spacing="tight">
                <label>Edit Mode</label>
                <Checkbox
                  label=""
                  checked={isGlobalEditMode}
                  onChange={() => setIsGlobalEditMode(!isGlobalEditMode)}
                />
              </BlockStack>
              <BlockStack vertical spacing="tight">
                <label>Realtime Editing</label>
                <Checkbox
                  label=""
                  checked={isRealtimeEditing}
                  onChange={() => setIsRealtimeEditing(!isRealtimeEditing)}
                />
              </BlockStack>
              <Button onClick={handleCopy} icon={isCopied ? <Check /> : <Clipboard />} />
            </div>
          </div>

          <div className="flex justify-between gap-6 mb-8">
            <Button icon={<Maximize2 />} onClick={() => document.documentElement.requestFullscreen()} />
            <Button icon={<RefreshCw />} onClick={() => window.location.reload()} />
          </div>

          <Cover url={content?.coverImage || 'https://www.shutterstock.com/image-vector/place-holder-vector-icon-isolated-260nw-2431598639.jpg'} />
          <ImageUpload initialData={content?.bodyContent} url={content?.coverImage || 'https://www.shutterstock.com/image-vector/place-holder-vector-icon-isolated-260nw-2431598639.jpg'} />
          <div className="w-full h-full px-8 mx-auto">
            <Toolbar initialData={content?.bodyContent} url={content?.coverImage || 'https://www.shutterstock.com/image-vector/place-holder-vector-icon-isolated-260nw-2431598639.jpg'} />
            <Editor
              session={session}
              contentId={contentId}
              onChange={onContentChange}
              initialContent={content?.bodyContent}
              contentTitle={content?.title}
            />
          </div>
        </Card>

        {!isRealtimeEditing && (
          <div className="absolute bottom-0 w-full bg-white p-4 shadow-md flex justify-between">
            <Button
              onClick={() => handleContentUpdate(content)}
              primary
              size="small"
            >
              Publish
            </Button>
          </div>
        )}

        {toastActive && (
          <Toast
            content="Content copied!"
            onDismiss={() => setToastActive(false)}
          />
        )}
      </Page>
    </Frame>
  );
};

export default ContentDisplay;
