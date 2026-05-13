import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DeviceModal = () => {
  const [showDevicePopup, setShowDevicePopup] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if the user has visited MovieHub before
    const hasVisitedBefore = localStorage.getItem('moviehub_first_time_user');

    // If there is no record, they are a first-ever visitor or signing up for the first time
    if (!hasVisitedBefore) {
      // Smooth 1-second delay to let the initial landing animations settle
      const timer = setTimeout(() => {
        setShowDevicePopup(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClosePopup = () => {
    setShowDevicePopup(false);
    // Set item so this modal will never trigger again for this browser session/user history
    localStorage.setItem('moviehub_first_time_user', 'returning');
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  // Fixed variant definitions: Flexbox handles layout alignment, Framer Motion handles standard scale/opacity transitions.
  const modalVariants = {
    hidden: {
      scale: 0.85,
      opacity: 0,
    },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 350,
        damping: 26,
      },
    },
    exit: {
      scale: 0.85,
      opacity: 0,
      transition: {
        ease: 'easeInOut',
        duration: 0.2,
      },
    },
  };

  if (!showDevicePopup) return null;

  return (
    <AnimatePresence>
      {showDevicePopup && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={handleClosePopup} // Close when clicking backdrop
        >
          {/* Animated Glassmorphic Card */}
          <motion.div
            className="relative max-w-md w-full bg-[#121212]/90 backdrop-blur-lg border border-red-900/50 rounded-3xl p-8 text-center shadow-2xl shadow-red-950/30 overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            {/* Red accent glow */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Minimalist Graphic Icon Frame */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-950/30 border border-red-800/50 mb-6 shadow-inner shadow-red-950/50">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM3 12h1m8-9v1m8 8h1M4.93 4.93l.7.7m12.72 12.72l.7.7M19.07 4.93l-.7.7M4.93 19.07l.7-.7"
                />
              </svg>
            </div>

            {/* Welcome Header */}
            <h3 className="text-xl font-bold text-white tracking-wider uppercase mb-2">
              Welcome to <span className="text-red-500">MovieHub</span>
            </h3>
            <p className="text-xs text-neutral-500 uppercase tracking-widest mb-6">
              Experience Optimization
            </p>

            {/* Modal Body Text */}
            <div className="text-base text-neutral-300 leading-relaxed mb-8 space-y-4">
              <p>
                We're thrilled to have you here! To ensure you enjoy the absolute best cinematic journey, <span className="text-white font-medium">MovieHub</span> is meticulously designed for high-performance devices.
              </p>
              <p>
                Our platform provides a seamless, best-in-class responsive experience, dynamically optimizing for <span className="text-white font-medium">Mobile</span>, <span className="text-white font-medium">Tablet</span>, and <span className="text-white font-medium">Desktop</span> environments.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleClosePopup}
              className="w-full py-3.5 px-6 rounded-xl bg-red-600 text-white font-bold text-sm tracking-widest uppercase hover:bg-red-700 active:bg-red-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#121212] shadow-lg shadow-red-950/50"
            >
              Start Exploring
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeviceModal;