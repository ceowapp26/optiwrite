"use client";
import React from 'react';
import {
  Modal,
  Grid,
  Card,
  Text,
  Box,
  Spinner,
  Button,
  ButtonGroup,
  InlineStack,
  BlockStack,
  Frame,
} from '@shopify/polaris';
import { PRODUCT } from '@/types/product';
import { useShopifySubmit } from '@/hooks/useShopifySubmit';
import { ShopApiService } from '@/utils/api';
import FormProvider from '@/components/forms/product/FormProvider';
import ImageCarousel from '@/components/ImageCarousel';
import EditForm from '@/components/forms/product/EditForm';
import ButtonHandler from '@/components/forms/product/ButtonHandler';

interface EditProductModalProps {
  shopName: string;
  accessToken: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  product: PRODUCT | null;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  shopName,
  accessToken,
  isOpen, 
  onClose,
  onUpdate, 
  product 
}) => {
  if (!shopName || !accessToken) return null;
  const { loading } = useShopifySubmit({ shopName, accessToken });
  const onCancel = async () => {
    try {
      await ShopApiService.cancelOperation();
      onClose();
    } catch (error) {
      console.error('Error canceling operation:', error);
    }
  };
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={product?.title || 'Edit Product'}
    >
      <Modal.Section>
        <FormProvider
          shopName={shopName}
          accessToken={accessToken}
        >
          <Box padding="400">
            {loading ? (
              <Box padding="400" alignItems="center">
                <InlineStack gap="400" align="center">
                  <Spinner size="large" />
                  <Text as="p">Updating product...</Text>
                </InlineStack>
              </Box>
            ) : (
              <React.Fragment>
                {product && <ProductInfo product={product} />}
                <Box paddingBlock="500">
                  <InlineStack align="space-between">
                    <div className="min-w-56">
                      <ButtonHandler 
                        text="UPDATE" 
                        onClickOrType="submit" 
                        submitType="UPDATE" 
                        isDisabled={loading} 
                        fullWidth
                      />
                    </div>
                    <div className="min-w-56">
                      <ButtonHandler 
                        isDisabled={loading} 
                        onClickOrType={() => { 
                          onCancel();
                          onClose();
                        }}
                        text="CANCEL"
                        fullWidth 
                      />
                    </div>
                  </InlineStack>
                </Box>
              </React.Fragment>
            )}
          </Box>
        </FormProvider>
      </Modal.Section>
    </Modal>
  );
};

const ProductInfo: React.FC<ProductInfoProps> = React.memo(({ product }) => {
  return (
    <Card padding="200">
      <Box padding="400">
        <BlockStack>
          <Box paddingBlockEnd="400">
            <Text variant="headingMd" as="h6">
              Media
            </Text>
          </Box>
          {product.images && product.images.length > 0 ? (
            <ImageCarousel images={product.images} />
          ) : (
            <Box
              background="bg-surface"
              borderRadius="2"
              padding="4"
              shadow="border"
            >
              <img
                src="/api/placeholder/300/400"
                alt="Product"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '8px'
                }}
              />
            </Box>
          )}
          <EditForm product={product} isEdit />
        </BlockStack>
      </Box>
    </Card>
  );
});

ProductInfo.displayName = 'ProductInfo';

export default EditProductModal;