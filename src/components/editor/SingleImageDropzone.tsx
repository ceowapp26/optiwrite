'use client';

import { UploadCloudIcon, X, CheckCircle, AlertCircle } from 'lucide-react';
import * as React from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

const variants = {
  base: 'relative rounded-lg flex justify-center items-center flex-col cursor-pointer min-h-[200px] min-w-[300px] border-2 border-dashed transition-all duration-300 ease-in-out',
  image: 'border-0 p-0 min-h-0 min-w-0 relative shadow-lg rounded-lg overflow-hidden',
  active: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30',
  disabled: 'bg-gray-200 border-gray-300 cursor-default pointer-events-none bg-opacity-30 dark:bg-gray-700',
  accept: 'border-green-500 bg-green-50 dark:bg-green-900/30',
  reject: 'border-red-500 bg-red-50 dark:bg-red-900/30',
};

const UploadStatus = {
  IDLE: 'IDLE',
  UPLOADING: 'UPLOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
};

const SingleImageDropzone = React.forwardRef(({ onChange, value, className, disabled, dropzoneOptions, ...props }, ref) => {
  const [uploadStatus, setUploadStatus] = React.useState(UploadStatus.IDLE);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const imageUrl = React.useMemo(() => {
    if (typeof value === 'string') {
      return value;
    } else if (value instanceof File) {
      return URL.createObjectURL(value);
    }
    return null;
  }, [value]);

  const onDrop = React.useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadStatus(UploadStatus.UPLOADING);
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setUploadStatus(UploadStatus.SUCCESS);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      onChange?.(file);
    }
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    accept: { 'image/*': [] },
    multiple: false,
    disabled,
    onDrop,
    ...dropzoneOptions,
  });

  const dropZoneClassName = React.useMemo(
    () =>
      twMerge(
        variants.base,
        isDragActive && variants.active,
        isDragAccept && variants.accept,
        isDragReject && variants.reject,
        imageUrl && variants.image,
        disabled && variants.disabled,
        className,
      ).trim(),
    [isDragActive, isDragAccept, isDragReject, imageUrl, disabled, className],
  );

  return (
    <div className="relative">
      <motion.div
        {...getRootProps({
          className: dropZoneClassName,
          style: { width: props.width, height: props.height },
        })}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input ref={ref} {...getInputProps()} />

        <AnimatePresence>
          {imageUrl ? (
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full object-cover"
              src={imageUrl}
              alt="Uploaded image"
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center text-sm text-gray-600 dark:text-gray-300"
            >
              <UploadCloudIcon className="mb-4 h-10 w-10" />
              <p className="text-center">
                Drag & drop your image here, or click to select
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG, GIF up to 10MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {uploadStatus === UploadStatus.UPLOADING && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80"
          >
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
              <p className="text-blue-600 dark:text-blue-400">Uploading... {uploadProgress}%</p>
            </div>
          </motion.div>
        )}

        {uploadStatus === UploadStatus.SUCCESS && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-2 right-2 text-green-500 dark:text-green-400"
          >
            <CheckCircle className="w-6 h-6" />
          </motion.div>
        )}

        {uploadStatus === UploadStatus.ERROR && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-2 right-2 text-red-500 dark:text-red-400"
          >
            <AlertCircle className="w-6 h-6" />
          </motion.div>
        )}
      </motion.div>

      {imageUrl && !disabled && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          onClick={(e) => {
            e.stopPropagation();
            onChange?.(undefined);
            setUploadStatus(UploadStatus.IDLE);
            setUploadProgress(0);
          }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
});

SingleImageDropzone.displayName = 'SingleImageDropzone';

export { SingleImageDropzone };