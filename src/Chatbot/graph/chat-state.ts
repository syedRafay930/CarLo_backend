import { Annotation } from '@langchain/langgraph';

export type ChatRole = 'user' | 'assistant';

export interface ChatHistoryTurn {
  role: ChatRole;
  content: string;
}

/** Aligns with the requested LangGraph state contract */
export interface ChatState {
  userMessage: string;
  userEmail: string;
  conversationHistory: ChatHistoryTurn[];
  intent: string;
  toolKey: string;
  toolInput: Record<string, unknown>;
  toolOutput: unknown;
  missingFields: string[];
  finalResponse: string;
}

export const ChatStateAnnotation = Annotation.Root({
  userMessage: Annotation<string>(),
  userEmail: Annotation<string>(),
  conversationHistory: Annotation<ChatHistoryTurn[]>(),
  intent: Annotation<string>(),
  toolKey: Annotation<string>(),
  toolInput: Annotation<any>(),
  toolOutput: Annotation<any>(),
  missingFields: Annotation<string[]>(),
  finalResponse: Annotation<string>(),
});
