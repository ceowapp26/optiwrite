import React from 'react';
import { Typography } from '@mui/material';
import { Box, Grid } from "@mui/material";
import { useFormContext } from "react-hook-form";
import { EDIT_FORM } from '@/constants/product';
import { PRODUCT } from '@/types/product';
import FormGenerator from "@/components/forms/form-generator";
import ImageCarousel from '@/components/ImageCarousel';

const EditForm = ({ product, isEdit }: { product: PRODUCT, isEdit?: boolean }) => {
  const {
    register,
    formState: { errors },
    control,
    trigger,
    watch,
    setValue,
  } = useFormContext();  
  
  return (
    <Grid container spacing={2}>
      {EDIT_FORM.map((field) => (
        field.name === 'price' || field.name === 'costPerItem' || field.name === 'profit' || field.name === 'weight' ? (
          <Grid item xs={4} key={field.id}>
            <FormGenerator
              defaultValue={product[field.name]}
              {...field}
              register={register}
              errors={errors}
              control={control}
              trigger={trigger}
              setValue={setValue}
              watch={watch}
              isEdit
            />
          </Grid>
        ) : (
          <Grid item xs={12} key={field.id}>
            <FormGenerator
              defaultValue={field.name === "productId" ? product.id : product[field.name]}
              {...field}
              register={register}
              errors={errors}
              control={control}
              trigger={trigger}
              setValue={setValue}
              watch={watch}
              isEdit
            />
          </Grid>
        )
      ))}
    </Grid>
  );
};

export default EditForm;