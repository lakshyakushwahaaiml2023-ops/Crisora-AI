import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Siren, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { sos } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const districtCentroids = {
  'Bhopal': { lat: 23.2599, lng: 77.4126 },
  'Indore': { lat: 22.7196, lng: 75.8577 },
  'Mumbai Suburban': { lat: 19.0760, lng: 72.8777 },
  'Nagapattinam': { lat: 10.7656, lng: 79.8433 },
  'Rudraprayag': { lat: 30.2844, lng: 78.9818 },
  'default': { lat: 23.2599, lng: 77.4126 }
};

const SOSButton = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState('Medical Emergency');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [pendingSOS, setPendingSOS] = useState([]);

  // Load pending SOS and handle offline retry queue
  useEffect(() => {
    const loadPending = () => {
      const stored = localStorage.getItem('pending_sos');
      if (stored) {
        setPendingSOS(JSON.parse(stored));
      }
    };
    loadPending();

    const intervalId = setInterval(async () => {
      const stored = localStorage.getItem('pending_sos');
      if (!stored) return;
      const queue = JSON.parse(stored);
      if (queue.length === 0) return;

      try {
        await sos.createSOS(queue[0]);
        const newQueue = queue.slice(1);
        localStorage.setItem('pending_sos', JSON.stringify(newQueue));
        setPendingSOS(newQueue);
        toast.success("Offline SOS successfully transmitted!");
      } catch (error) {
        // Still offline or failed, do nothing and wait for next interval
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timerId = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [cooldown]);

  const handlePress = () => {
    if (cooldown > 0) return;
    
    // Vibrate device if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    
    setIsModalOpen(true);
  };

  const submitSOS = async () => {
    setIsLoading(true);

    const getFallbackLoc = () => {
      if (!user?.district) return districtCentroids.default;
      const match = Object.keys(districtCentroids).find(
        k => k.toLowerCase() === user.district.toLowerCase()
      );
      return match ? districtCentroids[match] : districtCentroids.default;
    };
    const fallbackLoc = getFallbackLoc();
    
    const sendPayload = async (lat, lng) => {
      const payload = { type, message, lat, lng, timestamp: new Date().toISOString() };
      try {
        await sos.createSOS(payload);
        toast.success("Help is on the way!", { 
          style: { background: '#FFFFFF', color: '#2E7D32', border: '1px solid #2E7D32' } 
        });
      } catch (error) {
        const currentQueue = JSON.parse(localStorage.getItem('pending_sos') || '[]');
        currentQueue.push(payload);
        localStorage.setItem('pending_sos', JSON.stringify(currentQueue));
        setPendingSOS(currentQueue);
        toast.error("Network error. SOS saved offline and will auto-retry.", { duration: 4000 });
      } finally {
        setIsLoading(false);
        setIsModalOpen(false);
        setCooldown(60);
        setType('Medical Emergency');
        setMessage('');
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendPayload(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn("Geolocation failed, using district fallback", error);
          sendPayload(fallbackLoc.lat, fallbackLoc.lng);
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      sendPayload(fallbackLoc.lat, fallbackLoc.lng);
    }
  };

  return (
    <>
      <div className="relative">
        {/* Main Trigger Button */}
        <button 
          onClick={handlePress}
          disabled={cooldown > 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-lg font-bold transition-all ${
            cooldown > 0 
              ? 'bg-theme-border text-theme-muted cursor-not-allowed shadow-none' 
              : 'bg-theme-danger hover:bg-theme-danger/90 text-white shadow-theme-danger/30 active:scale-95'
          }`}
        >
          <Siren size={20} className={cooldown === 0 ? "animate-pulse" : ""} />
          <span>{cooldown > 0 ? `COOLDOWN (${cooldown}s)` : 'EMERGENCY SOS'}</span>
        </button>

        {/* Offline Banner */}
        {pendingSOS.length > 0 && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-max max-w-[200px] bg-theme-warning/15 border border-theme-warning/40 text-theme-warning px-3 py-2 rounded-lg shadow-xl flex items-center gap-2 text-xs font-bold animate-pulse z-50 backdrop-blur-sm">
            <AlertTriangle size={16} />
            {pendingSOS.length} Offline SOS Pending
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && createPortal(
        <div className="absolute inset-0 z-[9999] min-h-[100vh] bg-theme-bg/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-left font-sans">
          <div className="bg-theme-card rounded-2xl border border-theme-border shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-theme-danger mb-2 flex items-center gap-2">
              <AlertTriangle /> Are you in danger?
            </h2>
            <p className="text-theme-muted text-sm mb-6">
              This will broadcast your exact location to authorities and nearby community volunteers. Misuse may result in penalties.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">Emergency Type</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-theme-text focus:outline-none focus:border-theme-danger"
                >
                  <option>Medical Emergency</option>
                  <option>Flood</option>
                  <option>Fire</option>
                  <option>Trapped</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">Details (Optional)</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Need immediate assistance..."
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-theme-text placeholder:text-theme-muted focus:outline-none focus:border-theme-danger min-h-[100px] resize-y"
                ></textarea>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-theme-bg hover:bg-theme-border text-theme-text rounded-xl font-medium transition-colors border border-theme-border"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                onClick={submitSOS}
                disabled={isLoading}
                className="flex-1 py-3 bg-theme-danger hover:bg-theme-danger/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-theme-danger/30 flex justify-center items-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Confirm SOS'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SOSButton;
