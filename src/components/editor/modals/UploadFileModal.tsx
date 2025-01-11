"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useUploadFile } from "@/hooks/useUploadFile";
import { SingleFileDropzone } from "../SingleFileDropzone";
import mammoth from 'mammoth';
import { useEditor } from "../core";
import StarterKit from "@tiptap/starter-kit";
import * as XLSX from "xlsx";

export const UploadFileModal = () => {
  const uploadFile = useUploadFile();
  const [file, setFile] = useState<File>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editor = useEditor();
  const editorInstance = editor.editor;
  if (!editorInstance) {
    console.error("Editor instance is not available.");
    return;
  }
  const onClose = () => {
    setFile(undefined);
    setIsSubmitting(false);
    uploadFile.onClose();
  };

  const onChange = async (file?: File) => {
    if (file) {
      setIsSubmitting(true);
      setFile(file);
      try {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const insertContentAtSelection = (content: string) => {
          editorInstance
          .chain()
          .focus()
          .insertContent(
            content
          )
          .run();
        };

        switch (fileExtension) {
          case 'docx':
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            insertContentAtSelection(result.value);
            break;

          case 'xlsx':
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const html = `<table>${json.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
            insertContentAtSelection(html);
            break;

          case 'txt':
            const text = await file.text();
            insertContentAtSelection(text);
            break;

          case 'html':
            const htmlContent = await file.text();
            insertContentAtSelection(htmlContent);
            break;

          case 'json':
            const jsonData = await file.text();
            const jsonObj = JSON.parse(jsonData);
            const formattedJson = `<pre>${JSON.stringify(jsonObj, null, 2)}</pre>`;
            insertContentAtSelection(formattedJson);
            break;

          default:
            throw new Error('File type not supported');
        }

        onClose();
      } catch (error) {
        console.error(error);
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={uploadFile.isOpen} onOpenChange={uploadFile.onClose}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-center text-lg font-semibold">Upload File</h2>
        </DialogHeader>
        <SingleFileDropzone
          className="w-full outline-none"
          disabled={isSubmitting}
          value={file}
          onChange={onChange}
        />
      </DialogContent>
    </Dialog>
  );
};
