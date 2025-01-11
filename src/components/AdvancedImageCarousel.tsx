import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from '@shopify/polaris-icons';
import {
  Card,
  Button,
  Icon,
  Badge,
  Modal,
  Text,
  Banner,
  Spinner,
  TextContainer
} from '@shopify/polaris';

const AdvancedImageCarousel = ({ images, featuredImageUrl, currentIndex, setCurrentIndex, onCurrentImageChange }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [modalActive, setModalActive] = useState(false);

  const handleModalToggle = useCallback(() => {
    setModalActive(!modalActive);
  }, [modalActive]);

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
    const img = new Image();
    img.src = images[currentIndex];
    img.onload = () => setIsLoading(false);
    img.onerror = () => {
      setIsLoading(false);
      setImageError(true);
    };
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [currentIndex, images]);

  const nextImage = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    onCurrentImageChange?.(currentIndex, images[currentIndex]);
  }, [currentIndex, images, onCurrentImageChange]);

  if (!images?.length) return null;

  const isFeaturedImage = images[currentIndex] === featuredImageUrl;

  const renderFeaturedImageBanner = () => {
    if (!isFeaturedImage) return null;
    
    return (
      <Banner
        title="Featured Product Image"
        status="info"
      >
        <p>This image is set as the main product image and will be displayed as the thumbnail in product listings.</p>
      </Banner>
    );
  };

  const renderModal = () => {
    return (
      <Modal
        size="large"
        open={modalActive}
        onClose={handleModalToggle}
        title={`Product Image ${currentIndex + 1} of ${images.length}`}
      >
        <Modal.Section>
          {renderFeaturedImageBanner()}
          <div className="relative w-full h-full">
            <img
              src={images[currentIndex]}
              alt={`Product image ${currentIndex + 1}`}
              className="w-full h-full object-contain"
            />
          </div>
          <TextContainer>
            <div className="flex justify-between items-center mt-4">
              <Button
                onClick={prevImage}
                icon={ArrowLeftIcon}
              >
                Previous
              </Button>
              <Text variant="bodyMd" as="p">
                {currentIndex + 1} of {images.length}
              </Text>
              <Button
                onClick={nextImage}
                icon={ArrowRightIcon}
              >
                Next
              </Button>
            </div>
          </TextContainer>
        </Modal.Section>
      </Modal>
    );
  };

  return (
    <Card>
      <div className="relative w-full h-96">
        <div 
          className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
          onClick={handleModalToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleModalToggle();
          }}
        >
          {!isLoading && !imageError && (
            <img
              src={images[currentIndex]}
              alt={`Product image ${currentIndex + 1}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          )}
          
          {isFeaturedImage && (
            <div className="absolute top-2 right-2">
              <Badge status="info">Featured Image</Badge>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Spinner size="large" />
            </div>
          )}
          
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Text variant="bodyMd" as="p" color="subdued">
                Unable to load image
              </Text>
            </div>
          )}
        </div>
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none z-10">
          <div className="pointer-events-auto">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              icon={ArrowLeftIcon}
              accessibilityLabel="Previous image"
            />
          </div>
          <div className="pointer-events-auto">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              icon={ArrowRightIcon}
              accessibilityLabel="Next image"
            />
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              type="button"
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="text-center mt-4">
        <Text variant="bodyMd" as="p" color="subdued">
          {currentIndex + 1} of {images.length}
        </Text>
      </div>

      {renderModal()}
    </Card>
  );
};

export default AdvancedImageCarousel;