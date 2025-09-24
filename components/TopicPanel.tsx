
import React from 'react';
import Dropdown from './Dropdown';
import Spinner from './Spinner';
import LightbulbIcon from './icons/LightbulbIcon';
import AudienceIcon from './icons/AudienceIcon';
import AngleIcon from './icons/AngleIcon';
import HookIcon from './icons/HookIcon';
import { TopicPreferences } from '../types';
import { AUDIENCE_OPTIONS, CONTENT_ANGLE_OPTIONS, HOOK_STYLE_OPTIONS, NUM_IDEAS_OPTIONS } from '../constants';

interface TopicPanelProps {
  preferences: TopicPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<TopicPreferences>>;
  onGenerate: () => void;
  isLoading: boolean;
  generationsLeft: number;
  generationLimit: number;
}

const TopicPanel: React.FC<TopicPanelProps> = ({ preferences, setPreferences, onGenerate, isLoading, generationsLeft, generationLimit }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const hasReachedLimit = generationsLeft <= 0;

  return (
    <div className="bg-surface-light dark:bg-surface-dark/50 p-6 rounded-xl border border-border-light dark:border-border-dark flex flex-col gap-6 h-full">
      <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Generate Topic Ideas</h2>
      
      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
          What is your Industry or Niche?
        </label>
        <input
          id="industry"
          name="industry"
          type="text"
          value={preferences.industry}
          onChange={handleInputChange}
          placeholder="e.g., SaaS, Home Gardening, Fitness"
          className="w-full bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md p-3 text-text-primary-light dark:text-text-primary-dark placeholder-text-secondary-light dark:placeholder-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent sm:text-sm transition"
          aria-label="Industry or Niche"
        />
      </div>

      <Dropdown
        label="Target Audience"
        icon={<AudienceIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />}
        value={preferences.audience}
        onChange={(e) => setPreferences(prev => ({ ...prev, audience: e.target.value }))}
        options={AUDIENCE_OPTIONS}
      />

      <Dropdown
        label="Content Angle"
        icon={<AngleIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />}
        value={preferences.angle}
        onChange={(e) => setPreferences(prev => ({ ...prev, angle: e.target.value }))}
        options={CONTENT_ANGLE_OPTIONS}
      />

      <Dropdown
        label="Engagement Hook"
        icon={<HookIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />}
        value={preferences.hook}
        onChange={(e) => setPreferences(prev => ({ ...prev, hook: e.target.value }))}
        options={HOOK_STYLE_OPTIONS}
      />

      <Dropdown
        label="Number of Ideas"
        icon={<LightbulbIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />}
        value={preferences.numIdeas}
        onChange={(e) => setPreferences(prev => ({ ...prev, numIdeas: e.target.value }))}
        options={NUM_IDEAS_OPTIONS}
      />
      
      <div className="mt-auto pt-4">
        <button
          onClick={onGenerate}
          disabled={isLoading || !preferences.industry.trim() || hasReachedLimit}
          className="w-full flex items-center justify-center bg-primary-light dark:bg-primary-dark hover:brightness-95 disabled:bg-border-light dark:disabled:bg-border-dark disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-primary-light/20 dark:shadow-primary-dark/20 active:scale-95"
          aria-label="Generate topic ideas based on selected preferences"
        >
          {isLoading ? <Spinner /> : (hasReachedLimit ? 'Daily Limit Reached' : 'Generate Ideas')}
        </button>
        <p className="text-xs text-center text-text-secondary-light dark:text-text-secondary-dark mt-2">
            {generationsLeft} generations remaining today.
        </p>
      </div>
    </div>
  );
};

export default TopicPanel;