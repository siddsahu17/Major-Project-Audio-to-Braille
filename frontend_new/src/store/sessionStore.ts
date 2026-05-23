import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Message {
  role: "user" | "tutor";
  text: string;
}

interface SessionState {
  // PDF session
  pdfSessionId: string | null;
  totalPages: number;
  currentPage: number;
  pdfFilename: string;
  // Voice chapter session
  studentClass: number | null;
  currentPDF: string | null;
  pdfSource: string | null;
  // Conversation
  messages: Message[];
  
  // NEW auto loaded chapter state
  autoLoadedChapter: null | {
    filename: string;
    class_number: number;
    chapter_title: string;
    session_id: string;
  };
  
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
  setAutoLoadedChapter: (chapter: null | { filename: string; class_number: number; chapter_title: string; session_id: string }) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      pdfSessionId: null,
      totalPages: 0,
      currentPage: 1,
      pdfFilename: "",
      studentClass: null,
      currentPDF: null,
      pdfSource: null,
      messages: [],
      autoLoadedChapter: null,

      setPdfSession: (id, total, file, filename) => {
        const objectUrl = typeof URL !== "undefined" ? URL.createObjectURL(file) : null;
        const prev = useSessionStore.getState().pdfSource;
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        set({
          pdfSessionId: id,
          totalPages: total,
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

      setAutoLoadedChapter: (chapter) => set({ autoLoadedChapter: chapter }),

      clearSession: () => {
        const prev = useSessionStore.getState().pdfSource;
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        set({
          pdfSessionId: null,
          totalPages: 0,
          currentPage: 1,
          pdfFilename: "",
          studentClass: null,
          currentPDF: null,
          pdfSource: null,
          messages: [],
          autoLoadedChapter: null,
        });
      },
    }),
    {
      name: "sparshvaani-session",
      storage: createJSONStorage(() => sessionStorage),
      // Exclude blob URLs and File objects — not serializable
      partialize: (s) => ({
        pdfSessionId: s.pdfSessionId,
        totalPages: s.totalPages,
        currentPage: s.currentPage,
        pdfFilename: s.pdfFilename,
        studentClass: s.studentClass,
        currentPDF: s.currentPDF,
        messages: s.messages,
        autoLoadedChapter: s.autoLoadedChapter,
        // pdfSource excluded: blob URLs don't survive serialization
      }),
    },
  ),
);
