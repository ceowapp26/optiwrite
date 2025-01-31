"use client"
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { isSessionValid, validateSessionDetails } from '@/utils/utilities';
import { ShopApiService } from '@/utils/api';
import { AppSession } from '@/types/auth';
import { Card, Button, TextField, Banner } from '@shopify/polaris';
import { Sun, Moon } from 'lucide-react';
import { eventEmitter } from '@/helpers/eventEmitter';
import HistoryProductCard from './HistoryProductCard';
import EditProductModal from './EditProductModal';

const HistorySection = memo(({ session }: { session: AppSession }) => {
  if (!session) return null;  
  const { isValid, missingFields } = validateSessionDetails(session);
  if (!isValid) {
    console.warn('Missing required fields:', missingFields);
    return null;
  }
  const { 
    shopName, 
    shopifyOfflineAccessToken: accessToken, 
    shopifyOnlineAccessToken,
    googleAccessToken, 
    shopifyUserId, 
    googleUserId, 
    userIds 
  } = session;
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedProducts = await ShopApiService.getList(accessToken, shopName);
      setProducts(fetchedProducts || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch products');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, shopName]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const unsubscribe = eventEmitter.subscribe('formSubmitted', () => {
      setIsPublishing(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isPublishing) {
      const timer = setTimeout(() => {
        fetchProducts();
        setIsPublishing(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isPublishing, fetchProducts]);

  const filteredProducts = products.filter(product =>
    product?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleOpenEditModal = (product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = async (storageId, productId) => {
    try {
      await ShopApiService.delete(accessToken, shopName,  storageId, productId);
      setProducts(products.filter(product => product.id !== storageId));
    } catch (err) {
      console.error('Failed to delete product:', err);
      setError('Failed to delete product!!')
    }
  };

  const handleUpdateProduct = async (updatedProduct) => {
    try {
      await ShopApiService.update(accessToken, shopName, updatedProduct.id, updatedProduct);
      setProducts(products.map(product => 
        product.id === updatedProduct.id ? updatedProduct : product
      ));
      handleCloseEditModal();
    } catch (err) {
      console.error('Failed to update product:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Banner
        title="Error loading products"
        tone="critical"
        onDismiss={() => setError(null)}
      >
        <p>{error}</p>
      </Banner>
    );
  }

  return (
    <div className={`h-full w-full max-h-[500px] overflow-y-auto ${isDarkMode ? 'dark' : ''}`}>
      <div className="max-w-8xl mx-auto p-6 transition-colors duration-200 ease-in-out dark:bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Publish History</h2>
          <Button onClick={toggleTheme} icon={isDarkMode ? <Sun /> : <Moon />}>
            Toggle Theme
          </Button>
        </div>
        <div className="mb-10">
          <TextField
            label="Search products"
            value={searchTerm}
            onChange={(value) => setSearchTerm(value)}
            placeholder="Search products..."
          />
        </div>
        <Card padding="400" roundedAbove="md" background="bg-surface-secondary">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <div key={product.id} className="pt-6">
                <HistoryProductCard
                  product={product}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteProduct}
                />
              </div>
            ))
          ) : (
            <Banner
              title="No products found"
              tone="info"
              onDismiss={() => {}}
            >
              <p>No products available. Try adjusting your search or add new products.</p>
            </Banner>
          )}
        </Card>
        <EditProductModal
          accessToken={accessToken}
          shopName={shopName} 
          session={session}
          isOpen={isEditModalOpen} 
          onClose={handleCloseEditModal} 
          product={selectedProduct}
          onUpdate={handleUpdateProduct}
        />
      </div>
    </div>
  );
});

HistorySection.displayName = 'HistorySection';

export default HistorySection;

