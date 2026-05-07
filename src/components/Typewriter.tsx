import React, { useState, useEffect } from "react";

export default function Typewriter({ 
  text, 
  delay = 50, 
  className, 
  style 
}: { 
  text: string, 
  delay?: number, 
  className?: string, 
  style?: React.CSSProperties 
}) {
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, text]);

  // Add a blinking cursor effect
  return (
    <span className={className} style={style}>
      {currentText}
      <span className="animate-pulse border-r-2 border-[#FFD700] ml-[2px]"></span>
    </span>
  );
}
