"use client";

import { useState, useEffect } from "react";

interface TypewriterPlaceholderProps {
  baseText: string;
  products: string[];
  interval?: number;
}

export default function TypewriterPlaceholder({ 
  baseText, 
  products, 
  interval = 2000 
}: TypewriterPlaceholderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentProductText, setCurrentProductText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const currentProduct = products[currentIndex];
    
    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing effect - only the product part
        if (charIndex < currentProduct.length) {
          setCurrentProductText(currentProduct.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          // Start deleting after a pause
          setTimeout(() => setIsDeleting(true), 1500);
        }
      } else {
        // Deleting effect - only the product part
        if (charIndex > 0) {
          setCurrentProductText(currentProduct.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          // Move to next product
          setIsDeleting(false);
          setCurrentIndex((prevIndex) => (prevIndex + 1) % products.length);
        }
      }
    }, isDeleting ? 50 : 80); // Faster deleting, slower typing

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, currentIndex, products]);

  return `${baseText} ${currentProductText}`;
}
