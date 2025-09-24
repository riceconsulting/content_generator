
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ControlPanel from './components/ControlPanel';
import TopicPanel from './components/TopicPanel';
import ContentDisplay from './components/ContentDisplay';
import { ContentPreferences, ChatMessage, TopicPreferences, TopicIdea } from './types';
import { PLATFORM_OPTIONS, TONE_OPTIONS, WORD_COUNT_OPTIONS, PERSONA_OPTIONS, PROMOTION_LEVEL_OPTIONS, AUDIENCE_OPTIONS, CONTENT_ANGLE_OPTIONS, HOOK_STYLE_OPTIONS, NUM_IDEAS_OPTIONS } from './constants';
import { generateOptimizedContentPrompt, generateTopicIdeas, startChatSession, findWebSources } from './services/geminiService';
import { Chat } from '@google/genai';

type AppTab = 'content' | 'topic';
type Theme = 'light' | 'dark';

// --- DAILY USAGE LIMITS ---
const DAILY_GENERATION_LIMIT = 10;
const CONTENT_GENERATION_LIMIT = DAILY_GENERATION_LIMIT;
const TOPIC_GENERATION_LIMIT = DAILY_GENERATION_LIMIT;

interface DailyUsage {
  count: number;
  date: string; // YYYY-MM-DD
}

// --- Cookie Helpers ---
const setCookieForDay = (name: string, value: string) => {
    const date = new Date();
    // Expires at local midnight
    const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0);
    document.cookie = `${name}=${value}; expires=${midnight.toUTCString()}; path=/`;
};

const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

const getTodaysDateString = () => new Date().toISOString().split('T')[0];

const getUsageFromCookie = (cookieName: string, limit: number): DailyUsage => {
    const cookieValue = getCookie(cookieName);
    const today = getTodaysDateString();

    if (cookieValue) {
        try {
            const usage: DailyUsage = JSON.parse(cookieValue);
            // If the date matches today, return the stored usage
            if (usage.date === today && typeof usage.count === 'number') {
                return usage;
            }
        } catch (e) {
            console.error(`Error parsing cookie ${cookieName}`, e);
        }
    }
    // If no cookie, cookie is for a past day, or cookie is invalid, reset to the limit for today.
    return { count: limit, date: today };
};


// --- AUTOSAVE & STATE INITIALIZATION ---
const loadStateFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      return JSON.parse(storedValue) as T;
    }
  } catch (error) {
    console.error(`Error loading state for ${key} from localStorage`, error);
  }
  return defaultValue;
};

const initialContentPreferences: ContentPreferences = {
  topic: '',
  platform: PLATFORM_OPTIONS[0].value,
  tone: TONE_OPTIONS[0].value,
  wordCount: WORD_COUNT_OPTIONS[0].value,
  generateHashtags: false,
  referenceType: 'none',
  writerPersona: PERSONA_OPTIONS[0].value,
  promotionLevel: PROMOTION_LEVEL_OPTIONS[0].value,
  creatorName: '',
  customNotes: '',
};

const initialTopicPreferences: TopicPreferences = {
  industry: '',
  audience: AUDIENCE_OPTIONS[0].value,
  angle: CONTENT_ANGLE_OPTIONS[0].value,
  hook: HOOK_STYLE_OPTIONS[0].value,
  numIdeas: NUM_IDEAS_OPTIONS[0].value,
};

// Helper to parse the full response from the model into structured parts
const parseFullResponse = (fullResponseText: string): Omit<ChatMessage, 'role'> => {
  let cleanedFullText = fullResponseText;
  let wordCount: number | undefined;

  const wordCountRegex = /(\r\n|\n|\r)?\s*(\*\*|)?Word Count(?: \(estimated\))?:\s*(\d+)(\*\*|)?\s*$/;
  const match = cleanedFullText.match(wordCountRegex);
  
  if (match && match[3]) {
      wordCount = parseInt(match[3], 10);
      cleanedFullText = cleanedFullText.replace(wordCountRegex, '').trimEnd();
  }

  let contentPart = cleanedFullText;
  let hashtagPart = '';
  let referencePart = '';
  const hashtagSeparator = '---HASHTAGS---';
  const referenceSeparator = '---References---';

  const hashtagIndex = cleanedFullText.indexOf(hashtagSeparator);
  const referenceIndex = cleanedFullText.indexOf(referenceSeparator);
  
  if (referenceIndex !== -1 && hashtagIndex !== -1) {
      if (referenceIndex < hashtagIndex) {
          contentPart = cleanedFullText.substring(0, referenceIndex);
          referencePart = cleanedFullText.substring(referenceIndex + referenceSeparator.length, hashtagIndex).trim();
          hashtagPart = cleanedFullText.substring(hashtagIndex + hashtagSeparator.length).trim();
      } else {
          contentPart = cleanedFullText.substring(0, hashtagIndex);
          hashtagPart = cleanedFullText.substring(hashtagIndex + hashtagSeparator.length, referenceIndex).trim();
          referencePart = cleanedFullText.substring(referenceIndex + referenceSeparator.length).trim();
      }
  } else if (referenceIndex !== -1) {
      contentPart = cleanedFullText.substring(0, referenceIndex);
      referencePart = cleanedFullText.substring(referenceIndex + referenceSeparator.length).trim();
  } else if (hashtagIndex !== -1) {
      contentPart = cleanedFullText.substring(0, hashtagIndex);
      hashtagPart = cleanedFullText.substring(hashtagIndex + hashtagSeparator.length).trim();
  }
  
  return {
    content: contentPart.trim(),
    hashtags: hashtagPart,
    references: referencePart,
    wordCount: wordCount,
  };
};

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState<AppTab>(() => loadStateFromStorage('autosave_activeTab', 'topic'));
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme');
      if (storedTheme === 'dark') {
        return 'dark';
      }
    }
    return 'light';
  });

  // Rate Limiting State
  const [contentUsage, setContentUsage] = useState<DailyUsage>(() => getUsageFromCookie('contentUsage', CONTENT_GENERATION_LIMIT));
  const [topicUsage, setTopicUsage] = useState<DailyUsage>(() => getUsageFromCookie('topicUsage', TOPIC_GENERATION_LIMIT));
  
  // Content Generation State
  const [contentPreferences, setContentPreferences] = useState<ContentPreferences>(() => {
    const loadedPrefs = loadStateFromStorage('autosave_contentPreferences', initialContentPreferences);
    // Migration logic for old 'generateReferences' boolean
    if (loadedPrefs && typeof (loadedPrefs as any).generateReferences !== 'undefined') {
        loadedPrefs.referenceType = (loadedPrefs as any).generateReferences ? 'any' : 'none';
        delete (loadedPrefs as any).generateReferences;
    }
    // Ensure referenceType exists if it was an old state object
    if (!loadedPrefs.referenceType) {
        loadedPrefs.referenceType = 'none';
    }
    return loadedPrefs;
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => loadStateFromStorage('autosave_chatHistory', []));
  const chatRef = useRef<Chat | null>(null);

  // Topic Generation State
  const [topicPreferences, setTopicPreferences] = useState<TopicPreferences>(() => loadStateFromStorage('autosave_topicPreferences', initialTopicPreferences));
  const [topicIdeas, setTopicIdeas] = useState<TopicIdea[]>(() => loadStateFromStorage('autosave_topicIdeas', []));

  // General State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- EFFECTS for AUTOSAVE ---
  useEffect(() => { localStorage.setItem('autosave_activeTab', JSON.stringify(activeTab)); }, [activeTab]);
  useEffect(() => { localStorage.setItem('autosave_contentPreferences', JSON.stringify(contentPreferences)); }, [contentPreferences]);
  useEffect(() => { localStorage.setItem('autosave_topicPreferences', JSON.stringify(topicPreferences)); }, [topicPreferences]);
  useEffect(() => { localStorage.setItem('autosave_chatHistory', JSON.stringify(chatHistory)); }, [chatHistory]);
  useEffect(() => { localStorage.setItem('autosave_topicIdeas', JSON.stringify(topicIdeas)); }, [topicIdeas]);


  // --- THEME MANAGEMENT ---
  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  // --- CONTENT & TOPIC GENERATION LOGIC ---
  const processNewMessageStream = async (stream: AsyncGenerator<any, any, any>, onStreamStart: () => void) => {
    let fullResponseText = '';
    let streamStarted = false;
    
    for await (const chunk of stream) {
      if (!streamStarted) {
        onStreamStart();
        streamStarted = true;
      }
      fullResponseText += chunk.text;
      
      setChatHistory(prev => {
          const newHistory = [...prev];
          const lastMessage = newHistory[newHistory.length - 1];
          if (lastMessage?.role === 'model') {
              const parsedMessage = parseFullResponse(fullResponseText);
              lastMessage.content = parsedMessage.content;
              lastMessage.hashtags = parsedMessage.hashtags;
              lastMessage.references = parsedMessage.references;
              lastMessage.wordCount = parsedMessage.wordCount;
          }
          return newHistory;
      });
    }
  };

  const handleGenerateContent = useCallback(async (isRegeneration = false) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const currentUsage = getUsageFromCookie('contentUsage', CONTENT_GENERATION_LIMIT);
    if (currentUsage.count <= 0) {
      setError(`You have reached your daily limit of ${CONTENT_GENERATION_LIMIT} content generations.`);
      return;
    }
    
    if (!contentPreferences.topic.trim()) {
      setError("Please enter a topic to generate content.");
      return;
    }

    setIsLoading(true);
    setIsStreaming(false);
    setError(null);
    setChatHistory([]);
    setTopicIdeas([]); // Clear topic ideas when generating content
    chatRef.current = null;
    
    try {
      const { platform, topic, tone, wordCount, writerPersona, creatorName, promotionLevel, customNotes, generateHashtags, referenceType } = contentPreferences;
      let userDisplayPrompt = `Alright, let's craft a **${platform}** piece about **"${topic}"**. Here's the brief:\n\n`;
      userDisplayPrompt += `✍️ **Writing Style:**\n`;
      userDisplayPrompt += `   - **Tone:** I'll write in a ${tone} voice.\n`;
      userDisplayPrompt += `   - **Persona:** I will act as a ${writerPersona}.\n`;
      userDisplayPrompt += `   - **Length:** It will be around ${wordCount} words.\n\n`;
      const goals = [];
      if (creatorName.trim() && parseInt(promotionLevel, 10) > 0) {
        goals.push(`   - **Promotion:** Weave in a ${promotionLevel}% promotion for **${creatorName}**.`);
      }
      if (generateHashtags) {
        goals.push(`   - **Hashtags:** Include a list of relevant hashtags.`);
      }
      if (referenceType !== 'none') {
        goals.push(`   - **References:** Research and cite sources.`);
      }
      if (customNotes.trim()) {
        goals.push(`   - **Special Notes:** "${customNotes}"`);
      }
      if (goals.length > 0) {
        userDisplayPrompt += `🎯 **Content Goals:**\n`;
        userDisplayPrompt += goals.join('\n');
      }
      
      setChatHistory([
        { role: 'user', content: userDisplayPrompt.trim() },
        { role: 'model', content: '' } // Add empty model message for loading state
      ]);

      const systemInstruction = `You are an expert content creator and social media strategist. Your task is to generate a piece of content based on the user's specifications. You will adopt the persona of a ${writerPersona}. Provide only the content itself (and hashtags if requested), without any of your own commentary, introduction, or sign-off. Follow formatting instructions from the main prompt precisely.`;
      
      const newChat = startChatSession(systemInstruction);
      chatRef.current = newChat;

      // SPECIAL CASE for 2500 words with re-prompting
      if (wordCount === '2500') {
        const MAX_ATTEMPTS = 3;
        const TARGET_WC = 2500;
        const MIN_WC = 2200;
        const MAX_WC = 2800;

        let lastResponseText = '';
        let currentWordCount = 0;
        
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            let promptForThisAttempt: string;

            if (attempt === 1) {
                let sources: string | null = null;
                if (contentPreferences.referenceType !== 'none') {
                    sources = await findWebSources(contentPreferences);
                }
                promptForThisAttempt = generateOptimizedContentPrompt(contentPreferences, sources);
                if (isRegeneration) {
                  promptForThisAttempt += "\n\n---\n\n**Instruction:** Generate a new version of this content. Use a different hook, structure, or perspective from any previous attempts.";
                }
            } else {
                if (currentWordCount < MIN_WC) {
                    promptForThisAttempt = `The previous response was too short at ${currentWordCount} words. Please expand and rewrite the content so that the total length is between ${MIN_WC} and ${MAX_WC} words (target ~${TARGET_WC} words). Add more depth, details, and examples where needed, while keeping the content coherent and on-topic. At the end, state the final word count as: Word Count: [number].`;
                } else { // currentWordCount > MAX_WC
                    promptForThisAttempt = `The previous response was too long at ${currentWordCount} words. Please condense and rewrite the content so that the total length is between ${MIN_WC} and ${MAX_WC} words (target ~${TARGET_WC} words). Focus on the most impactful points, remove redundancy, and shorten sentences. At the end, state the final word count as: Word Count: [number].`;
                }
            }

            const result = await newChat.sendMessage({ message: promptForThisAttempt });
            lastResponseText = result.text;
            
            const tempParsed = parseFullResponse(lastResponseText);
            currentWordCount = tempParsed.content.split(/\s+/).filter(Boolean).length;
            
            if (currentWordCount >= MIN_WC && currentWordCount <= MAX_WC) {
                break; // Exit loop on success
            }
        }

        // Always display the last attempt, even if it's outside the word count range.
        const parsedMessage = parseFullResponse(lastResponseText);
        setChatHistory(prev => {
            const newHistory = [...prev];
            const lastMsgIndex = newHistory.length - 1;
            if(lastMsgIndex >= 0 && newHistory[lastMsgIndex].role === 'model') {
                newHistory[lastMsgIndex] = { role: 'model', ...parsedMessage };
            }
            return newHistory;
        });

      } else { // REGULAR STREAMING LOGIC for other word counts
          let sources: string | null = null;
          if (contentPreferences.referenceType !== 'none') {
            sources = await findWebSources(contentPreferences);
          }
          
          let finalPrompt = generateOptimizedContentPrompt(contentPreferences, sources);
          if (isRegeneration) {
            finalPrompt += "\n\n---\n\n**Instruction:** Generate a new version of this content. Use a different hook, structure, or perspective from any previous attempts.";
          }
            
          const stream = await newChat.sendMessageStream({ message: finalPrompt });
          await processNewMessageStream(stream, () => setIsStreaming(true));
      }

      // ON SUCCESS: Decrement usage count
      const usageNow = getUsageFromCookie('contentUsage', CONTENT_GENERATION_LIMIT);
      const newCount = usageNow.count - 1;
      const newUsage: DailyUsage = { count: newCount, date: getTodaysDateString() };
      setCookieForDay('contentUsage', JSON.stringify(newUsage));
      setContentUsage(newUsage);

    } catch (e) {
      console.error("Content Generation Error:", e);
      setError("There was a problem on our end. Please try again later.");
      setChatHistory(prev => prev.filter(msg => msg.role === 'user')); // Clear the loading bubble on error
      chatRef.current = null;
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [contentPreferences]);

  const handleRegenerateContent = useCallback(async () => {
    await handleGenerateContent(true);
  }, [handleGenerateContent]);

  const handleRefineContent = useCallback(async (refinementPrompt: string) => {
    const currentUsage = getUsageFromCookie('contentUsage', CONTENT_GENERATION_LIMIT);
    if (currentUsage.count <= 0) {
      setError(`You have reached your daily limit of ${CONTENT_GENERATION_LIMIT} content generations.`);
      return;
    }
    if (!chatRef.current || !refinementPrompt.trim()) return;
    
    setIsLoading(true);
    setIsStreaming(false);
    setError(null);
    try {
        setChatHistory(prev => [
            ...prev, 
            { role: 'user', content: refinementPrompt },
            { role: 'model', content: '' }
        ]);
        const stream = await chatRef.current.sendMessageStream({ message: refinementPrompt });
        await processNewMessageStream(stream, () => setIsStreaming(true));

        // ON SUCCESS: Decrement usage count
        const usageNow = getUsageFromCookie('contentUsage', CONTENT_GENERATION_LIMIT);
        const newCount = usageNow.count - 1;
        const newUsage: DailyUsage = { count: newCount, date: getTodaysDateString() };
        setCookieForDay('contentUsage', JSON.stringify(newUsage));
        setContentUsage(newUsage);

    } catch (e) {
        console.error("Content Refinement Error:", e);
        setError("There was a problem on our end. Please try again later.");
        setChatHistory(prev => prev.slice(0, -2)); // Clear the user prompt and loading bubble on error
    } finally {
        setIsLoading(false);
        setIsStreaming(false);
    }
  }, []);

  const handleGenerateTopics = useCallback(async () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const currentUsage = getUsageFromCookie('topicUsage', TOPIC_GENERATION_LIMIT);
    if (currentUsage.count <= 0) {
      setError(`You have reached your daily limit of ${TOPIC_GENERATION_LIMIT} topic idea generations.`);
      return;
    }
    if (!topicPreferences.industry.trim()) {
        setError("Please enter an industry or niche.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setTopicIdeas([]);
    setChatHistory([]);
    try {
        const ideas = await generateTopicIdeas(topicPreferences);
        setTopicIdeas(ideas);

        // ON SUCCESS: Decrement usage count
        const usageNow = getUsageFromCookie('topicUsage', TOPIC_GENERATION_LIMIT);
        const newCount = usageNow.count - 1;
        const newUsage: DailyUsage = { count: newCount, date: getTodaysDateString() };
        setCookieForDay('topicUsage', JSON.stringify(newUsage));
        setTopicUsage(newUsage);

    } catch(e) {
        console.error("Topic Generation Error:", e);
        setError("There was a problem on our end. Please try again later.");
    } finally {
        setIsLoading(false);
    }
  }, [topicPreferences]);

  const handleSelectTopic = (headline: string) => {
    const { industry, audience, angle, hook } = topicPreferences;
    const topicContextNotes = `Context from Topic Idea Generation:\n- Industry/Niche: ${industry}\n- Target Audience: ${audience}\n- Content Angle: ${angle}\n- Engagement Hook Style: ${hook}`;
    setContentPreferences(prev => {
      const newCustomNotes = prev.customNotes ? `${prev.customNotes}\n\n${topicContextNotes}` : topicContextNotes;
      return { ...prev, topic: headline, customNotes: newCustomNotes };
    });
    setActiveTab('content');
    setTopicIdeas([]);
    setChatHistory([]);
  };
  
  const TabButton: React.FC<{ tabId: AppTab; label: string; }> = ({ tabId, label }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === tabId
          ? 'bg-primary-light dark:bg-primary-dark text-white'
          : 'bg-transparent dark:bg-surface-dark/50 text-text-secondary-light dark:text-text-secondary-dark hover:bg-border-light dark:hover:bg-border-dark'
      }`}
      aria-current={activeTab === tabId ? 'page' : undefined}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark transition-colors duration-300">
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mb-20">
        
        <div className="mb-6 flex justify-center space-x-2 p-1 bg-surface-light/80 dark:bg-surface-dark/80 rounded-lg backdrop-blur-sm">
            <TabButton tabId="topic" label="Topic Idea Generator" />
            <TabButton tabId="content" label="Content Generator" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          <div className="lg:col-span-4">
             <div key={activeTab} className="animate-fade-in">
              {activeTab === 'content' ? (
                  <ControlPanel
                      preferences={contentPreferences}
                      setPreferences={setContentPreferences}
                      onGenerate={handleGenerateContent}
                      isLoading={isLoading}
                      generationsLeft={contentUsage.count}
                      generationLimit={CONTENT_GENERATION_LIMIT}
                  />
              ) : (
                  <TopicPanel
                      preferences={topicPreferences}
                      setPreferences={setTopicPreferences}
                      onGenerate={handleGenerateTopics}
                      isLoading={isLoading}
                      generationsLeft={topicUsage.count}
                      generationLimit={TOPIC_GENERATION_LIMIT}
                  />
              )}
            </div>
          </div>
          <div className="lg:col-span-8">
            <ContentDisplay
              activeTab={activeTab}
              chatHistory={chatHistory}
              topicIdeas={topicIdeas}
              onSelectTopic={handleSelectTopic}
              isLoading={isLoading}
              isStreaming={isStreaming}
              error={error}
              onRegenerate={handleRegenerateContent}
              onRefine={handleRefineContent}
              contentGenerationsLeft={contentUsage.count}
              contentGenerationLimit={CONTENT_GENERATION_LIMIT}
              wordCount={contentPreferences.wordCount}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
