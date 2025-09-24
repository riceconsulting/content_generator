
import React from 'react';
import Dropdown from './Dropdown';
import Spinner from './Spinner';
import PlatformIcon from './icons/PlatformIcon';
import ToneIcon from './icons/ToneIcon';
import WordCountIcon from './icons/WordCountIcon';
import HashtagIcon from './icons/HashtagIcon';
import PersonaIcon from './icons/PersonaIcon';
import PromotionIcon from './icons/PromotionIcon';
import BookmarkIcon from './icons/BookmarkIcon';
import { ContentPreferences, ReferenceType } from '../types';
import { PLATFORM_OPTIONS, TONE_OPTIONS, WORD_COUNT_OPTIONS, PERSONA_OPTIONS, PROMOTION_LEVEL_OPTIONS } from '../constants';

interface ControlPanelProps {
  preferences: ContentPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<ContentPreferences>>;
  onGenerate: () => void;
  isLoading: boolean;
  generationsLeft: number;
  generationLimit: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ preferences, setPreferences, onGenerate, isLoading, generationsLeft, generationLimit }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const hasReachedLimit = generationsLeft <= 0;

  const referenceOptions: { value: ReferenceType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'any', label: 'Any Source' },
    { value: 'professional', label: 'Professional' },
  ];

  const hashtagOptions: { value: boolean; label: string }[] = [
    { value: true, label: 'Yes' },
    { value: false, label: 'No' },
  ];

  return (
    <div className="bg-surface-light dark:bg-surface-dark/50 p-6 rounded-xl border border-border-light dark:border-border-dark flex flex-col gap-6 h-full">
      <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Customize Your Content</h2>
      
      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
          What is your topic?
        </label>
        <textarea
          id="topic"
          name="topic"
          rows={3}
          value={preferences.topic}
          onChange={handleInputChange}
          placeholder="e.g., The benefits of remote work for startups"
          className="w-full bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md p-3 text-text-primary-light dark:text-text-primary-dark placeholder-text-secondary-light dark:placeholder-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent sm:text-sm transition"
          aria-label="Content topic"
        />
      </div>

      <Dropdown
        label="Platform"
        icon={<PlatformIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />}
        value={preferences.platform}
        onChange={(e) => setPreferences(prev => ({ ...prev, platform: e.target.value }))}
        options={PLATFORM_OPTIONS}
      />

      <Dropdown
        label="Tone of Voice"
        icon={<ToneIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />}
        value={preferences.tone}
        onChange={(e) => setPreferences(prev => ({ ...prev, tone: e.target.value }))}
        options={TONE_OPTIONS}
      />

      <Dropdown
        label="Word Count"
        icon={<WordCountIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />}
        value={preferences.wordCount}
        onChange={(e) => setPreferences(prev => ({ ...prev, wordCount: e.target.value }))}
        options={WORD_COUNT_OPTIONS}
      />

      <Dropdown
        label="Writer Persona"
        icon={<PersonaIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />}
        value={preferences.writerPersona}
        onChange={(e) => setPreferences(prev => ({ ...prev, writerPersona: e.target.value }))}
        options={PERSONA_OPTIONS}
      />
      
      <div>
        <label htmlFor="creatorName" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
          Your Name/Brand (for promotion)
        </label>
        <input
          type="text"
          id="creatorName"
          name="creatorName"
          value={preferences.creatorName}
          onChange={handleInputChange}
          placeholder="e.g., Jane Doe Inc."
          className="w-full bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md p-2 text-text-primary-light dark:text-text-primary-dark placeholder-text-secondary-light dark:placeholder-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent sm:text-sm transition"
          aria-label="Creator or brand name"
        />
      </div>

      <Dropdown
        label="Self-Promotion Level"
        icon={<PromotionIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" />}
        value={preferences.promotionLevel}
        onChange={(e) => setPreferences(prev => ({ ...prev, promotionLevel: e.target.value }))}
        options={PROMOTION_LEVEL_OPTIONS}
      />

      <div>
        <label htmlFor="customNotes" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
          Additional Notes for AI
        </label>
        <textarea
          id="customNotes"
          name="customNotes"
          rows={3}
          value={preferences.customNotes}
          onChange={handleInputChange}
          placeholder="e.g., Add a call-to-action to visit my website."
          className="w-full bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md p-3 text-text-primary-light dark:text-text-primary-dark placeholder-text-secondary-light dark:placeholder-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent sm:text-sm transition"
          aria-label="Custom notes for AI"
        />
      </div>
      
      <div className="flex flex-col gap-4">
        <div>
          <label className="flex items-center text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
            <BookmarkIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark mr-2" />
            <span>Include References</span>
          </label>
          <div className="grid grid-cols-3 gap-1 bg-background-light dark:bg-surface-dark p-1 rounded-lg border border-border-light dark:border-border-dark" role="group">
            {referenceOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPreferences(prev => ({ ...prev, referenceType: option.value }))}
                className={`w-full text-center text-sm py-1.5 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-light dark:focus:ring-offset-surface-dark focus:ring-primary-light dark:focus:ring-primary-dark ${
                  preferences.referenceType === option.value
                    ? 'bg-primary-light dark:bg-primary-dark text-white font-semibold shadow-sm'
                    : 'bg-transparent text-text-secondary-light dark:text-text-secondary-dark hover:bg-border-light/50 dark:hover:bg-border-dark'
                }`}
                aria-pressed={preferences.referenceType === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="flex items-center text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
            <HashtagIcon className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark mr-2" />
            <span>Suggest Hashtags</span>
          </label>
          <div className="grid grid-cols-2 gap-1 bg-background-light dark:bg-surface-dark p-1 rounded-lg border border-border-light dark:border-border-dark" role="group">
            {hashtagOptions.map(option => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => setPreferences(prev => ({ ...prev, generateHashtags: option.value }))}
                className={`w-full text-center text-sm py-1.5 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-light dark:focus:ring-offset-surface-dark focus:ring-primary-light dark:focus:ring-primary-dark ${
                  preferences.generateHashtags === option.value
                    ? 'bg-primary-light dark:bg-primary-dark text-white font-semibold shadow-sm'
                    : 'bg-transparent text-text-secondary-light dark:text-text-secondary-dark hover:bg-border-light/50 dark:hover:bg-border-dark'
                }`}
                aria-pressed={preferences.generateHashtags === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-4">
        <button
          onClick={onGenerate}
          disabled={isLoading || !preferences.topic.trim() || hasReachedLimit}
          className="w-full flex items-center justify-center bg-primary-light dark:bg-primary-dark hover:brightness-95 disabled:bg-border-light dark:disabled:bg-border-dark disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-primary-light/20 dark:shadow-primary-dark/20 active:scale-95"
          aria-label="Generate content based on selected preferences"
        >
          {isLoading ? <Spinner /> : (hasReachedLimit ? 'Daily Limit Reached' : 'Generate Content')}
        </button>
        <p className="text-xs text-center text-text-secondary-light dark:text-text-secondary-dark mt-2">
            {generationsLeft} generations remaining today.
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;