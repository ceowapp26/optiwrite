'use client';

import { FileUp, X, CheckCircle, AlertCircle } from 'lucide-react';
import * as React from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { twMerge } from 'tailwind-merge';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

const variants = {
  base: 'relative rounded-lg flex justify-center items-center flex-col cursor-pointer min-h-[200px] min-w-[300px] border-2 border-dashed border-gray-400 dark:border-gray-600 transition-all duration-300 ease-in-out',
  preview: 'border-0 p-4 min-h-0 min-w-0 relative shadow-lg bg-white dark:bg-gray-800 rounded-lg',
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

const SingleFileDropzone = React.forwardRef(({ onChange, ...props }, ref) => {
  const [fileContent, setFileContent] = React.useState(null);
  const [uploadStatus, setUploadStatus] = React.useState(UploadStatus.IDLE);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const handleFileRead = async (file) => {
    setUploadStatus(UploadStatus.UPLOADING);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    let content = '';

    try {
      switch (fileExtension) {
        case 'docx':
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          content = result.value;
          break;
        case 'xlsx':
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          content = `<table class="border-collapse border border-gray-300 dark:border-gray-600">
            ${json.map(row => `<tr>${row.map(cell => `<td class="border border-gray-300 dark:border-gray-600 p-2">${cell}</td>`).join('')}</tr>`).join('')}
          </table>`;
          break;
        case 'txt':
        case 'html':
          content = await file.text();
          break;
        case 'json':
          const jsonData = await file.text();
          const jsonObj = JSON.parse(jsonData);
          content = `<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto">${JSON.stringify(jsonObj, null, 2)}</pre>`;
          break;
        default:
          throw new Error('Unsupported file type');
      }

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(i);
      }

      setFileContent(content);
      setUploadStatus(UploadStatus.SUCCESS);
      onChange?.(file);
    } catch (error) {
      console.error(error);
      setUploadStatus(UploadStatus.ERROR);
    }
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/html': ['.html'],
      'application/json': ['.json'],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        handleFileRead(file);
      }
    },
    ...props.dropzoneOptions,
  });

  const dropZoneClassName = React.useMemo(
    () =>
      twMerge(
        variants.base,
        isDragActive && variants.active,
        isDragAccept && variants.accept,
        isDragReject && variants.reject,
        fileContent && variants.preview,
        props.disabled && variants.disabled,
        props.className,
      ).trim(),
    [isDragActive, isDragAccept, isDragReject, fileContent, props.disabled, props.className],
  );

  return (
    <div className="relative">
      <div
        {...getRootProps({
          className: dropZoneClassName,
          style: { width: props.width, height: props.height },
        })}
      >
        <input ref={ref} {...getInputProps()} />

        <AnimatePresence>
          {fileContent ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full overflow-auto"
            >
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: fileContent }} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center text-sm text-gray-600 dark:text-gray-300"
            >
              <FileUp className="mb-4 h-10 w-10" />
              <p className="text-center">
                Drag & drop your file here, or click to select
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Supported formats: DOCX, XLSX, TXT, HTML, JSON
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {uploadStatus === UploadStatus.UPLOADING && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 w-full"
          >
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
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
      </div>

      {fileContent && !props.disabled && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          onClick={(e) => {
            e.stopPropagation();
            setFileContent(null);
            setUploadStatus(UploadStatus.IDLE);
            setUploadProgress(0);
            onChange?.(undefined);
          }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
});

SingleFileDropzone.displayName = 'SingleFileDropzone';

export { SingleFileDropzone };