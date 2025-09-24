
import React from 'react';
import ClipboardIcon from './icons/ClipboardIcon';
import MagicWandIcon from './icons/MagicWandIcon';
import ReloadIcon from './icons/ReloadIcon';
import UserIcon from './icons/UserIcon';
import RobotIcon from './icons/RobotIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import AlertIcon from './icons/AlertIcon';
import { ChatMessage, TopicIdea } from '../types';
import LoadingBar from './LoadingBar';
import ProgressiveLoading from './ProgressiveLoading';
import WordCountIcon from './icons/WordCountIcon';

// --- LOADING STEPS ---
const contentGenerationSteps = [
    { text: 'Analyzing your request...', duration: 1500 },
    { text: 'Constructing the perfect prompt...', duration: 2500 },
    { text: 'Contacting the AI model...', duration: 2000 },
    { text: 'Generating initial concepts...', duration: 4000 }, // Slower part
    { text: 'Refining content draft...', duration: 3000 },
    { text: 'Formatting and finalizing...', duration: 1000 },
];

const longContentGenerationSteps = [
    { text: 'Analyzing your request...', duration: 2000 },
    { text: 'Constructing a detailed prompt...', duration: 3000 },
    { text: 'Generating initial long-form draft (Attempt 1/3)...', duration: 15000 },
    { text: 'Checking word count & refining draft (Attempt 2/3)...', duration: 15000 },
    { text: 'Finalizing length & content (Attempt 3/3)...', duration: 15000 },
    { text: 'Formatting and finalizing...', duration: 2000 },
];

const topicGenerationSteps = [
    { text: 'Analyzing your industry...', duration: 1500 },
    { text: 'Brainstorming creative angles...', duration: 3500 }, // Slower part
    { text: 'Crafting engaging hooks...', duration: 2000 },
    { text: 'Finalizing topic list...', duration: 1000 },
];

// --- MARKDOWN PARSER ---
const parseMarkdown = (text: string): string => {
    if (!text) return '';
    // Handle ### headings first
    let html = text.replace(/^###\s*(.*$)/gm, '<h3 class="text-lg font-bold my-3 text-text-primary-light dark:text-text-primary-dark">$1</h3>');
    // Handle ## headings
    html = html.replace(/^##\s*(.*$)/gm, '<h2 class="text-xl font-bold my-4 text-text-primary-light dark:text-text-primary-dark">$1</h2>');
    // Handle bold and italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Handle newlines
    html = html.replace(/\n/g, '<br />');
    return html;
};

// --- SUB-COMPONENTS ---

const ErrorOverlay: React.FC<{ message: string }> = ({ message }) => (
    <div 
        className="absolute inset-0 bg-surface-light/80 dark:bg-surface-dark/80 flex flex-col items-center justify-center text-center rounded-lg z-20 backdrop-blur-sm animate-fade-in p-6"
        role="alert"
    >
        <div className="w-16 h-16 mb-4 border-2 border-dashed border-red-500/50 rounded-full flex items-center justify-center">
            <AlertIcon className="w-8 h-8 text-red-500 animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Generation Failed</h3>
        <p className="mt-2 text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm">
            {message}
        </p>
    </div>
);

const ReferencesDisplay: React.FC<{ references: string }> = ({ references }) => {
  const urlRegex = /(https?:\/\/[^\s,]+)/g;

  const referenceItems = references
    .trim()
    .split('\n')
    .filter(line => line.trim() !== '')
    .map((line, index) => {
      const parts = line.split(urlRegex);
      return (
        <p key={index} className="break-words pl-6 -indent-6">
          {parts.map((part, i) =>
            urlRegex.test(part) ? (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-light dark:text-primary-dark underline hover:opacity-80 transition-opacity"
              >
                {part}
              </a>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      );
    });

  return (
    <div className="space-y-2 text-sm leading-relaxed text-text-secondary-light dark:text-text-secondary-dark">
      {referenceItems}
    </div>
  );
};


const ContentPlaceholder: React.FC = () => (
    <div className="text-center text-text-secondary-light dark:text-text-secondary-dark">
      <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-border-light dark:border-border-dark rounded-full flex items-center justify-center">
        <RobotIcon className="w-8 h-8 text-border-light dark:text-border-dark animate-pulse" />
      </div>
      <h3 className="text-lg font-medium text-text-secondary-light dark:text-text-secondary-dark">Your content will appear here</h3>
      <p className="mt-1 text-sm">Fill out the form and click "Generate Content" to start.</p>
    </div>
);

const TopicPlaceholder: React.FC = () => (
    <div className="text-center text-text-secondary-light dark:text-text-secondary-dark">
      <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-border-light dark:border-border-dark rounded-full flex items-center justify-center">
        <LightbulbIcon className="w-8 h-8 text-border-light dark:text-border-dark animate-pulse" />
      </div>
      <h3 className="text-lg font-medium text-text-secondary-light dark:text-text-secondary-dark">Your topic ideas will appear here</h3>
      <p className="mt-1 text-sm">Fill out the form and click "Generate Ideas" to start.</p>
    </div>
);

const RefinementControls: React.FC<{ 
    onRegenerate: () => void; 
    onRefine: (prompt: string) => void; 
    isLoading: boolean;
    contentGenerationsLeft: number;
    contentGenerationLimit: number;
}> = ({ onRegenerate, onRefine, isLoading, contentGenerationsLeft, contentGenerationLimit }) => {
    const [refinementPrompt, setRefinementPrompt] = React.useState('');
    const hasReachedLimit = contentGenerationsLeft <= 0;

    const handleRefineClick = () => {
        if (!refinementPrompt.trim() || isLoading || hasReachedLimit) return;
        onRefine(refinementPrompt);
        setRefinementPrompt('');
    };

    return (
        <div className="mt-6 pt-6 border-t border-border-light dark:border-border-dark">
            <div className="flex justify-between items-center mb-3">
                <label htmlFor="refinement-prompt" className="flex items-center text-md font-semibold text-text-primary-light dark:text-text-primary-dark">
                    <MagicWandIcon className="w-5 h-5 mr-2 text-primary-light dark:text-primary-dark" />
                    Refine Your Content
                </label>
                <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{contentGenerationsLeft} generations remaining today</span>
            </div>
             <textarea
                id="refinement-prompt"
                rows={3}
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                placeholder={hasReachedLimit ? "You've reached your daily generation limit." : "e.g., Make it more professional, add a call-to-action..."}
                className="w-full bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md p-3 text-text-primary-light dark:text-text-primary-dark placeholder-text-secondary-light dark:placeholder-text-secondary-dark focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark transition"
                disabled={isLoading || hasReachedLimit}
            />
            <div className="mt-3 flex justify-end items-center gap-3">
                <button
                    onClick={onRegenerate}
                    disabled={isLoading || hasReachedLimit}
                    className="flex items-center justify-center gap-2 bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm active:scale-95"
                    title={hasReachedLimit ? "You've reached your daily content generation limit." : "Regenerate content from scratch (uses 1 generation)"}
                >
                    <ReloadIcon className="w-4 h-4" />
                    {hasReachedLimit ? 'Limit Met' : 'Regenerate'}
                </button>
                 <button
                    onClick={handleRefineClick}
                    disabled={isLoading || !refinementPrompt.trim() || hasReachedLimit}
                    className="flex items-center justify-center gap-2 bg-primary-light dark:bg-primary-dark hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm active:scale-95"
                >
                    {hasReachedLimit ? 'Limit Reached' : 'Refine'}
                </button>
            </div>
        </div>
    );
};

const ChatMessageBubble: React.FC<{ message: ChatMessage; isLoading: boolean; }> = ({ message, isLoading }) => {
    const [copied, setCopied] = React.useState(false);
    const [wordCountVisible, setWordCountVisible] = React.useState(false);
    const bubbleContentRef = React.useRef<HTMLDivElement>(null);
    const isUser = message.role === 'user';

    const handleCopy = () => {
        if (isUser || !bubbleContentRef.current) return;
        
        const textToCopy = bubbleContentRef.current.innerText;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const Icon = isUser ? UserIcon : RobotIcon;

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && <Icon className="w-7 h-7 flex-shrink-0 text-text-secondary-light dark:text-text-secondary-dark mt-2" />}
            <div className={`p-4 rounded-lg max-w-2xl w-fit ${isUser ? 'bg-primary-light/20 dark:bg-primary-dark/20' : 'bg-slate-200 dark:bg-surface-dark/60'}`}>
                <div ref={bubbleContentRef}>
                    <div 
                        className="text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
                    />
                    
                    {!isUser && message.references && (
                        <>
                            <hr className="my-4 border-border-light dark:border-border-dark" />
                            <ReferencesDisplay references={message.references} />
                        </>
                    )}

                    {!isUser && message.hashtags && (
                        <>
                            <hr className="my-4 border-border-light dark:border-border-dark" />
                            <p className="text-hashtag-light dark:text-hashtag-dark font-mono text-sm leading-relaxed whitespace-pre-wrap">{message.hashtags}</p>
                        </>
                    )}
                </div>
                
                {/* Action Row: Shows Loading Bar or controls */}
                {!isUser && (isLoading || message.content) && (
                    <div className="mt-4 pt-2 border-t border-border-light/50 dark:border-border-dark/50">
                        {isLoading ? (
                             <div className="w-48">
                                <LoadingBar />
                            </div>
                        ) : message.content ? (
                            <div className="flex justify-between items-center gap-4">
                               <div className="text-left">
                                 {message.wordCount && wordCountVisible && (
                                     <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark animate-fade-in">
                                         Word Count: {message.wordCount}
                                     </span>
                                  )}
                               </div>
                                <div className="flex items-center gap-2">
                                     {message.wordCount && (
                                        <button
                                            onClick={() => setWordCountVisible(prev => !prev)}
                                            className="flex items-center gap-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors px-2 py-1 rounded-md bg-background-light dark:bg-surface-dark hover:bg-border-light/50 dark:hover:bg-border-dark"
                                            title="Toggle word count visibility"
                                        >
                                            <WordCountIcon className="w-3 h-3" />
                                        </button>
                                     )}
                                    <button 
                                        onClick={handleCopy}
                                        className="flex items-center gap-1.5 text-xs text-text-secondary-light dark:text-text-secondary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors px-2 py-1 rounded-md bg-background-light dark:bg-surface-dark hover:bg-border-light/50 dark:hover:bg-border-dark"
                                    >
                                        <ClipboardIcon className="w-3 h-3" />
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
            {isUser && <Icon className="w-7 h-7 flex-shrink-0 text-primary-light dark:text-primary-dark mt-2" />}
        </div>
    );
};


const TopicIdeaCard: React.FC<{ idea: TopicIdea; onSelect: (headline: string) => void; }> = ({ idea, onSelect }) => (
    <div className="bg-background-light dark:bg-surface-dark/60 p-4 rounded-lg border border-border-light dark:border-border-dark/50 transition-shadow hover:shadow-lg animate-fade-in-up">
        <h4 className="font-semibold text-primary-light dark:text-primary-dark">{idea.headline}</h4>
        <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2 text-sm leading-relaxed">{idea.description}</p>
        <div className="text-right mt-4">
            <button
                onClick={() => onSelect(idea.headline)}
                className="bg-primary-light/80 hover:bg-primary-light dark:bg-primary-dark/80 dark:hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm active:scale-95"
            >
                Use this Topic
            </button>
        </div>
    </div>
);

// --- MAIN COMPONENT ---
interface ContentDisplayProps {
  activeTab: 'content' | 'topic';
  chatHistory: ChatMessage[];
  topicIdeas: TopicIdea[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  onRegenerate: () => void;
  onRefine: (prompt: string) => void;
  onSelectTopic: (headline: string) => void;
  contentGenerationsLeft: number;
  contentGenerationLimit: number;
  wordCount: string;
}

const ContentDisplay: React.FC<ContentDisplayProps> = ({
  activeTab, chatHistory, topicIdeas, isLoading, isStreaming, error, onRegenerate, onRefine, onSelectTopic, contentGenerationsLeft, contentGenerationLimit, wordCount
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showLoader, setShowLoader] = React.useState(false);
  const [loaderComplete, setLoaderComplete] = React.useState(false);

  const isLongGeneration = activeTab === 'content' && wordCount === '2500';
  const currentSteps = isLongGeneration 
      ? longContentGenerationSteps 
      : (activeTab === 'content' ? contentGenerationSteps : topicGenerationSteps);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, topicIdeas, isLoading]);

  // This is the primary condition to show the main loader overlay.
  // It should be visible when the app is busy and hasn't started streaming a result yet.
  const shouldShowLoader = isLoading && !isStreaming;
  
  React.useEffect(() => {
    if (error) {
        setShowLoader(false);
        setLoaderComplete(false);
        return;
    }

    if (shouldShowLoader) {
      setShowLoader(true);
      setLoaderComplete(false);
    }
    
    // If streaming starts, or if loading finishes (e.g., for topics), complete the loader.
    if ((isStreaming || (!isLoading && showLoader)) && !loaderComplete) {
      setLoaderComplete(true);
      // Set a timer to hide the loader after its animations complete
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 800); // 300ms for 100% anim + 500ms for fade out
      return () => clearTimeout(timer);
    }
  }, [isLoading, isStreaming, showLoader, loaderComplete, error]);

  const renderMainContent = () => {
    if (activeTab === 'content') {
        const hasChatHistory = chatHistory.length > 0;
        if (!isLoading && !hasChatHistory && !error) {
            return <div className="flex items-center justify-center h-full"><ContentPlaceholder /></div>;
        }
        return (
            <div className="space-y-6">
                {chatHistory.map((message, index) => (
                    <div key={index} className={message.role === 'user' ? 'animate-fade-in-up' : ''}>
                        <ChatMessageBubble
                            message={message}
                            isLoading={isLoading && !isStreaming && index === chatHistory.length - 1}
                        />
                    </div>
                ))}
            </div>
        );
    }
    
    if (activeTab === 'topic') {
        const hasTopicIdeas = topicIdeas.length > 0;
        if (!isLoading && !hasTopicIdeas && !error) {
            return <div className="flex items-center justify-center h-full"><TopicPlaceholder /></div>;
        }
        return (
            <div className="space-y-4">
                {topicIdeas.map((idea, index) => (
                    <TopicIdeaCard key={index} idea={idea} onSelect={onSelectTopic} />
                ))}
            </div>
        );
    }
    return null;
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark/50 p-6 rounded-xl border border-border-light dark:border-border-dark flex flex-col h-full max-h-[80vh] min-h-[500px]">
      <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-4 flex-shrink-0">
        {activeTab === 'topic' ? 'Topic Ideas' : 'Conversation'}
      </h2>

      <div ref={scrollRef} className="flex-grow overflow-y-auto pr-4 -mr-4 relative">
        {error && <ErrorOverlay message={error} />}
        
        {showLoader && !error && (
          <div className={`absolute inset-0 bg-surface-light/80 dark:bg-surface-dark/80 flex items-center justify-center rounded-lg z-10 backdrop-blur-sm transition-opacity duration-500 ${loaderComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <ProgressiveLoading 
                steps={currentSteps}
                isComplete={loaderComplete}
            />
          </div>
        )}

        {renderMainContent()}
      </div>

      {activeTab === 'content' && chatHistory.length > 0 && !isLoading && !error && (
        <div className="flex-shrink-0">
            <RefinementControls 
                onRegenerate={onRegenerate} 
                onRefine={onRefine} 
                isLoading={isLoading} 
                contentGenerationsLeft={contentGenerationsLeft}
                contentGenerationLimit={contentGenerationLimit}
            />
        </div>
       )}
    </div>
  );
};

export default ContentDisplay;