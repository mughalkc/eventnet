import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import phoneVideo from '../assets/phone-dark.webm';

export default function AnimatedPhone() {
  const videoRef = useRef(null);

  useEffect(() => {
    // Ensure video plays automatically when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log('Auto-play was prevented:', error);
      });
    }
  }, []);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative w-full h-full flex items-center justify-center"
    >
      <div className="w-full max-w-[450px] relative">
        <video
          ref={videoRef}
          src={phoneVideo}
          className="w-full h-auto object-contain mix-blend-screen"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-1/4 -right-12 w-24 h-24 bg-purple-500/30 rounded-full blur-2xl"></div>
      <div className="absolute bottom-1/4 -left-12 w-32 h-32 bg-pink-500/30 rounded-full blur-2xl"></div>
      <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
    </motion.div>
  );
} 