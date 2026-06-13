import React from 'react';
import { AIChat } from '../components/AIChat';

const AIAssistantPage = () => {
  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col pb-6">
      <h1 className="text-2xl font-bold text-theme-text mb-6">AI Assistant</h1>
      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto">
        <AIChat />
      </div>
    </div>
  );
};

export default AIAssistantPage;
