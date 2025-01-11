import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ArrowLeftIcon, ArrowRightIcon } from '@shopify/polaris-icons';
import { MediaCard, Card, Box, Button, InlineStack, Icon } from '@shopify/polaris';

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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

  const nextImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  if (!images?.length) return null;

  return (
    <Card>
      <div className="relative w-full h-96">
        <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
          {!isLoading && !imageError && (
            <img
              src={images[currentIndex]}
              alt={`Carousel image ${currentIndex + 1}`}
              className="w-full h-full object-contain pointer-events-none"
              loading="lazy"
            />
          )}
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
              Unable to load image
            </div>
          )}
        </div>
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between">
          <Button
            onClick={prevImage}
            variant="primary"
            accessibilityLabel="Previous image"
          >
            <Icon source={ArrowLeftIcon} />
          </Button>
          <Button
            onClick={nextImage}
            variant="primary"
            accessibilityLabel="Next image"
          >
            <Icon source={ArrowRightIcon} />
          </Button>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              type="button"
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>
      <div className="text-center mt-4 text-sm text-gray-500">
        {currentIndex + 1} of {images.length}
      </div>
    </Card>
  );
};

export default ImageCarousel;