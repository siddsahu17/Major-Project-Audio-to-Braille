import React from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

interface Props {
  file: File;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const PDFViewer: React.FC<Props> = ({
  file,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="pdf-viewer" role="region" aria-label="PDF Document">
      <div className="pdf-viewer__nav">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="sv-btn sv-btn--sm"
        >
          ← Prev
        </button>
        <span
          aria-live="polite"
          aria-atomic="true"
          className="pdf-viewer__page-info"
        >
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="sv-btn sv-btn--sm"
        >
          Next →
        </button>
      </div>
      <div className="pdf-viewer__canvas">
        <Document
          file={file}
          onLoadError={(e) => console.error("PDF load error:", e)}
          aria-label="PDF content"
        >
          <Page
            pageNumber={currentPage}
            width={Math.min(window.innerWidth - 64, 700)}
            renderTextLayer={true}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
};
