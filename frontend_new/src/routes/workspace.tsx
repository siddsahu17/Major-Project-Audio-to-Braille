import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { AIAssistant } from "@/components/AIAssistant";
import { PDFViewer } from "@/components/PDFViewer";
import { useSessionStore } from "@/store/sessionStore";
import { getPDFPage } from "@/lib/api";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace · SparshVaani" },
      { name: "description", content: "Voice-controlled AI workspace for reading PDFs." },
    ],
  }),
  component: Workspace,
});

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Workspace() {
  const navigate = useNavigate();
  const pdfSessionId = useSessionStore((s) => s.pdfSessionId);
  const pdfFilename = useSessionStore((s) => s.pdfFilename);
  const pdfSource = useSessionStore((s) => s.pdfSource);
  const totalPages = useSessionStore((s) => s.totalPages);
  const currentPage = useSessionStore((s) => s.currentPage);
  const setCurrentPage = useSessionStore((s) => s.setCurrentPage);
  const nextPage = useSessionStore((s) => s.nextPage);
  const clearSession = useSessionStore((s) => s.clearSession);
  const appendMessage = useSessionStore((s) => s.appendMessage);

  const computedPdfSource = pdfSource || (pdfSessionId ? `${BASE_URL}/pdf/serve/${pdfSessionId}` : null);

  const [currentPageText, setCurrentPageText] = useState("");
  const [aiActive, setAiActive] = useState(false);

  useEffect(() => {
    if (!pdfSessionId) {
      setCurrentPageText("");
      return;
    }
    let cancelled = false;
    getPDFPage(pdfSessionId, currentPage)
      .then((r) => { if (!cancelled) setCurrentPageText(r.text); })
      .catch((err) => { 
        if (!cancelled) {
          setCurrentPageText("");
          const errMsg = err instanceof Error ? err.message : "";
          if (errMsg.includes("404") || errMsg.includes("expired") || errMsg.includes("not found")) {
            appendMessage({
              role: "tutor",
              text: "Session expired. Please ask me to reload the chapter.",
            });
            clearSession();
          }
        }
      });
    return () => { cancelled = true; };
  }, [pdfSessionId, currentPage, clearSession, appendMessage]);

  const handleStatusChange = useCallback((status: string) => {
    setAiActive(status !== "idle");
  }, []);

  return (
    <AppShell fullBleed>
      {/* Fixed height container — prevents chat from expanding the page */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        <AIAssistant
          sessionId={pdfSessionId}
          currentPage={currentPage}
          totalPages={totalPages}
          currentPageText={currentPageText}
          onScrollDown={nextPage}
          onScrollToPage={setCurrentPage}
          onStatusChange={handleStatusChange}
        />
        <PDFViewer
          aiActive={aiActive}
          pdfSource={computedPdfSource}
          pdfFilename={pdfFilename}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </AppShell>
  );
}
