
import { GoogleGenAI, Chat, Type } from "@google/genai";
import { ContentPreferences, TopicPreferences, TopicIdea } from '../types';

// This check is for robustness, assuming process.env.API_KEY is provided.
if (!process.env.API_KEY) {
  // In a real app, you might want to handle this more gracefully than throwing an error.
  // For this context, it ensures the developer knows the key is missing.
  console.warn("API_KEY environment variable not set. The app will not work without it.");
}

// Initialize the GoogleGenAI client with the API key.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Finds relevant web sources using Google Search and formats them into an APA-style list.
 * This is a two-step process: 1) Search and extract structured source data. 2) Format the data into citations.
 * @param preferences - The user's content generation settings.
 * @returns A formatted string of sources in APA style to be injected into the main prompt.
 */
export const findWebSources = async (preferences: ContentPreferences): Promise<string> => {
  const { topic, wordCount, referenceType } = preferences;

  if (referenceType === 'none') {
    return "";
  }
  
  // Determine the number of sources to find, e.g., 1 per 400 words. Min 2, max 5.
  const numSources = Math.max(2, Math.min(5, Math.ceil(parseInt(wordCount, 10) / 400))); 
  
  try {
    // --- Step 1: Search for sources and get structured data ---
    let searchPrompt: string;

    if (referenceType === 'professional') {
      searchPrompt = `Find ${numSources} highly relevant and authoritative professional and academic sources for an article about "${topic}". The sources MUST be from one of the following categories:
- Peer-reviewed journal articles
- Published scholarly books or chapters
- Official reports from government agencies or reputable organizations (e.g., NGOs, research institutions)
- Conference proceedings from academic or professional conferences
- In-depth articles from trusted industry thought leaders (e.g., PwC, Deloitte, Accenture, Gartner, McKinsey).
Prioritize academic and research-based sources.`;
    } else { // 'any'
      searchPrompt = `Find ${numSources} highly relevant and authoritative web sources for an article about "${topic}".`;
    }
    
    const searchResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: searchPrompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (!groundingChunks || groundingChunks.length === 0) {
      console.warn("Model did not return any grounding chunks from search.");
      return "No valid, citable sources were found for this topic. The model will rely on its general knowledge.";
    }

    const sourcesToCite = groundingChunks
      .map(chunk => ({
        title: chunk.web?.title || 'Untitled',
        url: chunk.web?.uri || '',
      }))
      // Validate and filter sources to ensure they are valid, external URLs.
      .filter(source => {
          if (!source.url) return false;
          const isHttp = source.url.startsWith('http://') || source.url.startsWith('https://');
          const isNotInternal = !source.url.includes('vertexaisearch');
          return isHttp && isNotInternal;
      });
    
    if (sourcesToCite.length === 0) {
      console.warn("Google Search returned sources, but all were filtered out as invalid or internal URLs.");
      return "No valid, citable sources were found for this topic. The model will rely on its general knowledge.";
    }

    // --- Step 2: Format the extracted sources into APA style ---
    const formattingPrompt = `
You are an expert academic librarian. Your task is to create a reference list in APA 7th edition style from the provided list of web sources.

**Sources:**
${JSON.stringify(sourcesToCite)}

**Formatting Rules:**
- For each source, create a reference list entry in APA 7th edition style.
- If the author is not available, start with the title. Use the provided title.
- If the publication date is not available, use (n.d.).
- You MUST include the full, original URL provided for each source.
- Do NOT number the list or use bullet points. Each reference should start on a new line.

**Output:**
Output ONLY the formatted reference list, without any introduction, commentary, or other text.
`;

    const formattingResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattingPrompt,
    });
    
    const formattedReferences = formattingResponse.text.trim();

    if (!formattedReferences) {
      console.warn("Model did not return any formatted references from the formatting call. Falling back to a simple list.");
      return sourcesToCite.map(s => `${s.title}\n${s.url}`).join('\n\n');
    }
  
    return formattedReferences;

  } catch (error) {
    console.error("Error finding or formatting web sources:", error);
    // Re-throw the error to be handled by the main component's try-catch block.
    // This allows the UI to display a proper error message to the user instead of silently failing.
    throw error;
  }
};


/**
 * Generates an optimized, detailed prompt for the main content generation task
 * based on user preferences. This is a meta-prompting step.
 * @param preferences - The user's content generation settings.
 * @param sources - An optional string of pre-formatted, APA-style web sources.
 * @returns A string containing the optimized prompt.
 */
export const generateOptimizedContentPrompt = (preferences: ContentPreferences, sources: string | null): string => {
  const { topic, platform, tone, wordCount, generateHashtags, referenceType, writerPersona, promotionLevel, creatorName, customNotes } = preferences;

  let sourceInstruction = '';
  const shouldIncludeReferences = referenceType !== 'none';
  const hasValidSources = shouldIncludeReferences && sources && !sources.startsWith("No valid, citable sources") && !sources.startsWith("There was an error");

  if (hasValidSources) {
      sourceInstruction = `
# MANDATORY SOURCES
- You MUST base your content *only* on the information provided in the sources listed below.
- Do NOT use any other external information or your own general knowledge.
- After writing the main content, you MUST reproduce this exact list of sources under the "References" section.

**Sources List:**
${sources}
`;
  } else if (shouldIncludeReferences) {
      // This is a fallback instruction if the source finding step failed.
      sourceInstruction = `
# REFERENCES
- The initial search for sources failed. Please find reliable external sources or use specific data points to back up your claims.
- You must list any sources you use in a "References" section after the main content.
- Write references in APA style, and you must include the full URL.
`;
  }

  // Dynamically build the OUTPUT STRUCTURE section
  let outputStructure = `
## 1. Main Content:
- Write the full piece of content here, adhering to all the user preferences above.`;

  if (shouldIncludeReferences) {
    outputStructure += `

## 2. Separator (References):
- After the main content, you MUST place this exact separator on a new line:
---References---

## 3. References List:
- Following the separator, list all the sources you used.
- **Format citations in APA style, and you MUST write down the full URL.**`;
  }

  if (generateHashtags) {
    const stepNumSeparator = shouldIncludeReferences ? 4 : 2;
    const stepNumList = shouldIncludeReferences ? 5 : 3;
    outputStructure += `

## ${stepNumSeparator}. Separator (Hashtags):
- After the content (and references, if any), you MUST place this exact separator on a new line:
---HASHTAGS---

## ${stepNumList}. Hashtags List:
- Following the separator, provide 10-15 relevant, high-traffic hashtags.
- They should be separated by spaces, like this: #hashtag1 #hashtag2 #hashtag3`;
  }

  // Dynamically build the EXAMPLE section
  let exampleUserPrefs = `- Topic: "Benefits of morning walks"\n- Platform: "Blog Post"`;
  let exampleOutput = `Rise and shine! ☀️ Starting your day with a simple morning walk can be a total game-changer for your physical and mental well-being. It's not about intense exercise; it's about gentle movement and fresh air. Recent studies show that just 20-30 minutes can boost your energy levels more than a cup of coffee and improve your mood.`;

  if (shouldIncludeReferences) {
    exampleUserPrefs += `\n- References: "Yes"`;
    exampleOutput += `

---References---
Walker, J. (2023). The Art of the Morning Stroll. Wellness Publications. https://example.com/study-on-walking`;
  } else {
    exampleUserPrefs += `\n- References: "No"`;
  }

  if (generateHashtags) {
    exampleUserPrefs += `\n- Hashtags: "Yes"`;
    exampleOutput += `

---HASHTAGS---
#MorningWalk #SunriseStroll #GetMoving #MentalHealthMatters #WellnessJourney #HealthyHabits #DailyRoutine`;
  } else {
    exampleUserPrefs += `\n- Hashtags: "No"`;
  }

  exampleOutput += `\n\n**Word Count (estimated): 48**`;

  const metaPrompt = `
# MISSION
Your mission is to act as an expert-level ${writerPersona} and generate a high-quality piece of content based on the user's detailed specifications. You must follow all instructions precisely, especially the output format and the word count.

${sourceInstruction}

# USER PREFERENCES
- **Content Topic:** "${topic}"
- **Target Platform:** ${platform} (Adapt the style, length, and formatting to be optimal for this platform.)
- **Desired Tone of Voice:** ${tone}. The content should feel authentic and engaging for the target audience.
- **Word Count Target:** Approximately ${wordCount} words.  
   - The acceptable range is **${Math.round(Number(wordCount) * 0.9)} – ${Math.round(Number(wordCount) * 1.1)} words**.  
   - Do not exceed this range under any circumstance.  
   - Plan your content before writing:  
       - Introduction: ~${Math.round(Number(wordCount) * 0.1)} words  
       - Body (split into 3–5 sections): ~${Math.round(Number(wordCount) * 0.7)} words total  
       - Conclusion: ~${Math.round(Number(wordCount) * 0.2)} words  
   - End the text immediately once you reach the target range. Do NOT continue adding content or extra sections.  
   - After finishing, provide an **estimated Word Count** in this format on the last line:  
     **Word Count (estimated): [number]**  
   - If the estimated count is outside the allowed range, rewrite and adjust until it fits.
- **Creator/Brand Name:** ${creatorName || 'Not provided'}.
- **Self-Promotion Level:** ${promotionLevel}% of the content should be dedicated to promoting the creator/brand. If 0%, do not mention them at all. If greater than 0%, seamlessly integrate the promotion within the content, making it feel natural and not like a jarring advertisement.
- **Include Hashtags:** ${generateHashtags ? 'Yes.' : 'No.'}
- **Include References:** ${shouldIncludeReferences ? `Yes. You must list sources in APA style with URLs. The user specifically requested ${referenceType === 'professional' ? 'professional/academic' : 'any'} sources.` : 'No.'}
- **Additional Instructions:** ${customNotes || 'None'}

# OUTPUT STRUCTURE
You MUST follow this structure precisely. Do not add any commentary, introductions, or pleasantries before or after the content.
${outputStructure}

---

# EXAMPLE SCENARIO
**User Preferences:**
${exampleUserPrefs}

**YOUR REQUIRED OUTPUT FORMAT:**
${exampleOutput}
---

Now, based on all of the above, generate the content for the user's request.
`;

  return metaPrompt;
};

/**
 * Generates a list of topic ideas based on user-defined criteria.
 * @param preferences - The user's topic generation settings.
 * @returns An array of topic ideas, each with a headline and description.
 */
export const generateTopicIdeas = async (preferences: TopicPreferences): Promise<TopicIdea[]> => {
  const { industry, audience, angle, hook, numIdeas } = preferences;
  const prompt = `You are a creative content strategist and marketing expert. Your task is to generate ${numIdeas} content topic ideas for a specific niche. For each idea, provide a compelling, click-worthy headline and a short 1-2 sentence description explaining the topic.

  **Instructions:**
  - **Industry/Niche:** ${industry}
  - **Target Audience:** ${audience}
  - **Content Angle:** ${angle}
  - **Engagement Hook:** ${hook}
  - **Output Format:** You must provide your response as a JSON array, where each object has two keys: "headline" and "description". Do not include any other text or markdown formatting.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            headline: {
              type: Type.STRING,
              description: "The compelling, click-worthy headline for the content idea."
            },
            description: {
              type: Type.STRING,
              description: "A brief, 1-2 sentence summary of what the content would be about."
            }
          },
          required: ["headline", "description"]
        }
      }
    }
  });

  const jsonText = response.text.trim();
  return JSON.parse(jsonText);
};

/**
 * Creates and returns a new chat session with a specified system instruction.
 * @param systemInstruction - The instruction that defines the AI's role and behavior.
 * @returns A new Chat instance.
 */
export const startChatSession = (systemInstruction: string): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: { systemInstruction }
  });
};
