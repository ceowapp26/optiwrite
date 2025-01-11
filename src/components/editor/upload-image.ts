import { createImageUpload } from "./plugins/UploadImages";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";

const onUpload = (file: File) => {
 return new Promise<string>((resolve, reject) => {
   const uploadPromise = async () => {
     try {
       const fileExt = file.name.split('.').pop();
       const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
       const filePath = `uploads/${fileName}`;
       const { data, error } = await supabase.storage
         .from('doc2product-images')
         .upload(filePath, file);
       if (error) throw error;
       const { data: { publicUrl } } = supabase.storage
         .from('doc2product-images')
         .getPublicUrl(filePath);
       const image = new Image();
       image.src = publicUrl;
       return new Promise<string>((imageResolve) => {
         image.onload = () => imageResolve(publicUrl);
       });
     } catch (error) {
       throw error;
     }
   };

   toast.promise(uploadPromise(), {
     loading: "Uploading image...", 
     success: (url) => {
       resolve(url);
       return "Image uploaded successfully.";
     },
     error: (error) => {
       reject(error);
       return "Error uploading image. Please try again.";
     }
   });
 });
};

export const uploadFn = createImageUpload({
 onUpload,
 validateFn: (file) => {
   if (!file.type.includes("image/")) {
     toast.error("File type not supported.");
     return false;
   }
   if (file.size / 1024 / 1024 > 20) {
     toast.error("File size too big (max 20MB).");
     return false;
   }
   return true;
 },
});