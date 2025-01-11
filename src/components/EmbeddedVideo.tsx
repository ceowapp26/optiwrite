import React, { lazy, Suspense, useState } from 'react';
import { MediaCard, VideoThumbnail } from '@shopify/polaris';

const VideoLoader = lazy(() => import('./VideoLoader'));

const EmbeddedVideo = ({ source, title }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleSendEmail = () => {
    const email = process.env.EMAIL_TO || "example@gmail.com";
    const subject = encodeURIComponent("Doc2Product Support and Feedback");
    const body = encodeURIComponent(
      `Hello Doc2Product Support Team,\n\nI’m reaching out to request assistance and share my feedback regarding the Doc2Product app. Here are my thoughts and suggestions:\n\n[Please add your feedback here]. Looking forward to hearing back!\n\nBest regards,\n[Your Name]`
    );
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
    window.open(gmailUrl, "_blank");
  };

  return (
   <MediaCard
     title={title}
     description='Effortlessly turn your Google Docs into SEO-optimized product pages for your Shopify store. Save time, boost visibility, and simplify content creation with AI-powered automation.'
     primaryAction={{
       id: 'watch-more',
       content: 'Watch More',
       onAction: () => handlePlay(),
     }}
     secondaryAction={{
       id: 'feedback',
       content: 'Feedback & Support',
       onAction: () => handleSendEmail(),
     }}
   >
     {isPlaying ? (
       <video
         controls
         autoPlay
         style={{ width: '100%', borderRadius: '8px' }}
       >
         <source src={source} type="video/mp4" />
         Your browser does not support the video tag.
       </video>
     ) : (
       <VideoThumbnail
         videoLength={80}
         thumbnailUrl="https://img.freepik.com/premium-vector/tutorial-website-banner-concept-with-thin-line-flat-design_56103-108.jpg"
         onClick={handlePlay}
       />
     )}
   </MediaCard>
 );
};

export default EmbeddedVideo;