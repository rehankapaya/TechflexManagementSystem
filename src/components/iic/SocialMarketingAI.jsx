import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Megaphone, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { generateMarketingPlan } from '../../services/aiService';
import { formatMarkdown } from '../../utils/formatMarkdown';

const SocialMarketingAI = () => {
  const { iicData, hasApiKey } = useOutletContext();
  const [marketingPlan, setMarketingPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGeneratePlan = async () => {
    if (!hasApiKey || !iicData) return;
    setIsLoading(true);
    setError('');
    
    try {
      const plan = await generateMarketingPlan(iicData.aiContext);
      setMarketingPlan(plan);
    } catch (err) {
      setError(`Failed to generate marketing plan: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Megaphone className="text-purple-500" />
            Social Media Marketing AI
          </h2>
          <p className="text-slate-500 text-sm mt-1">Generate targeted 7-day social media campaigns to boost admissions.</p>
        </div>
        
        <button
          onClick={handleGeneratePlan}
          disabled={isLoading || !hasApiKey}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {marketingPlan ? 'Regenerate Plan' : 'Generate 7-Day Plan'}
        </button>
      </div>

      {!hasApiKey && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center mb-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">API Key Required</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Please enter your Groq API Key in the top right header to activate the Marketing AI generator.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {marketingPlan ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="prose prose-slate max-w-none prose-h3:text-purple-800 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800">
            <span dangerouslySetInnerHTML={formatMarkdown(marketingPlan, false)} className="block leading-relaxed" />
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <Megaphone size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">No Plan Generated Yet</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Click the button above to analyze your current courses and generate a complete A-Z social media strategy for the week.
          </p>
        </div>
      )}
    </div>
  );
};

export default SocialMarketingAI;
