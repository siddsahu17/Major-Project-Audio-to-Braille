import { create } from "zustand";

export interface Message {
  role: "user" | "tutor";
  text: string;
}

interface SessionState {
  // PDF session
  pdfSessionId: string | null;
  totalPages: number;
  currentPage: number;
  pdfFile: File | null;
  pdfFilename: string;
  // Voice chapter session
  studentClass: number | null;
  currentPDF: string | null;
  pdfSource: string | null;
  // Conversation
  messages: Message[];
  // Actions
  setPdfSession: (id: string, total: number, file: File, filename: string) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  appendMessage: (msg: Message) => void;
  clearMessages: () => void;
  clearSession: () => void;
  setStudentClass: (cls: number | null) => void;
  loadChapter: (id: string, fileName: string, source: string, totalPages: number) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  pdfSessionId: null,
  totalPages: 0,
  currentPage: 1,
  pdfFile: null,
  pdfFilename: "",
  studentClass: null,
  currentPDF: null,
  pdfSource: null,
  messages: [],

  setPdfSession: (id, total, file, filename) => {
    const objectUrl = typeof URL !== "undefined" ? URL.createObjectURL(file) : null;
    // Revoke any previous object URL before replacing
    const prev = useSessionStore.getState().pdfSource;
    if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
    set({
      pdfSessionId: id,
      totalPages: total,
      pdfFile: file,
      pdfFilename: filename,
      pdfSource: objectUrl,
      currentPage: 1,
      messages: [],
    });
  },

  setCurrentPage: (page) => set({ currentPage: page }),

  nextPage: () =>
    set((s) => ({ currentPage: Math.min(s.currentPage + 1, s.totalPages) })),

  prevPage: () =>
    set((s) => ({ currentPage: Math.max(s.currentPage - 1, 1) })),

  appendMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  clearMessages: () => set({ messages: [] }),

  setStudentClass: (cls) => set({ studentClass: cls }),

  loadChapter: (id, fileName, source, totalPages) =>
    set({
      pdfSessionId: id,
      pdfFilename: fileName,
      pdfSource: source,
      totalPages: totalPages,
      currentPage: 1,
      currentPDF: fileName,
    }),

  clearSession: () => {
    const prev = useSessionStore.getState().pdfSource;
    if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
    set({
      pdfSessionId: null,
      totalPages: 0,
      currentPage: 1,
      pdfFile: null,
      pdfFilename: "",
      studentClass: null,
      currentPDF: null,
      pdfSource: null,
      messages: [],
    });
  },
}));
