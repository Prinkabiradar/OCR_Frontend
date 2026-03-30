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
        return true;
      case 2:
        return doc.statusId >= 1 && doc.statusId !== 4; // 4 = Partially checked
      case 3:
        return doc.statusId >= 2 && doc.statusId !== 5; // 5 = Partially verified
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

        case 7: return 'badge-rejected';
        
        case 8: return 'badge-suggestion';

      default:
        return 'badge-default';
    }
  }
  // fetch document list — 0-based offset
  loadDocuments(): void {
    //if (!this.selectedTypeId) return;

    this.loadingDocs = true;
    this.docsError = '';

    const startIndex = (this.docCurrentPage - 1) * this.docPageSize;

    const lsValue = localStorage.getItem(this.authLocalStorageToken);
    const userData = lsValue ? JSON.parse(lsValue) : null;
    const userId = this.currentUserId;
    this.roleId = userData?.roleId ?? 0;
    const searchCriteria = this.searchCriteria.trim();
    const searchBy = this.searchBy;

    this.service
      .getDocumentsByTypeId(
        this.selectedTypeId ?? 0,
        startIndex,
        this.docPageSize,
        this.roleId,
        this.searchBy,
        this.searchCriteria,
      )
      .subscribe({
        next: (res: any) => {
          const raw: any[] = Array.isArray(res)
            ? res
            : (res?.data ?? res?.Data ?? []);

          this.documentList = raw.map((d: any) => ({
            documentId: d.documentid ?? d.documentId ?? d.DocumentId,
            documentName: d.documentname ?? d.documentName ?? d.DocumentName,
            statusId: d.statusid ?? d.statusId ?? d.StatusId,
            createdByName:
              d.createdby_name ?? d.createdByName ?? d.CreatedByName,
            updatedByName:
              d.updatedby_name ?? d.updatedByName ?? d.UpdatedByName,
            updatedDate: d.updateddate ?? d.updateddate ?? d.UpdatedDate,
            createdDate: d.createddate ?? d.createdDate ?? d.CreatedDate,
            approvedByName:
              d.approvedby_name ?? d.approvedByName ?? d.ApprovedByName,
            approvedDate: d.approveddate ?? d.approveddate ?? d.ApprovedDate,
            lockedBy: d.lockedby ?? d.lockedBy ?? d.LockedBy,
            lockedByName: d.lockedby_name ?? d.lockedByName ?? d.LockedByName,
          }));

          // ✅ IMPORTANT: get totalRecords from API
          this.totalRecords = raw.length > 0 ? raw[0].totalrecords : 0;

          // ✅ calculate total pages
          this.totalPages = Math.ceil(this.totalRecords / this.docPageSize);

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
  onSearchChange(): void {
  const activeEl = document.activeElement as HTMLElement;
  this.docCurrentPage = 1;
  this.loadDocuments();
  setTimeout(() => activeEl?.focus(), 0);
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
  // ngOnDestroy(): void {
  //   this.unlockDocument();
  // }

  // For role 5: download and open the PDF in a new tab
  onViewPdf(doc: any): void {
    this.loadingPages = true;

    this.service.getPdf(doc.documentId, this.roleId).subscribe({
      next: (res: Blob) => {
        const fileURL = URL.createObjectURL(res);
        window.open(fileURL, '_blank');
        this.loadingPages = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load PDF:', err);
        this.loadingPages = false;
        this.cdr.detectChanges();
      },
    });
  }
}
