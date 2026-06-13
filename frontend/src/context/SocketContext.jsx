import React, { createContext, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';
import socket from '../services/socket';
import { useAuth } from './AuthContext';
import { useRegionStore, useSOSStore, useEventStore } from '../store';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  const updateRegionRisk = useRegionStore((state) => state.updateRegionRisk);
  const addAlert = useSOSStore((state) => state.addAlert);
  const addEvent = useEventStore((state) => state.addEvent);

  useEffect(() => {
    // Only connect logic if user is authenticated
    if (!isAuthenticated || !user) return;

    // Join the specific district room for localized alerts
    if (user.district) {
      socket.emit('join_district', user.district);
    }

    // Socket Event Handlers
    const handleRiskUpdate = (data) => {
      if (data.regionId) {
        updateRegionRisk(data.regionId, data.riskScore, data.riskLevel);
      }
    };

    const handleSOSAlert = (data) => {
      addAlert(data);
      toast(`🚨 SOS Alert: ${data.type || 'Emergency'} at ${data.location || 'Unknown Location'}`, {
        duration: 5000,
        style: { border: '1px solid #C62828', background: '#FFFFFF', color: '#C62828' }
      });
    };

    const handleDisasterEvent = (data) => {
      addEvent(data);
      toast.error(`⚠️ CRITICAL EVENT: ${data.name} (Severity: ${data.severity})`, {
        duration: 10000,
        style: { border: '2px solid #C62828', background: '#FFFFFF', color: '#C62828', fontWeight: 'bold' }
      });
    };

    const handleAlertBroadcast = (data) => {
      toast.success(`📢 Broadcast: ${data.message}`, {
        duration: 6000,
        style: { border: '1px solid #F9A825', background: '#FFFFFF', color: '#1E293B' }
      });
    };

    // Attach listeners
    socket.on('risk_update', handleRiskUpdate);
    socket.on('sos_alert', handleSOSAlert);
    socket.on('disaster_event', handleDisasterEvent);
    socket.on('alert_broadcast', handleAlertBroadcast);

    // Cleanup listeners on unmount or dependency change
    return () => {
      socket.off('risk_update', handleRiskUpdate);
      socket.off('sos_alert', handleSOSAlert);
      socket.off('disaster_event', handleDisasterEvent);
      socket.off('alert_broadcast', handleAlertBroadcast);
    };
  }, [user, isAuthenticated, updateRegionRisk, addAlert, addEvent]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
