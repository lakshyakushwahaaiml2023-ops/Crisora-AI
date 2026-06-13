import React, { useEffect, useState } from 'react';
import { Bot, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ai } from '../../services/api';

const AIRecommendation = ({ regionId }) => {
  const [recommendation, setRecommendation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdvice = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ai.getRecommendation(regionId);
      if (res.data?.success && res.data?.data) {
        setRecommendation(res.data.data);
      } else {
        setRecommendation('No recommendations available.');
      }
    } catch (err) {
      console.error('Failed to fetch AI recommendation:', err);
      setError('Could not connect to AI advisor. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvice();
  }, [regionId]);

  const isNoThreat = recommendation?.toLowerCase().includes('no immediate threat');

  return (
    <div className={`bg-theme-card rounded-xl border p-4 shadow-lg transition-all ${
      isLoading 
        ? 'border-theme-border' 
        : isNoThreat 
          ? 'border-theme-success/30 bg-theme-success/5' 
          : 'border-theme-warning/30 bg-theme-warning/5'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-theme-text uppercase tracking-wider flex items-center gap-2">
          <Bot size={18} className="text-theme-primary animate-pulse" /> AI Command Advisor
        </h3>
        <button 
          onClick={fetchAdvice} 
          disabled={isLoading}
          className="text-theme-muted hover:text-theme-primary transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh recommendation"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-theme-bg rounded w-full"></div>
          <div className="h-3 bg-theme-bg rounded w-5/6"></div>
        </div>
      ) : error ? (
        <p className="text-xs text-theme-danger">{error}</p>
      ) : (
        <div className="text-xs leading-relaxed text-theme-text whitespace-pre-wrap">
          {isNoThreat ? (
            <div className="flex items-start gap-2">
              <ShieldCheck className="text-theme-success mt-0.5 flex-shrink-0" size={16} />
              <div>
                <span className="font-bold text-theme-success">Status: </span>
                {recommendation}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-theme-warning mt-0.5 flex-shrink-0" size={16} />
              <div>
                <span className="font-bold text-theme-warning">Course of Action: </span>
                {recommendation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIRecommendation;
