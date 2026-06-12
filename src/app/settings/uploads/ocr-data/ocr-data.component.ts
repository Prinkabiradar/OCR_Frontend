import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ServiceService } from '../../settings.service';
import { Options } from 'select2';
import { ModalConfig } from 'src/app/_metronic/partials';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { OcrPageModalComponent } from '../ocr-page-modal/ocr-page-modal.component';
import { environment } from 'src/environments/environment';
import { EventEmitter, Output } from '@angular/core';
import Swal from 'sweetalert2';
import { SharedDataService } from '../../shared-data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ocr-data',
  templateUrl: './ocr-data.component.html',
  styleUrls: ['./ocr-data.component.scss'],
})
export class OcrDataComponent implements OnInit {
  // ── STEP 1: Dropdown ───────────────────────────────────────
  public documentTypeoptions: Options = {};
  public documentTypedata: Array<{ id: string; text: string }> = [];
  documentTypesearchTerm: string = '';
  selectedTypeId: number | null = 0;

  editedTexts: { [id: number]: string } = {};
  savingRows: { [id: number]: boolean } = {};
  savedRows: { [id: number]: boolean } = {};
  savingAll: boolean = false;
  saveAllSuccess: boolean = false;

  pageList: any[] = [];
  currentLockedDocId: number | null = null;
  loadingDocId: number | null = null;

  totalRecords: number = 0;
  totalPages: number = 0;

  currentUserId: number = 0;
  roleId: number = 0;
  // ── STEP 2: Document List + Pagination ────────────────────
  documentList: any[] = [];
  loadingDocs = false;
  docsError = '';
  docCurrentPage: number = 1;
  docPageSize: number = 10;
  searchCriteria: string = '';
  searchBy: string = '';
  searchTimeout: any;

  showAdvancedSearchModal = false;
  advancedUsers: Array<{ id: string; text: string }> = [];
  selectedUserId: string = '';
  advancedFromDate: string = '';
  advancedToDate: string = '';
  advancedStatusId: string = '';
  isAdvancedFilterApplied = false;
  private allLoadedDocuments: any[] = [];

  statusOptions = [
    { id: '', text: 'All Status' },
    { id: '0', text: 'Pending' },
    { id: '1', text: 'Checked' },
    { id: '2', text: 'Verified' },
    { id: '3', text: 'Approved' },
    { id: '4', text: 'Partially checked' },
    { id: '5', text: 'Partially verified' },
    { id: '6', text: 'Partially Approved' },
    { id: '7', text: 'Rejected' },
    { id: '8', text: 'Suggestion' },
  ];

  loadingPdfIds : Set<number> = new Set();
  loadingWordIds: Set<number> = new Set();

  @Output() statusUpdated = new EventEmitter<any>();
  // ── Modal ──────────────────────────────────────────────────
  @ViewChild('ocrModal') modalComponent!: OcrPageModalComponent;
  private modalRef: NgbModalRef;
  loadingPages = false;

  modalConfig: ModalConfig = {
    modalTitle: 'Sacred Pages',
    dismissButtonLabel: 'Close',
    closeButtonLabel: 'Close',
  };

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
  constructor(
    private service: ServiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private _shareds: SharedDataService,
  ) {}

  ngOnInit(): void {
    this.documentTypeDropdown();
    this.loadDocuments();
    const lsValue = localStorage.getItem(this.authLocalStorageToken);
    const userData = lsValue ? JSON.parse(lsValue) : null;
    this.currentUserId = userData?.id ?? 0;
    this.roleId = userData?.roleId ?? 0;
  }
  isPdfLoading(documentId: number): boolean {
    return this.loadingPdfIds.has(documentId);
  }

  isWordLoading(documentId: number): boolean {
    return this.loadingWordIds.has(documentId);
  }
  // STEP 1 — load document types into dropdown
  documentTypeDropdown(): void {
    this.service
      .dropdownAll(this.documentTypesearchTerm, '1', '3', '0')
      .subscribe({
        next: (response) => {
          this.documentTypedata = response.map((item: any) => ({
            id: item.id.toString(),
            text: item.text,
          }));
          this.documentTypeoptions = {
            data: this.documentTypedata,
            width: '100%',
            placeholder: 'Select Document Type',
            allowClear: true,
          };
          this.cdr.detectChanges();
        },
        error: (error) =>
          console.error('Error fetching document types:', error),
      });
  }

  // STEP 2 — dropdown changed → reset and load doc list page 1
  onTypeChange(event: any): void {
    this.selectedTypeId = event ? Number(event) : 0;

    this.documentList = [];
    this.docsError = '';
    this.docCurrentPage = 1;

    this.loadDocuments();
  }


  clearDropdown(): void {
    this.selectedTypeId = 0;
    this.docCurrentPage = 1;
    this.loadDocuments();
  }

  openAdvancedSearch(): void {
    this.showAdvancedSearchModal = true;
    this.loadAdvancedUsers();
    this.cdr.detectChanges();
  }

  closeAdvancedSearch(): void {
    this.showAdvancedSearchModal = false;
    this.cdr.detectChanges();
  }

  loadAdvancedUsers(): void {
    this.service.dropdownAll('', '1', '8', '0').subscribe({
      next: (response: any) => {
        this.advancedUsers = (response || []).map((item: any) => ({
          id: item.id?.toString() ?? '',
          text: item.text ?? item.name ?? item.username ?? '',
        }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading user dropdown:', err);
      },
    });
  }

  applyAdvancedSearch(): void {
    this.isAdvancedFilterApplied = !!(
      this.selectedUserId ||
      this.advancedFromDate ||
      this.advancedToDate ||
      this.advancedStatusId
    );
    this.docCurrentPage = 1;
    this.showAdvancedSearchModal = false;
    this.loadDocuments();
  }

  clearAdvancedSearch(): void {
    this.selectedUserId = '';
    this.advancedFromDate = '';
    this.advancedToDate = '';
    this.advancedStatusId = '';
    this.isAdvancedFilterApplied = false;
    this.docCurrentPage = 1;
    this.loadDocuments();
  }

  onFromDateChange(date: string): void {
    this.advancedFromDate = date;
    if (date && !this.advancedToDate) {
      this.advancedToDate = date;
    }
  }

  private getSelectedUserName(): string {
    return (
      this.advancedUsers.find((u) => u.id === this.selectedUserId)?.text || ''
    ).toLowerCase();
  }

  private compareDateRange(value: any, fromDate: string, toDate: string): boolean {
    if (!fromDate && !toDate) {
      return true;
    }

    const dateValue = value ? new Date(value) : null;
    if (!dateValue || isNaN(dateValue.getTime())) {
      return false;
    }

    if (fromDate) {
      const start = new Date(fromDate);
      if (dateValue < start) {
        return false;
      }
    }

    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (dateValue > end) {
        return false;
      }
    }

    return true;
  }

  private applyAdvancedFiltersToDocs(docs: any[]): any[] {
    const userName = this.selectedUserId ? this.getSelectedUserName() : '';

    return docs.filter((doc) => {
      const statusId = Number(
        doc.statusId ?? doc.statusid ?? doc.StatusId ?? -1,
      );
      const createdByName = (
        doc.createdByName ?? doc.createdby_name ?? doc.CreatedByName ?? ''
      ).toString().toLowerCase();
      const createdDate =
        doc.createdDate ?? doc.createddate ?? doc.CreatedDate ??
        doc.updatedDate ?? doc.updateddate ?? doc.UpdatedDate;

      if (this.advancedStatusId && statusId !== Number(this.advancedStatusId)) {
        return false;
      }

      if (userName && !createdByName.includes(userName)) {
        return false;
      }

      if (
        !this.compareDateRange(createdDate, this.advancedFromDate, this.advancedToDate)
      ) {
        return false;
      }

      return true;
    });
  }

  private paginateDocs(docs: any[]): any[] {
    const start = (this.docCurrentPage - 1) * this.docPageSize;
    return docs.slice(start, start + this.docPageSize);
  }

  isDirty(item: any): boolean {
    return this.editedTexts[item.DocumentPageId] !== item.ExtractedText;
  }
  onTextChange(item: any, value: string): void {
    this.editedTexts[item.DocumentPageId] = value;
    this.savedRows[item.DocumentPageId] = false;
    this.saveAllSuccess = false;
    this.cdr.detectChanges();
  }
  get hasDirtyRows(): boolean {
    return this.pageList.some((item) => this.isDirty(item));
  }

  canView(doc: any): boolean {
    switch (this.roleId) {
      case 1:
      case 2:
      case 3:
      case 4:
        return true;
      default:
        return false;
    }
  }
  getStatusLabel(statusId: number): string {
    switch (statusId) {
      case 0:
        return 'Pending';
      case 4:
        return 'Partially checked';
      case 1:
        return 'Checked';
      case 5:
        return 'Partially verified';
      case 2:
        return 'Verified';
      case 6:
        return 'Partially Approved';
      case 3:
        return 'Approved';
      case 7:
        return 'Rejected';
      case 8:
        return 'Suggestion';
      default:
        return `Reviewed (${statusId})`;
    }
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 0:
        return 'badge-red';

      case 1:
      case 4:
        return 'badge-orange';

      case 2:
      case 5:
        return 'badge-yellow';

      case 3:
      case 6:
        return 'badge-green';

      case 7:
        return 'badge-rejected';

      case 8:
        return 'badge-suggestion';

      default:
        return 'badge-default';
    }
  }
  // fetch document list — 0-based offset
  loadDocuments(): void {
    this.loadingDocs = true;
    this.docsError = '';

    const hasAdvancedFilter = !!(
      this.selectedUserId ||
      this.advancedFromDate ||
      this.advancedToDate ||
      this.advancedStatusId
    );

    const startIndex = hasAdvancedFilter
      ? 0
      : (this.docCurrentPage - 1) * this.docPageSize;
    const requestPageSize = hasAdvancedFilter ? 100000 : this.docPageSize;

    const lsValue = localStorage.getItem(this.authLocalStorageToken);
    const userData = lsValue ? JSON.parse(lsValue) : null;
    this.roleId = userData?.roleId ?? 0;

    this.service
      .getDocumentsByTypeId(
        this.selectedTypeId ?? 0,
        startIndex,
        requestPageSize,
        this.roleId,
        this.searchBy,
        this.searchCriteria,
      )
      .subscribe({
        next: (res: any) => {
          const raw: any[] = Array.isArray(res)
            ? res
            : (res?.data ?? res?.Data ?? []);

          const allDocs = raw.map((d: any) => ({
            documentId: d.documentid ?? d.documentId ?? d.DocumentId,
            documentName: d.documentname ?? d.documentName ?? d.DocumentName,
            statusId: d.statusid ?? d.statusId ?? d.StatusId,
            createdByName:
              d.createdby_name ?? d.createdByName ?? d.CreatedByName,
            updatedByName:
              d.updatedby_name ?? d.updatedByName ?? d.UpdatedByName,
            updatedDate:
              d.updateddate ?? d.updatedDate ?? d.UpdatedDate,
            createdDate:
              d.createddate ?? d.createdDate ?? d.CreatedDate,
            approvedByName:
              d.approvedby_name ?? d.approvedByName ?? d.ApprovedByName,
            approvedDate:
              d.approveddate ?? d.approvedDate ?? d.ApprovedDate,
            lockedBy: d.lockedby ?? d.lockedBy ?? d.LockedBy,
            lockedByName:
              d.lockedby_name ?? d.lockedByName ?? d.LockedByName,
          }));

          if (hasAdvancedFilter) {
            this.allLoadedDocuments = allDocs;
            const filteredDocs = this.applyAdvancedFiltersToDocs(this.allLoadedDocuments);
            this.totalRecords = filteredDocs.length;
            this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.docPageSize));
            if (this.docCurrentPage > this.totalPages) {
              this.docCurrentPage = 1;
            }
            this.documentList = this.paginateDocs(filteredDocs);
          } else {
            this.documentList = allDocs;
            this.totalRecords = raw.length > 0 ? raw[0].totalrecords : 0;
            this.totalPages = Math.ceil(this.totalRecords / this.docPageSize);
          }

          this.loadingDocs = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Failed to load documents:', err);
          this.docsError = 'Could not load documents. Please try again.';
          this.loadingDocs = false;
          this.cdr.detectChanges();
        },
      });
  }
  goToAddDocument(): void {
    this._shareds.clearOCRData();
    this.router.navigate(['/settings/add-image']);
  }

  // Doc list pagination
  get docHasPrevious(): boolean {
    return this.docCurrentPage > 1;
  }
  get docHasNext(): boolean {
    return this.docCurrentPage < this.totalPages;
  }

  goToDocPrevious(): void {
    if (!this.docHasPrevious) return;
    this.docCurrentPage--;
    this.loadDocuments();
  }

  goToDocNext(): void {
    if (!this.docHasNext) return;
    this.docCurrentPage++;
    this.loadDocuments();
  }

  onDocPageChange(page: number): void {
    this.docCurrentPage = page;
    this.loadDocuments();
  }

  onDocPageSizeChange(size: any): void {
    this.docPageSize = size ? Number(size) : 10;
    this.docCurrentPage = 1;
    this.loadDocuments();
  }
  // onSearchChange(): void {
  //   const activeEl = document.activeElement as HTMLElement;
  //   this.docCurrentPage = 1;
  //   this.loadDocuments();
  //   setTimeout(() => activeEl?.focus(), 0);
  // }
  onSearchChange(value: string): void {
    this.searchCriteria = value;
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.docCurrentPage = 1;
      this.docCurrentPage = 1;
      this.loadDocuments();
    }, 500);
  }
  // STEP 3 — click View → pass documentId to modal and open it
  async onDocumentClick(doc: any): Promise<void> {
    const userId = this.currentUserId;
    this.loadingDocId = doc.documentId;

    this.service.manageLock(doc.documentId, userId, 'LOCK').subscribe({
      next: async () => {
        this.currentLockedDocId = doc.documentId;

        this.modalComponent.documentId = doc.documentId;
        this.modalComponent.documentName = doc.documentName;
        this.modalComponent.documentStatusId = doc.statusId;

        await this.modalComponent.open();

        this.unlockDocument();
        this.loadDocuments();
        this.loadingDocId = null;
      },

      error: (err) => {
        this.loadingDocId = null;

        Swal.fire(
          'Error',
          err.error?.message || 'Document locked by another user',
          'error',
        );
      },
    });
  }
  unlockDocument() {
    if (!this.currentLockedDocId) return;

    this.service
      .manageLock(this.currentLockedDocId, this.currentUserId, 'UNLOCK')
      .subscribe();

    this.currentLockedDocId = null;
  }
  formatDate(value: any): string {
  if (!value) return 'NA';
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'NA';
  // Guard against SQL default min dates
  if (date.getFullYear() <= 1900) return 'NA';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
 

  // For role 5: download and open the PDF in a new tab
    onViewPdf(doc: any): void {
      const id = doc.documentId;
      const pdfWindow = window.open('', '_blank');
      this.showPdfLoadingWindow(pdfWindow);
      this.loadingPdfIds.add(id);
      this.cdr.detectChanges();

      this.service.getPdf(id, this.roleId).subscribe({
        next: (res: Blob) => {
          const fileURL = URL.createObjectURL(res);
          if (pdfWindow) {
            pdfWindow.location.href = fileURL;
          } else {
            window.open(fileURL, '_blank', 'noopener');
          }
          setTimeout(() => URL.revokeObjectURL(fileURL), 60_000);
          this.loadingPdfIds.delete(id);
          this.cdr.detectChanges();
        },
        error: async (err) => {
          console.error('Failed to load PDF:', err);
          const message = await this.extractHttpErrorMessage(err);
          this.showPdfErrorWindow(pdfWindow, message);
          Swal.fire('PDF Error', message, 'error');
          this.loadingPdfIds.delete(id);
          this.cdr.detectChanges();
        },
      });
    }

private showPdfLoadingWindow(pdfWindow: Window | null): void {
  if (!pdfWindow) return;
  try {
    pdfWindow.opener = null;
    pdfWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Generating PDF</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #f8fafc;
            }
            .box {
              text-align: center;
              padding: 24px;
            }
            .spinner {
              width: 34px;
              height: 34px;
              margin: 0 auto 14px;
              border: 3px solid #dbe4ef;
              border-top-color: #2563eb;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="spinner"></div>
            <div>Generating PDF...</div>
          </div>
        </body>
      </html>
    `);
    pdfWindow.document.close();
  } catch {}
}

private showPdfErrorWindow(pdfWindow: Window | null, message: string): void {
  if (!pdfWindow) return;
  try {
    pdfWindow.document.body.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 32px; color: #991b1b;">
        <h2 style="margin: 0 0 8px;">PDF Error</h2>
        <p style="margin: 0;">${this.escapeHtml(message)}</p>
      </div>
    `;
  } catch {}
}

private escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

onDownloadWord(doc: any): void {
  const id = doc.documentId;
  this.loadingWordIds.add(id);
  console.log("Document doc content", doc);
  this.cdr.detectChanges();

  this.service.getWord(id, this.roleId).subscribe({
    next: (res: any) => {
      // Read filename from Content-Disposition header
      const disposition = res.headers?.get('Content-Disposition') ?? '';
      let fileName = `Document_${id}.docx`; // fallback

      // Try filename*= first (RFC 5987, handles unicode/spaces)
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match) {
        fileName = decodeURIComponent(utf8Match[1]);
      } else {
        // Fallback to plain filename=
        const plainMatch = disposition.match(/filename="?([^";\n]+)"?/i);
        if (plainMatch) fileName = plainMatch[1].trim();
      }

      const blob   = res.body as Blob;
      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href     = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);

      this.loadingWordIds.delete(id);
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Failed to download Word file:', err);
      this.loadingWordIds.delete(id);
      this.cdr.detectChanges();
    }
  });
}

private async extractHttpErrorMessage(err: any): Promise<string> {
  const fallback = 'Failed to generate PDF for this document.';

  try {
    const errorBody = err?.error;

    if (errorBody instanceof Blob) {
      const text = await errorBody.text();
      if (!text) return fallback;

      try {
        const parsed = JSON.parse(text);
        return parsed?.detail || parsed?.message || text || fallback;
      } catch {
        return text || fallback;
      }
    }

    if (typeof errorBody === 'string' && errorBody.trim()) {
      return errorBody;
    }

    if (errorBody?.detail || errorBody?.message) {
      return errorBody.detail || errorBody.message;
    }

    return err?.message || fallback;
  } catch {
    return err?.message || fallback;
  }
}
}
