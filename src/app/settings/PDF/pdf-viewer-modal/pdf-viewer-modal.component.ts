import {
  Component, Input, OnDestroy, ChangeDetectorRef
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ServiceService } from '../../settings.service';

interface DocumentPage {
  documentPageId: number;
  documentId:     number;
  pageNumber:     number;
  extractedText:  string;
  statusId:       number;
  user_name:      string;
  createdDate:    string;
}

@Component({
  selector: 'app-pdf-viewer-modal',
  templateUrl: './pdf-viewer-modal.component.html',
  styleUrls:  ['./pdf-viewer-modal.component.scss']
})
export class PdfViewerModalComponent implements OnDestroy {

  @Input() roleId: number = 0;

  // Modal state
  isOpen:       boolean         = false;
  isLoading:    boolean         = false;
  isGenerating: boolean         = false;
  errorMsg:     string          = '';

  // Document data
  pages:        DocumentPage[]  = [];
  documentName: string          = '';
  documentId:   number          = 0;
  approvedBy:   number          = 0;
  userId:       number          = 0;

  // PDF preview
  pdfBlobUrl:   string          = '';
  safePdfUrl:   SafeResourceUrl = '';

  // Suggestion state
  showSuggestion:    boolean = false;
  suggestionText:    string  = '';
  suggestionLoading: boolean = false;
  suggestionSuccess: boolean = false;
  suggestionError:   string  = '';

  constructor(
    private service:   ServiceService,
    private cdr:       ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  // Called from parent: pdfModal.open(doc, userId)
  open(doc: { documentId: number; documentName: string; approvedBy: number }, userId: number = 0): void {
    this.documentId   = doc.documentId;
    this.documentName = doc.documentName;
    this.approvedBy   = doc.approvedBy || 0;
    this.userId       = userId;
    this.pages        = [];
    this.pdfBlobUrl   = '';
    this.safePdfUrl   = '';
    this.errorMsg     = '';
    this.isOpen       = true;
    this.showSuggestion = false;
    this.loadPages();
  }

  close(): void {
    this.isOpen = false;
    this.revokeBlobUrl();
  }

  loadPages(): void {
    this.isLoading = true;
    this.errorMsg  = '';
    this.service.getDocumentByDocumentName(this.documentId, 1, 1000).subscribe({
      next: (res: any) => {
        const list: DocumentPage[] = res?.data || res || [];
        this.pages = this.roleId === 5
          ? list.filter((p: DocumentPage) => p.statusId === 3)
          : list;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.generatePdf();
      },
      error: () => {
        this.errorMsg  = 'Failed to load document pages. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  async generatePdf(): Promise<void> {
    if (!this.pages.length) return;
    this.isGenerating = true;
    this.cdr.detectChanges();

    const { jsPDF } = await import('jspdf');
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mL = 20, mR = 20, mT = 30, mB = 18;
    const lineH = 6, maxW = pageW - mL - mR, maxY = pageH - mB;
    const total = this.pages.length;
    const docName = this.documentName;

    const header = (n: number) => {
      doc.setFillColor(15, 30, 56);
      doc.rect(0, 0, pageW, 14, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.setTextColor(245, 166, 35);
      doc.text(docName, mL, 9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(185, 195, 215);
      doc.text(`Page ${n} of ${total}`, pageW - mR, 9.5, { align: 'right' });
      doc.setDrawColor(210, 218, 232); doc.setLineWidth(0.3);
      doc.line(mL, mT - 5, pageW - mR, mT - 5);
    };

    const footer = (n: number) => {
      doc.setDrawColor(210, 218, 232); doc.setLineWidth(0.3);
      doc.line(mL, pageH - 12, pageW - mR, pageH - 12);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.setTextColor(155, 165, 185);
      doc.text(`${docName}  •  Generated ${new Date().toLocaleDateString('en-IN')}`, mL, pageH - 7);
      doc.text(`${n} / ${total}`, pageW - mR, pageH - 7, { align: 'right' });
    };

    this.pages.forEach((page, idx) => {
      if (idx > 0) doc.addPage();
      header(idx + 1); footer(idx + 1);
      let y = mT;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 30, 56);
      doc.text(`Page ${page.pageNumber}`, mL, y); y += 7;
      doc.setDrawColor(220, 226, 238); doc.setLineWidth(0.35);
      doc.line(mL, y - 1, pageW - mR, y - 1); y += 4;
      doc.setFont('times', 'normal'); doc.setFontSize(11.5); doc.setTextColor(26, 34, 52);
      const paras = (page.extractedText || '').split('\n');
      outer: for (const para of paras) {
        if (!para.trim()) { y += lineH * 0.45; if (y >= maxY) break; continue; }
        const lines: string[] = doc.splitTextToSize(para, maxW);
        for (const line of lines) {
          if (y + lineH > maxY) {
            doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(170, 178, 196);
            doc.text('[Text continues — see next page]', mL, maxY - 1); break outer;
          }
          doc.text(line, mL, y); y += lineH;
        }
      }
    });

    this.revokeBlobUrl();
    const blob      = doc.output('blob');
    this.pdfBlobUrl = URL.createObjectURL(blob);
    this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
    this.isGenerating = false;
    this.cdr.detectChanges();
  }

  async downloadPdf(): Promise<void> {
    if (!this.pages.length) return;
    const { jsPDF } = await import('jspdf');
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mL = 20, mR = 20, mT = 30, mB = 18;
    const lineH = 6, maxW = pageW - mL - mR, maxY = pageH - mB;
    const total = this.pages.length;
    const docName = this.documentName;

    const header = (n: number) => {
      doc.setFillColor(15, 30, 56); doc.rect(0, 0, pageW, 14, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(245, 166, 35);
      doc.text(docName, mL, 9.5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(185, 195, 215);
      doc.text(`Page ${n} of ${total}`, pageW - mR, 9.5, { align: 'right' });
    };
    const footer = (n: number) => {
      doc.setDrawColor(210, 218, 232); doc.setLineWidth(0.3);
      doc.line(mL, pageH - 12, pageW - mR, pageH - 12);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(155, 165, 185);
      doc.text(`${docName}  •  ${new Date().toLocaleDateString('en-IN')}`, mL, pageH - 7);
      doc.text(`${n} / ${total}`, pageW - mR, pageH - 7, { align: 'right' });
    };

    this.pages.forEach((page, idx) => {
      if (idx > 0) doc.addPage();
      header(idx + 1); footer(idx + 1);
      let y = mT;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 30, 56);
      doc.text(`Page ${page.pageNumber}`, mL, y); y += 7;
      doc.setDrawColor(220, 226, 238); doc.setLineWidth(0.35);
      doc.line(mL, y - 1, pageW - mR, y - 1); y += 4;
      doc.setFont('times', 'normal'); doc.setFontSize(11.5); doc.setTextColor(26, 34, 52);
      const paras = (page.extractedText || '').split('\n');
      outer: for (const para of paras) {
        if (!para.trim()) { y += lineH * 0.45; continue; }
        const lines: string[] = doc.splitTextToSize(para, maxW);
        for (const line of lines) { if (y + lineH > maxY) break outer; doc.text(line, mL, y); y += lineH; }
      }
    });

    doc.save(`${docName.replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf`);
  }

  openSuggestion(): void {
    this.suggestionText = ''; this.suggestionError = ''; this.suggestionSuccess = false;
    this.showSuggestion = true;
  }
  closeSuggestion(): void { this.showSuggestion = false; }

  // submitSuggestion(): void {
  //   if (!this.suggestionText.trim()) { this.suggestionError = 'Please write a suggestion.'; return; }
  //   this.suggestionLoading = true; this.suggestionError = '';
  //   const payload = {
  //     documentId: this.documentId, documentName: this.documentName,
  //     suggestionText: this.suggestionText.trim(),
  //     suggestedBy: this.userId, approvedBy: this.approvedBy,
  //     createdDate: new Date().toISOString()
  //   };
  //   this.service.saveSuggestion(payload).subscribe({
  //     next: () => { this.suggestionLoading = false; this.suggestionSuccess = true; setTimeout(() => this.closeSuggestion(), 2200); },
  //     error: () => { this.suggestionLoading = false; this.suggestionError = 'Failed to send. Please try again.'; }
  //   });
  // }

  private revokeBlobUrl(): void {
    if (this.pdfBlobUrl) { URL.revokeObjectURL(this.pdfBlobUrl); this.pdfBlobUrl = ''; }
  }

  ngOnDestroy(): void { this.revokeBlobUrl(); }
}