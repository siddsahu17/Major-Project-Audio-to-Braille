/**
 * PDFDocument — lazy-loaded so it never executes during SSR.
 * Imported only via React.lazy() from PDFViewer.tsx.
 */
import { pdfjs, Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Use CDN worker matching installed pdfjs-dist version — avoids SSR bundling issues
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface Props {
  file: File | string;
  currentPage: number;
  zoom: number;
}

export default function PDFDocument({ file, currentPage, zoom }: Props) {
  return (
    <Document
      file={file}
      loading={
        <div className="size-full grid place-items-center text-muted-foreground font-mono text-xs">
          Loading PDF…
        </div>
      }
      error={
        <div className="size-full grid place-items-center text-red-400 font-mono text-xs">
          Failed to load PDF
        </div>
      }
    >
      <Page
        pageNumber={currentPage}
        width={Math.min(zoom * 6, 780)}
        renderTextLayer={true}
        renderAnnotationLayer={false}
        loading={null}
      />
    </Document>
  );
}
