

import { GoogleGenAI, Chat, Type } from "@google/genai";
import { ContentPreferences, TopicPreferences, TopicIdea, ChatMessage } from '../types';

// This check is for robustness, assuming process.env.API_KEY is provided.
if (!process.env.API_KEY) {
  // In a real app, you might want to handle this more gracefully than throwing an error.
  // For this context, it ensures the developer knows the key is missing.
  console.warn("API_KEY environment variable not set. The app will not work without it.");
}

// Initialize the GoogleGenAI client with the API key.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Finds, vets, formats, and verifies relevant web sources using a multi-step process to ensure quality.
 * 1. Broad Search: Gathers a large pool of candidate sources using Google Search.
 * 2. AI Vetting: Uses an LLM call to act as a research assistant, selecting only the best sources.
 * 3. Formatting: Takes the high-quality, vetted sources and formats them in APA style.
 * 4. Verification & Correction: A final LLM call fact-checks the formatted citations, correcting URLs and cleaning up formatting.
 * @param preferences - The user's content generation settings.
 * @returns A formatted string of high-quality, verified sources in APA style, or a note explaining why none were found.
 */
export const findWebSources = async (preferences: ContentPreferences): Promise<string> => {
  const { topic, wordCount, referenceType } = preferences;

  if (referenceType === 'none') {
    return "";
  }

  // Determine the number of sources to find.
  const targetSourceCount = Math.max(2, Math.min(5, Math.ceil(parseInt(wordCount, 10) / 400)));
  // Ask for more sources initially to have a better pool for vetting.
  const initialSearchCount = Math.max(8, targetSourceCount * 2);

  try {
    // --- Step 1: Broad Search for Candidate Sources ---
    console.log(`Step 1: Searching for ${initialSearchCount} candidate sources for topic: "${topic}"`);
    const searchPrompt = `Find up to ${initialSearchCount} relevant and high-quality web sources for an article about "${topic}". Prioritize authoritative domains.`;

    const searchResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (!groundingChunks || groundingChunks.length === 0) {
      console.warn("Model did not return any grounding chunks from search.");
      return "(Note: An initial web search did not find any citable sources for this topic. The model will rely on its general knowledge.)";
    }

    const candidateSources = groundingChunks
      .map(chunk => ({
        title: chunk.web?.title || 'Untitled',
        url: chunk.web?.uri || '',
      }))
      .filter(source => {
        if (!source.url) return false;
        const isHttp = source.url.startsWith('http://') || source.url.startsWith('https://');
        const isNotInternal = !source.url.includes('vertexaisearch');
        return isHttp && isNotInternal;
      });

    if (candidateSources.length === 0) {
      console.warn("Google Search returned sources, but all were filtered out as invalid.");
      return "(Note: An initial web search did not find any citable sources for this topic. The model will rely on its general knowledge.)";
    }
    
    // --- Step 2: AI-Powered Vetting and Selection of Sources ---
    console.log(`Step 2: Vetting ${candidateSources.length} candidates to select the best ${targetSourceCount}.`);
    
    let vettingUserRequirement: string;
    if (referenceType === 'professional') {
        vettingUserRequirement = `The user specifically requested professional and academic sources. This is a strict requirement. Prioritize peer-reviewed journal articles, published scholarly books, official reports from government or major research institutions (e.g., NGOs, think tanks), and papers from top-tier academic conferences. Be very critical and reject sources that are blogs, news articles (unless from a highly reputable scientific journal source), or general informational websites.`;
    } else { // 'any'
        vettingUserRequirement = `The user requested any high-quality sources. Prioritize authoritative and well-researched articles. You should still reject sources that are low-quality, such as personal blogs, forums, or content farms. Reputable news organizations, established industry websites, and educational institutions are good candidates.`;
    }

    const vettingPrompt = `
# MISSION
You are an expert academic researcher with extremely high standards. Your mission is to evaluate a list of web sources for an article on the topic of "${topic}". You must select only sources that are **DIRECTLY AND SUBSTANTIALLY** about this specific topic.

# USER REQUIREMENT
${vettingUserRequirement}

# EVALUATION CRITERIA
- **Primary Criterion: Direct Relevance**: The source MUST be about "${topic}". General or foundational texts on a broader subject (e.g., a general book on Artificial Intelligence for a topic about a specific AI application) are NOT acceptable. The content must focus on the user's specific topic. If a source is only tangentially related, it must be rejected.
- **Authority & Trustworthiness**: Is the source from a reputable author or organization?
- **Quality**: Is the information well-researched and factual?
- **Recency**: Is the source up-to-date?

# LIST OF CANDIDATE SOURCES
${JSON.stringify(candidateSources)}

# YOUR TASK
Based on the strict criteria above, select the BEST ${targetSourceCount} sources.
**CRITICAL RULE:** If, after your review, you determine that NONE of the candidate sources are directly and substantially about "${topic}", you MUST return an empty JSON array \`[]\`. Do not include tangentially related sources just to provide a result.

Return your selection as a JSON array of objects. Your output MUST be only the JSON array.
`;

    const vettingResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: vettingPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        url: { type: Type.STRING }
                    },
                    required: ["title", "url"]
                }
            }
        }
    });
    
    const vettedSources: {title: string, url: string}[] = JSON.parse(vettingResponse.text.trim());

    if (vettedSources.length === 0) {
        console.warn("AI vetting process filtered out all candidate sources as not directly relevant.");
        // --- Generate a helpful note for the user about the niche topic ---
        const noteGenerationPrompt = `
# MISSION
You are a helpful research assistant. A search for high-quality, specific web sources for the topic "${topic}" yielded no direct results. Your task is to provide a brief, helpful note explaining why this might be the case and what the AI will do instead.

# REASONING
Consider the topic "${topic}". Common reasons for a lack of specific academic or professional sources include:
- The topic is very new or nascent.
- The topic is highly niche or specialized.
- The topic combines two disparate fields (e.g., technology and spirituality).
- The topic is more speculative or theoretical than heavily researched.

# YOUR TASK
1.  Based on your reasoning, write a 1-2 sentence note for the user.
2.  Start the note with "(Note: ".
3.  Conclude the note by stating that because no specific sources were found, the model will rely on its general knowledge.
4.  Do NOT invent or suggest any sources.
5.  Your output should be ONLY the note.

# EXAMPLE
- **Topic:** "The impact of quantum computing on ancient poetry interpretation"
- **Your Output:** (Note: High-quality academic sources specifically addressing the impact of quantum computing on ancient poetry are not yet available as this is a highly speculative and interdisciplinary field. The model will rely on its general knowledge to address the topic.)
`;
        const noteResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: noteGenerationPrompt,
        });
        return noteResponse.text.trim();
    }

    // --- Step 3: Extract and Format Vetted Sources into APA Style ---
    console.log(`Step 3: Formatting ${vettedSources.length} vetted sources into APA style.`);

    const formattingPrompt = `
# MISSION
You are a meticulous and accurate academic librarian. Your mission is to convert a list of web sources into a reference list in APA 7th edition style. Your top priority is accuracy. **You must not invent information.**

# GUIDING PRINCIPLES
1.  **NEVER ALTER THE URL:** You will be given a title and a URL. This URL is the ground truth. You MUST use the **exact, complete, and original URL** provided in the final citation. Do not shorten, clean, or create a new URL. This is the most important rule.
2.  **DO NOT INVENT AUTHORS OR DATES:**
    - Use the provided title for the work. Per APA 7 style for web pages, use sentence case for the title.
    - Try to determine the author and date from the title and URL.
    - If a specific author is not clear, use the organization/site name as the author (e.g., "Forbes" from a forbes.com URL).
    - If a specific date is not clear, you MUST use "(n.d.)".
    - It is better to have less information that is true than more information that is false.

# VETTED SOURCES
${JSON.stringify(vettedSources)}

# YOUR TASK
For each source, create a reference entry following APA 7th edition style for a webpage.
- **Example with Author:** Smith, J. (2023, January 15). The future of AI in marketing. Tech Insights. https://www.example.com/long-and-complex-url-path/to-article-123
- **Example with Organization:** World Health Organization. (2022). Global report on infectious diseases. https://www.who.int/news-room/fact-sheets/detail/ebola-virus-disease
- **Example with No Date:** HubSpot. (n.d.). The ultimate guide to content marketing. https://blog.hubspot.com/marketing/content-marketing

Your output must ONLY be the formatted reference list. Each entry must start on a new line. Do not use bullets or numbers.
`;

    const formattingResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattingPrompt,
    });
    
    const potentiallyIncorrectReferences = formattingResponse.text.trim();

    if (!potentiallyIncorrectReferences) {
      console.warn("Model did not return any formatted references from the formatting call. Falling back to a simple list.");
      return vettedSources.map(s => `${s.title}\n${s.url}`).join('\n\n');
    }

    // --- Step 4: Verification and Correction ---
    console.log(`Step 4: Verifying and correcting ${vettedSources.length} formatted references for accuracy.`);

    const verificationPrompt = `
# MISSION
You are a hyper-vigilant fact-checker and citation corrector. Your sole purpose is to ensure the accuracy of a generated reference list against a ground-truth list of sources. Your two main priorities are correcting URLs and removing markdown formatting.

# GROUND TRUTH SOURCES
This is the list of original, correct sources. The URLs here are 100% correct.
${JSON.stringify(vettedSources)}

# FORMATTED REFERENCE LIST (Needs Verification)
This is the list generated by another AI. It may contain incorrect URLs or unwanted markdown formatting (like asterisks for italics).
---
${potentiallyIncorrectReferences}
---

# YOUR TASK
1.  **VERIFY AND CORRECT URLs:** Go through the "FORMATTED REFERENCE LIST" entry by entry. For each entry, find the corresponding entry in the "GROUND TRUTH SOURCES" (match them by title). The URL in the formatted entry MUST BE **EXACTLY IDENTICAL** to the URL in the ground truth list. If it is different in any way (shortened, altered, contains extra path elements), you MUST replace it with the correct URL from the ground truth list.
2.  **REMOVE MARKDOWN:** The final output must be plain text. Remove any markdown formatting, specifically asterisks (\`*\`) or underscores (\`_\`) around titles that were used for italics.
3.  **PRESERVE EVERYTHING ELSE:** Do not change author names, dates, or titles unless they are egregiously wrong based on the ground truth source title. The primary focus is URL and markdown correction.

# EXAMPLE
- **Ground Truth:** { "title": "AI in Sports", "url": "https://www.example.com/real-article-path-123" }
- **Incorrect Formatted Entry:** Marr, B. (2023). *AI in Sports*. Forbes. https://www.forbes.com/marr2023
- **YOUR CORRECTED OUTPUT:** Marr, B. (2023). AI in Sports. Forbes. https://www.example.com/real-article-path-123

Output ONLY the corrected, final reference list. Each entry must be on a new line.
`;

    const verificationResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: verificationPrompt,
    });

    const finalReferences = verificationResponse.text.trim();

    if (!finalReferences) {
        console.warn("Verification step failed to produce output. Falling back to the pre-verified list and cleaning it.");
        return potentiallyIncorrectReferences.replace(/[*_]/g, ''); // At least remove markdown
    }
  
    return finalReferences;

  } catch (error) {
    console.error("Error during the multi-step web source finding process:", error);
    throw new Error("Failed to find and verify reliable sources. Please try adjusting your topic or try again later.");
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
  const hasValidSources = shouldIncludeReferences && sources && !sources.startsWith("There was an error");
  const isNote = hasValidSources && sources.startsWith("(Note:");


  if (hasValidSources && !isNote) {
      sourceInstruction = `
# MANDATORY SOURCES
- You MUST synthesize information *from the provided sources* to construct your response.
- Do NOT include information that cannot be directly backed up by these sources.
- Weave the information from the sources together into a coherent, original piece of content. Do not simply copy-paste sections.
- After writing the main content, you MUST reproduce the exact list of sources provided below under the "---References---" separator.

**Sources List:**
${sources}
`;
  } else if (shouldIncludeReferences) {
      // This is a fallback instruction if the source finding step failed or returned a note.
      sourceInstruction = `
# REFERENCES
- An automated search for sources was conducted.
- ${isNote ? sources : 'No high-quality references matching the topic were found.'}
- You must rely on your general knowledge. When you do, please state that external sources could not be verified for this topic.
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
- **If you have a list of sources, format citations in APA style, and you MUST write down the full URL.**
- **If you have a note about sources, reproduce that note here.**`;
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

/**
 * Generates a prompt for refining existing content based on user feedback.
 * @param lastModelMessage - The previous message from the model containing the content to refine.
 * @param refinementInstruction - The user's instruction for how to change the content.
 * @returns A string containing the optimized prompt for refinement.
 */
export const generateRefinementPrompt = (lastModelMessage: ChatMessage, refinementInstruction: string): string => {
  const { content, hashtags, references } = lastModelMessage;

  // Reconstruct the original full text for context.
  // This ensures the model sees the content exactly as it was structured before.
  let originalFullText = content;
  if (references) {
    originalFullText += `\n\n---References---\n${references}`;
  }
  if (hashtags) {
    originalFullText += `\n\n---HASHTAGS---\n${hashtags}`;
  }
  
  const prompt = `
# MISSION
You are an expert content editor. Your task is to refine and rewrite a piece of content based on a user's specific instruction. You must adhere to the new instruction while preserving the original intent and any formatting elements (like separators for references or hashtags) unless explicitly told to change them.

**This is a refinement, not a complete regeneration.** Maintain the core ideas, structure, and tone of the original piece unless the user's instruction explicitly asks to change them. For example, if the user says "make it funnier," you should edit the existing text to add humor, not write a completely new article on the same topic.

# ORIGINAL CONTENT
Here is the content you need to refine:
---
${originalFullText.trim()}
---

# USER'S REFINEMENT INSTRUCTION
"${refinementInstruction}"

# YOUR TASK
1.  Carefully analyze the **ORIGINAL CONTENT** and the **USER'S REFINEMENT INSTRUCTION**.
2.  Rewrite the content to seamlessly integrate the user's feedback. Do not just add or append text. The changes should feel natural.
3.  Preserve the output structure. If the original content had "---References---" or "---HASHTAGS---" sections, you MUST include them in your new response, even if the content of those sections changes.
4.  After rewriting, you MUST provide an estimated word count for the main content part in this format on the very last line:
    **Word Count (estimated): [number]**
5.  Output ONLY the rewritten content, references, and hashtags in the correct format. Do not add any of your own commentary, introductions, sign-offs, or other conversational text.
`;

  return prompt.trim();
};