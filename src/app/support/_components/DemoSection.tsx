import React, { useState, useRef, useEffect } from 'react';
import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaExpand, FaYoutube } from 'react-icons/fa';
import { motion, useAnimation } from 'framer-motion';

const DemoSection: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadingControls = useAnimation();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      video.play();
      setIsPlaying(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      loadingControls.start('animate');
    } else {
      loadingControls.stop();
    }
  }, [isLoading, loadingControls]);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;

    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;

    setCurrentTime(videoRef.current.currentTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const carouselItems = [
    { id: 1, image: '/global/images/intro/ai.jpg', alt: 'Platform Image 1' },
    { id: 2, image: '/global/images/intro/ai.jpg', alt: 'Platform Image 2' },
    { id: 3, image: '/global/images/intro/ai.jpg', alt: 'Platform Image 3' },
  ];

  const responsive = {
    superLargeDesktop: {
      breakpoint: { max: 4000, min: 3000 },
      items: 5,
    },
    desktop: {
      breakpoint: { max: 3000, min: 1024 },
      items: 3,
    },
    tablet: {
      breakpoint: { max: 1024, min: 464 },
      items: 2,
    },
    mobile: {
      breakpoint: { max: 464, min: 0 },
      items: 1,
    },
  };

  const loadingVariants = {
    initial: {
      transform: 'scale(1)',
      opacity: 1,
    },
    animate: {
      transform: 'scale(1.2)',
      opacity: 0.5,
      transition: {
        duration: 1,
        repeat: Infinity,
        repeatType: 'reverse',
      },
    },
  };

  return (
    <motion.div
      className="flex flex-col justify-center items-center w-full h-full mx-auto p-4 sm:p-6 md:p-8 lg:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold mb-8 text-center">Watch Full Demo</h1>
      <div className="relative w-full aspect-w-16 aspect-h-9 mb-8 bg-black rounded-lg overflow-hidden shadow-xl">
        {isLoading && (
          <motion.div
            className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-900 bg-opacity-50"
            variants={loadingVariants}
            initial="initial"
            animate="animate"
          >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full animate-ping"></div>
            </div>
          </motion.div>
        )}
        <video
          ref={videoRef}
          src="/global/videos/wapp-marketing.mp4"
          className="w-full h-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={togglePlay}
              className="text-white hover:text-blue-500 transition-colors duration-200"
            >
              {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
            </button>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full mx-4 accent-blue-500"
            />
            <span className="text-white text-sm w-full max-w-24">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button
              onClick={toggleMute}
              className="text-white hover:text-blue-500 transition-colors duration-200 ml-4"
            >
              {isMuted ? <FaVolumeMute size={24} /> : <FaVolumeUp size={24} />}
            </button>
            <button
              onClick={() => videoRef.current?.requestFullscreen()}
              className="text-white hover:text-blue-500 transition-colors duration-200 ml-4"
            >
              <FaExpand size={24} />
            </button>
          </div>
        </div>
      </div>
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Doc2Product Introduction</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Experience the power of Doc2Product, an AI-driven platform to effortlessly transform and generate SEO-optimized content for your Shopify products. Boost efficiency and drive sales!
        </p>
        <a
          href="https://youtu.be/r0aAkMMhOo0?si=utah6SEnMzhsRQRD"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
        >
          <FaYoutube className="mr-2" /> Watch on YouTube
        </a>
      </div>
      {/*<h2 className="text-3xl font-semibold mb-6 text-center">Platform Showcase</h2>
      <div className="w-full mb-12">
        <Carousel
          responsive={responsive}
          infinite={true}
          autoPlay={true}
          autoPlaySpeed={3000}
        >
          {carouselItems.map((item) => (
            <div key={item.id} className="px-2">
              <img
                src={item.image}
                alt={item.alt}
                className="w-full h-64 object-cover rounded-lg shadow-md transition-transform duration-300 hover:scale-105"
              />
            </div>
          ))}
        </Carousel>
      </div>*/}
    </motion.div>
  );
};

export default DemoSection;

