import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { AIAssistant } from "@/components/AIAssistant";
import { PDFViewer } from "@/components/PDFViewer";
import { useSessionStore } from "@/store/sessionStore";
import { getPDFPage, uploadPDF } from "@/lib/api";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace · SparshVaani" },
      { name: "description", content: "Voice-controlled AI workspace for reading PDFs." },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const pdfSessionId = useSessionStore((s) => s.pdfSessionId);
  const pdfFilename = useSessionStore((s) => s.pdfFilename);
  const pdfSource = useSessionStore((s) => s.pdfSource);
  const totalPages = useSessionStore((s) => s.totalPages);
  const currentPage = useSessionStore((s) => s.currentPage);
  const setCurrentPage = useSessionStore((s) => s.setCurrentPage);
  const nextPage = useSessionStore((s) => s.nextPage);

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
      .catch(() => { if (!cancelled) setCurrentPageText(""); });
    return () => { cancelled = true; };
  }, [pdfSessionId, currentPage]);

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
          pdfSource={pdfSource}
          pdfFilename={pdfFilename}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </AppShell>
  );
}
