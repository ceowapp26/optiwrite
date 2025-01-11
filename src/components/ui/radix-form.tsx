"use client";

import * as React from "react";
import * as FormPrimitive from "@radix-ui/react-form";
import { cn } from "@/lib/utils";

const Form = React.forwardRef<
  React.ElementRef<typeof FormPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Root>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Root ref={ref} className={cn("space-y-6", className)} {...props} />
));
Form.displayName = FormPrimitive.Root.displayName;


const FormLabel = React.forwardRef<
  React.ElementRef<typeof FormPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Label>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Label ref={ref} className={cn("block text-sm font-medium text-gray-700", className)} {...props} />
));
FormLabel.displayName = FormPrimitive.Label.displayName;

const FormControl = React.forwardRef<
  React.ElementRef<typeof FormPrimitive.Control>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Control>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Control ref={ref} className={cn("mt-1", className)} {...props} />
));
FormControl.displayName = FormPrimitive.Control.displayName;

const FormMessage = React.forwardRef<
  React.ElementRef<typeof FormPrimitive.Message>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Message>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Message ref={ref} className={cn("text-sm text-red-600", className)} {...props} />
));
FormMessage.displayName = FormPrimitive.Message.displayName;

const FormField = React.forwardRef<
  React.ElementRef<typeof FormPrimitive.Field>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Field>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Field ref={ref} className={cn("block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm", className)} {...props} />
));
FormField.displayName = FormPrimitive.Field.displayName;

const FormSubmit = React.forwardRef<
  React.ElementRef<typeof FormPrimitive.Submit>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Submit>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Submit ref={ref} className={cn("inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500", className)} {...props} />
));
FormSubmit.displayName = FormPrimitive.Submit.displayName;

export {
  Form,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
  FormSubmit,
};
