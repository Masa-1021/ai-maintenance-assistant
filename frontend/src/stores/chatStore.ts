import { create } from 'zustand';
import type { ChatSession, ChatMessage, ExtractedInfo } from 'shared';

interface ChatState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  extractedInfo: ExtractedInfo | null;
  isLoading: boolean;
  isSending: boolean;
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setExtractedInfo: (info: ExtractedInfo | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSending: (sending: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  extractedInfo: null,
  isLoading: false,
  isSending: false,

  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setExtractedInfo: (info) => set({ extractedInfo: info }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsSending: (sending) => set({ isSending: sending }),
  reset: () =>
    set({
      currentSession: null,
      messages: [],
      extractedInfo: null,
      isLoading: false,
      isSending: false,
    }),
}));
