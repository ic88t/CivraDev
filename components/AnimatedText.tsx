"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedTextProps {
  texts: string[];
  interval?: number;
  className?: string;
}

export default function AnimatedText({ 
  texts, 
  interval = 3000, 
  className = "" 
}: AnimatedTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }, interval);

    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <div className={`relative inline-block ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ 
            opacity: 0,
            y: 20,
            scale: 0.95
          }}
          animate={{ 
            opacity: 1,
            y: 0,
            scale: 1
          }}
          exit={{ 
            opacity: 0,
            y: -20,
            scale: 0.95
          }}
          transition={{ 
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1]
          }}
           className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-500"
        >
          {texts[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
