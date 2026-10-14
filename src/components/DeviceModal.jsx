import React, { useState, useEffect } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

// First visit welcome tip (shown once per browser, after the startup screen).
const DeviceModal = ({ isAppReady }) => {
  const [showDevicePopup, setShowDevicePopup] = useState(false);

  useEffect(() => {
    // Keep hidden until the loading screen signals completion
    if (!isAppReady) return undefined;
    const hasVisitedBefore = localStorage.getItem('moviehub_first_time_user');
    if (!hasVisitedBefore) {
      // Delay so landing animations settle first
      const timer = setTimeout(() => setShowDevicePopup(true), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isAppReady]);

  const handleClosePopup = () => {
    setShowDevicePopup(false);
    localStorage.setItem('moviehub_first_time_user', 'returning');
  };

  return (
    <Modal open={showDevicePopup} onClose={handleClosePopup} labelledBy="welcome-title" className="max-w-md text-center">
      <span className="mx-auto mb-5 h-14 w-14 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center text-accent-text">
        <MonitorSmartphone size={26} aria-hidden="true" />
      </span>
      <h2 id="welcome-title" className="text-2xl font-bold">Welcome to <span className="text-accent-text">MovieHub</span></h2>
      <div className="mt-4 space-y-3 text-sm text-muted">
        <p>We are glad you are here. MovieHub is built for a smooth, cinematic experience and works best on recent devices.</p>
        <p>It adapts to <span className="text-white">mobile</span>, <span className="text-white">tablet</span> and <span className="text-white">desktop</span>, so pick up wherever you like.</p>
      </div>
      <Button size="lg" className="w-full mt-7" onClick={handleClosePopup}>Start exploring</Button>
    </Modal>
  );
};

export default DeviceModal;
