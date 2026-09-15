import React, { useState, useEffect } from 'react';

export const FullscreenButton: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync state if user exits via Escape key or system shortcuts
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Target the root document element to make the whole page full screen
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
      console.error("Error attempting to toggle fullscreen:", error);
    }
  };

  return (
    <button
      onClick={toggleFullscreen}
      className="fullScreenButton"
    >
      ⛶
    </button>
  );
};
