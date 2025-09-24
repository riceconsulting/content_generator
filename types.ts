
export interface DropdownOption {
  value: string;
  label: string;
}

export type ReferenceType = 'none' | 'any' | 'professional';

export interface ContentPreferences {
  topic: string;
  platform: string;
  tone: string;
  wordCount: string;
  generateHashtags: boolean;
  referenceType: ReferenceType;
  writerPersona: string;
  promotionLevel: string;
  creatorName: string;
  customNotes: string;
}

export interface TopicPreferences {
  industry: string;
  audience: string;
  angle: string;
  hook: string;
  numIdeas: string;
}

export interface TopicIdea {
  headline: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  hashtags?: string;
  references?: string;
  wordCount?: number;
}
