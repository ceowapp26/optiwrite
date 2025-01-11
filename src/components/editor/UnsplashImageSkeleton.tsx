import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import NextImage from 'next/image';
import { Card, CardHeader, CardMedia, CardContent, CardActions, Collapse, IconButton, Avatar, Typography, Box, ImageList as MuiImageList, ImageListItem as MuiImageListItem, ImageListItemBar, List, ListItem, ListItemAvatar, ListItemText, Divider, Stack, Link, Popover, Fade, Zoom } from '@mui/material';
import { Person, Instagram, CollectionsOutlined, PhotoLibrary, Favorite, Share, ExpandMore as ExpandMoreIcon, Info } from '@mui/icons-material';
import { X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { RootState } from '@/stores/store';
import { setImageCache, selectImageCache } from '@/stores/features/imageSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/useLocalStore';
import { unsplash } from "@/hooks/useUnsplashCoverImage";
import ScrollToBottom from 'react-scroll-to-bottom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from "react-intersection-observer";
import { ScrollToBottomButton } from '@/components/ScrollToBottomButton';
import { GradientLoadingCircle } from "@/components/GradientLoadingCircle";
import { styled } from '@mui/material/styles';
import { processJsonData } from '@/utils/data';
import debounce from 'lodash/debounce';

interface ImageCache {
  images: any[];
  timestamp: number;
  preloaded: boolean;
}

const CACHE_DURATION = 2 * 60 * 60 * 1000;

const ExpandMore = styled((props: { expand: boolean; onClick: () => void; }) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

interface UnSplashImageSkeletonProps {
  handleClose?: () => void;
  handleUpdate: (url: string) => Promise<void>;
  isTop?: boolean;
}

const preloadImages = async (images: any[]) => {
  const preloadPromises = images.map(image => {
    return new Promise((resolve, reject) => {
      if (!image?.urls?.small || !image?.urls?.regular) {
        resolve(null);
        return;
      }
      const smallImg = new Image();
      const regularImg = new Image();
      const handleLoad = () => {
        if (smallImg.complete && regularImg.complete) {
          resolve(null);
        }
      };
      const handleError = (err: any) => {
        console.warn('Image preload error:', err);
        resolve(null);
      };
      smallImg.onload = handleLoad;
      smallImg.onerror = handleError;
      regularImg.onload = handleLoad;
      regularImg.onerror = handleError;
      smallImg.src = `${image.urls.small}?w=248&fit=crop&auto=format`;
      regularImg.src = image.urls.regular;
    });
  });
  await Promise.all(preloadPromises);
};

export const UnsplashImageSkeleton = memo(({ 
  handleClose, 
  handleUpdate, 
  isTop = false 
}: UnSplashImageSkeletonProps) => {
  const dispatch = useAppDispatch();
  const imageCache = useAppSelector(selectImageCache);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadCount, setLoadCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  
  const { ref, inView } = useInView({
    threshold: 0.5,
  });

  const isCacheValid = useCallback(() => {
    return imageCache && imageCache?.images?.length > 0 && (Date.now() - imageCache.timestamp) < CACHE_DURATION;
  }, [imageCache]);

  const debouncedFetch = useCallback(
    debounce(async (query: string, currentPage: number) => {
      try {
        setLoading(true);
        const result = await unsplash.search.getPhotos({ 
          query, 
          page: currentPage, 
          perPage: 15 
        });
        if (result.type === 'success') {
          setImages(prev => [...prev, ...result.response.results]);
          await preloadImages(result.response.results);
        }
      } catch (err) {
        console.error('Search error:', err);
        toast.error('Error searching images');
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setPage(1);
    setLoadCount(0);
    setImages([]);
  };

  const handleImageClick = useCallback(async (item: any) => {
    try {
      if (!item?.urls?.regular) {
        toast.error('Invalid image URL');
        return;
      }
      setLoading(true);
      await handleUpdate(item.urls.regular);
      
      try {
        await unsplash.photos.trackDownload({
          downloadLocation: item.links.download_location
        });
      } catch (trackError) {
        console.error('Failed to track download:', trackError);
      }

      if (handleClose) {
        handleClose();
      }
    } catch (err) {
      console.error('Image update error:', err);
      toast.error('Failed to insert image');
    } finally {
      setLoading(false);
    }
  }, [handleUpdate, handleClose]);

  const handleInfoClick = useCallback((event: React.MouseEvent<HTMLElement>, item: any) => {
    event.stopPropagation();
    setCurrentItem(item);
    setAnchorEl(event.currentTarget);
  }, []);

  const handleExpandClick = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!searchQuery) {
        if (isCacheValid()) {
          setImages(imageCache.images);
          setLoading(false);
          return;
        }
        const result = await unsplash.photos.getRandom({ count: 15 });
        if (result.type === 'success') {
          setImages(prev => [...prev, ...result.response]);
          await preloadImages(result.response);
          dispatch(setImageCache({
            images: [...imageCache.images, ...result.response],
            timestamp: Date.now(),
            preloaded: true
          }));
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load images. Please try again.');
      toast.error('Error loading images');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, images, isCacheValid, dispatch, imageCache]);

  useEffect(() => {
    if (page > 1) {
      fetchImages();
    }
  }, [page]);

  const loadMore = () => {
    setPage(prev => prev + 1);
    setLoadCount(prev => prev + 1);
  };

  useEffect(() => {
    if (searchQuery) {
      debouncedFetch(searchQuery, page);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    if (!loading && loadCount < 2 && inView) {
      loadMore();
    } 
  }, [inView, loading, loadCount]);

  const ImageListItem = memo(({ item, index, onImageClick, onInfoClick }: {
    item: any;
    index: number;
    onImageClick: (item: any) => void;
    onInfoClick: (event: React.MouseEvent<HTMLElement>, item: any) => void;
  }) => {
    if (!item) return null;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
      >
        <MuiImageListItem
          sx={{ 
            cursor: 'pointer', 
            overflow: 'hidden', 
            borderRadius: 1,
            '& .MuiImageListItem-img': {
              transition: 'transform 0.3s ease-in-out',
              '&:hover': {
                transform: 'scale(1.1)'
              }
            }
          }}
        >
          <div onClick={() => onImageClick(item)} style={{ width: '100%', height: '100%' }}>
            <NextImage
              src={`${item.urls?.small}?w=248&fit=crop&auto=format`} 
              alt={item.alt_description ?? 'Unsplash Image'} 
              width={248}
              height={150}
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              loading="eager"
              priority={index < 6}
            />
          </div>
          <ImageListItemBar
            title={item.alt_description ?? 'No description'}
            subtitle={
              <Link
                href={`https://unsplash.com/@${item.user?.username}?utm_source=your_app_name&utm_medium=referral`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                {item.user?.name ?? 'Unknown User'}
              </Link>
            }
            actionIcon={
              isTop && (
                <IconButton
                  onClick={(e) => onInfoClick(e, item)}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <Info />
                </IconButton>
              )
            }
          />
        </MuiImageListItem>
      </motion.div>
    );
  });

  const renderImageList = useMemo(() => (
    <ScrollToBottom className="h-full dark:bg-gray-800" followButtonClassName="hidden">
      <ScrollToBottomButton variant="image" />
      <MuiImageList sx={{ width: 400, height: 300, p: 1 }} cols={3} rowHeight={160}>
        <AnimatePresence>
          {images.map((item, index) => (
            <ImageListItem 
              key={item.id}
              item={item} 
              index={index}
              onImageClick={handleImageClick}
              onInfoClick={handleInfoClick}
            />
          ))}
        </AnimatePresence>
      </MuiImageList>
      <div ref={ref}> 
        <Box sx={{ position: 'relative', display: 'flex', top: '0px', justifyContent: 'center', width: '100%' }}>
          {loading ? (
            <GradientLoadingCircle size={60} thickness={4} />
          ) : (
            <Link sx={{ cursor: 'pointer', p: '15px' }} onClick={loadMore}>
              Load more
            </Link>
          )}
        </Box>
      </div>
    </ScrollToBottom>
  ), [images, loading, ref, handleImageClick, handleInfoClick]);

  const renderPopoverCard = useMemo(() => {
    if (!currentItem) return null;
    return (
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ 
          sx: { 
            borderRadius: 2,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          } 
        }}
        TransitionComponent={Fade}
        transitionDuration={300}
        onClick={(e) => e.stopPropagation()}
      >
        <Card sx={{ width: 300 }}>
          <CardHeader
            avatar={
              <Link
                href={`https://unsplash.com/@${currentItem.user?.username}?utm_source=your_app_name&utm_medium=referral`}
                target="_blank"
                onClick={(e) => e.stopPropagation()} 
                rel="noopener noreferrer"
              >
                <Avatar 
                  src={currentItem.user?.profile_image?.small} 
                  alt={currentItem.user?.name || 'User'}
                />
              </Link>
            }
            title={currentItem.alt_description || 'No description available'}
            subheader={new Date(currentItem.created_at).toLocaleDateString()}
          />
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              overflow: 'hidden',
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
              },
            }}
            onClick={() => handleImageClick(currentItem)}
          >
            <CardMedia
              component="img"
              height="200"
              image={currentItem.urls?.regular}
              alt={currentItem.alt_description}
              className="hover:scale-105 transition-transform"
            />
          </Box>
          <CardContent>
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><Person /></Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary="User Info" 
                  secondary={`${currentItem.user?.first_name || ''} ${currentItem.user?.last_name || ''}`} 
                  onClick={(e) => e.stopPropagation()}
                />
              </ListItem>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><CollectionsOutlined /></Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary="Collections" 
                  secondary={currentItem.user?.total_collections} 
                />
              </ListItem>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><Instagram /></Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Instagram"
                  secondary={
                    currentItem.user?.instagram_username ? (
                      <Link
                        href={`https://instagram.com/${currentItem.user.instagram_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        @{currentItem.user.instagram_username}
                      </Link>
                    ) : "N/A"
                  }
                />
              </ListItem>
            </List>
          </CardContent>
          <CardActions disableSpacing>
            <IconButton 
              className="hover:text-red-500"
              onClick={(e) => e.stopPropagation()} 
            >
              <Favorite />
            </IconButton>
            <IconButton 
              className="hover:text-blue-500"
              onClick={(e) => e.stopPropagation()}
            >
              <Share />
            </IconButton>
            <ExpandMore
              expand={expanded}
              onClick={(e) => {
                e.stopPropagation();
                handleExpandClick();
              }}
              aria-expanded={expanded}
              aria-label="show more"
            >
              <ExpandMoreIcon />
            </ExpandMore>
          </CardActions>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <CardContent>
              <Typography variant="h6">Location:</Typography>
              <Typography>{currentItem.user?.location || "N/A"}</Typography>
            </CardContent>
          </Collapse>
        </Card>
      </Popover>
    );
  }, [currentItem, anchorEl, expanded, handleImageClick, handleExpandClick]);

  return (
    <Card 
      className={isTop ? "absolute z-[99999] right-[150px] top-48" : ""} 
      sx={{ 
        width: { xs: '100%', sm: 400 }, 
        height: 'auto',
        minHeight: 450,
        borderRadius: 2,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            Choose from Unsplash
          </Typography>
          {handleClose && (
            <IconButton 
              onClick={handleClose}
              className="hover:bg-gray-200"
            >
              <X size={20} className="opacity-80" />
            </IconButton>
          )}
        </Stack>
      </Box>
      <Divider />
       <Box>
        <Stack direction="column" alignItems="center">
          <form className="relative top-4">
            <label className="relative block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                <Search className="h-5 w-5 fill-slate-300" />
              </span>
              <input
                onChange={(e) => {
                  handleSearch(e);
                }}
                className="placeholder:italic placeholder:text-slate-400 h-8 w-[350px] py-2 pl-9 pr-3 bg-slate-200 focus:bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:border-sky-500 focus:ring-sky-500 focus:ring-1 sm:text-sm"
                placeholder="Search for a picture..."
                type="text"
                name="search"
              />
            </label>
          </form>
          <Zoom in={true} style={{ transitionDelay: '300ms' }}>
            <Box sx={{ position: 'relative', top: 30, width: 350, height: 300 }} cols={3} rowHeight={150}>
              {error ? (
                <Typography color="error" sx={{ p: 2 }}>{error}</Typography>
              ) : (
                renderImageList
              )}
            </Box>
          </Zoom>
        </Stack>
      </Box>
      {renderPopoverCard}
    </Card>
  );
});