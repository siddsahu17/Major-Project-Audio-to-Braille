import { create } from "zustand";

export interface Message {
  role: "user" | "assistant";
  text: string;
}

interface SessionState {
  pdfSessionId: string | null;
  totalPages: number;
  currentPage: number;
  pdfFile: File | null;
  messages: Message[];
  setPdfSession: (id: string, total: number, file: File) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  appendMessage: (msg: Message) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  pdfSessionId: null,
  totalPages: 0,
  currentPage: 1,
  pdfFile: null,
  messages: [],

  setPdfSession: (id, total, file) =>
    set({ pdfSessionId: id, totalPages: total, pdfFile: file, currentPage: 1, messages: [] }),

  setCurrentPage: (page) => set({ currentPage: page }),

  nextPage: () =>
    set((s) => ({ currentPage: Math.min(s.currentPage + 1, s.totalPages) })),

  prevPage: () =>
    set((s) => ({ currentPage: Math.max(s.currentPage - 1, 1) })),

  appendMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  clearSession: () =>
    set({
      pdfSessionId: null,
      totalPages: 0,
      currentPage: 1,
      pdfFile: null,
      messages: [],
    }),
}));
