import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bot, Bell, AlertTriangle, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRegionStore, useSOSStore } from '../store';
import { regions as regionsApi, sos as sosApi } from '../services/api';
import { RiskMeter } from '../components/RiskMeter';
import { DisasterMap } from '../components/Map';
import { SOSButton } from '../components/SOSButton';
import { AIRecommendation } from '../components/AIRecommendation';

const SkeletonCard = () => (
  <div className="bg-theme-card rounded-xl border border-theme-border p-4 animate-pulse">
    <div className="h-6 bg-theme-bg rounded w-1/3 mb-6"></div>
    <div className="flex justify-center">
      <div className="w-32 h-32 bg-theme-bg rounded-full"></div>
    </div>
    <div className="h-4 bg-theme-bg rounded w-1/2 mx-auto mt-6"></div>
  </div>
);

const CitizenApp = () => {
  const { user } = useAuth();
  const { regions, setRegions } = useRegionStore();
  const { alerts, setAlerts } = useSOSStore();
  const [isLoading, setIsLoading] = useState(true);

  // Derive district metrics
  const districtName = user?.district || 'Unknown District';
  const districtRegions = regions.filter(r => r.district?.toLowerCase() === districtName.toLowerCase() || r.name?.toLowerCase() === districtName.toLowerCase());
  const myRegion = districtRegions[0];
  
  // Filter active alerts for the district
  const districtAlerts = alerts.filter(a => a.status !== 'resolved');
  const recentAlerts = [...districtAlerts].sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now())).slice(0, 3);

  useEffect(() => {
    const fetchDistrictData = async () => {
      try {
        setIsLoading(true);
        const [regionsRes, sosRes] = await Promise.allSettled([
          regionsApi.getRegions(),
          sosApi.getSOSAlerts()
        ]);
        
        if (regionsRes.status === 'fulfilled' && regionsRes.value?.data?.data) {
          setRegions(regionsRes.value.data.data);
        } else {
          // Fallback dummy data specifically for demo if API is empty
          setRegions([{
            id: 'mock-1',
            name: districtName,
            district: districtName,
            riskScore: 65,
            riskLevel: 'orange',
            population: 1500000,
            geojson: {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [[[72.8, 19.0], [74.0, 20.0], [75.0, 19.5], [74.0, 18.0], [72.8, 19.0]]] }
            }
          }]);
        }

        if (sosRes.status === 'fulfilled' && sosRes.value?.data?.data) {
          setAlerts(sosRes.value.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch regions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDistrictData();
  }, [setRegions, setAlerts, districtName]);

  const handleHelpClick = (alertId) => {
    alert(`Thank you for volunteering! (Stub for alert ID: ${alertId})`);
  };

  return (
    <div className="space-y-6 pb-24 font-sans relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-theme-text">Citizen Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* District Risk Card */}
        {isLoading ? <SkeletonCard /> : (
          <div className="bg-theme-card rounded-xl border border-theme-border p-4 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-theme-text flex items-center gap-2">
                <ShieldCheck className="text-theme-success" size={20} /> My District Risk
              </h2>
            </div>
            
            {myRegion ? (
              <div className="flex flex-col items-center w-full">
                <RiskMeter 
                  score={myRegion.riskScore || 0} 
                  level={myRegion.riskLevel || 'green'} 
                  label={myRegion.name} 
                  size={160} 
                />
                
                <div className="w-full mt-4 border-t border-theme-border pt-4">
                  <AIRecommendation regionId={myRegion._id} />
                </div>

                <p className="text-xs text-theme-muted mt-4">
                  Last updated: {formatDistanceToNow(new Date(), { addSuffix: true })}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-theme-muted">
                <p>No risk data available for {districtName}</p>
              </div>
            )}
          </div>
        )}

        {/* Active Alerts Card */}
        {isLoading ? <SkeletonCard /> : (
          <div className="bg-theme-card rounded-xl border border-theme-border p-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-theme-text flex items-center gap-2">
                <Bell className="text-theme-warning animate-bounce" size={20} /> Active Alerts
              </h2>
              <span className="px-3 py-1 bg-theme-danger/10 text-theme-danger border border-theme-danger/30 rounded-full text-xs font-bold">
                {districtAlerts.length} Active
              </span>
            </div>
            
            {recentAlerts.length > 0 ? (
              <ul className="space-y-4">
                {recentAlerts.map(alert => (
                  <li key={alert.id} className="flex items-start gap-3 p-3 bg-theme-bg/50 rounded-lg border border-theme-border/50">
                    <AlertTriangle className="text-theme-danger flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-sm text-theme-text font-medium">{alert.type || alert.message || 'Emergency Request'}</p>
                       <p className="text-xs text-theme-muted mt-1">
                         {alert.location?.coordinates 
                           ? `Coordinates: ${alert.location.coordinates[1].toFixed(4)}, ${alert.location.coordinates[0].toFixed(4)}`
                           : (typeof alert.location === 'string' ? alert.location : 'Unknown Location')}
                       </p>
                       <p className="text-[10px] text-theme-muted mt-1 uppercase tracking-wider">
                        {alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true }) : 'Just now'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-theme-muted">
                <ShieldCheck size={32} className="text-theme-success/50 mb-2" />
                <p className="text-sm">No active alerts in your district</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Section */}
      <div className="bg-theme-card rounded-xl border border-theme-border p-4 shadow-xl">
        <h2 className="text-lg font-semibold text-theme-text mb-4 px-2">Live District Map</h2>
        <div className="h-[350px] w-full rounded-lg overflow-hidden border border-theme-border">
          <DisasterMap 
            regions={districtRegions} 
            sosAlerts={districtAlerts} 
            zoom={myRegion ? 11 : 5}
            center={myRegion?.centroid?.coordinates ? [myRegion.centroid.coordinates[1], myRegion.centroid.coordinates[0]] : undefined}
          />
        </div>
      </div>

      {/* Community Help Section */}
      <div className="bg-theme-card rounded-xl border border-theme-border p-4 shadow-xl">
        <h2 className="text-lg font-semibold text-theme-text mb-6 flex items-center gap-2">
          <HeartHandshake className="text-theme-primary" size={20} /> Community Help
        </h2>
        {districtAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {districtAlerts.map(alert => (
              <div key={alert.id || alert._id} className="p-4 bg-theme-bg/85 rounded-lg border border-theme-border flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-theme-text">{alert.message || 'Assistance required'}</h3>
                  <p className="text-xs text-theme-muted mt-1">
                    {alert.location?.coordinates 
                      ? `Coordinates: ${alert.location.coordinates[1].toFixed(4)}, ${alert.location.coordinates[0].toFixed(4)}`
                      : (typeof alert.location === 'string' ? alert.location : 'Location tracking active')}
                  </p>
                </div>
                <button 
                  onClick={() => handleHelpClick(alert.id || alert._id)}
                  className="px-4 py-2 bg-theme-card hover:bg-theme-bg text-theme-primary text-sm font-medium rounded-lg transition-colors border border-theme-border cursor-pointer"
                >
                  I can help
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-theme-muted text-center py-8 bg-theme-bg/50 rounded-lg border border-theme-border/50">
            No community requests at the moment. Stay safe!
          </p>
        )}
      </div>

      {/* Fixed Bottom Action Bar */}
      {/* 
        Uses left-0 or left-60 based on responsive layout. 
        Since the sidebar takes 60 width on desktop, padding-left helps perfectly align it.
      */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-60 bg-theme-card/95 backdrop-blur-md border-t border-theme-border p-4 flex justify-between items-center z-[1001] px-6">
        <SOSButton />
        <Link 
          to="/citizen/ai" 
          className="flex items-center gap-2 px-5 py-2.5 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary border border-theme-primary/30 rounded-full font-medium transition-colors"
        >
          <Bot size={18} />
          <span className="hidden sm:inline">Ask AI Assistant</span>
          <span className="sm:hidden">AI</span>
        </Link>
      </div>
    </div>
  );
};

export default CitizenApp;
