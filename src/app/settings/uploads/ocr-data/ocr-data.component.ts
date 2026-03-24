import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ServiceService } from '../../settings.service';
import { Options } from 'select2';
import { ModalConfig } from 'src/app/_metronic/partials';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { OcrPageModalComponent } from '../ocr-page-modal/ocr-page-modal.component';
import { environment } from 'src/environments/environment';
import { EventEmitter, Output } from '@angular/core';

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

  roleId: number = 0;
  // ── STEP 2: Document List + Pagination ────────────────────
  documentList: any[] = [];
  loadingDocs = false;
  docsError = '';
  docCurrentPage: number = 1;
  docPageSize: number = 10;

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
  ) {}

  ngOnInit(): void {
    this.documentTypeDropdown();
    this.loadDocuments();
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
      default:
        return `Reviewed (${statusId})`;
    }
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 0:
        return 'badge-pending';
      case 4:
        return 'badge-partially-checked';
      case 1:
        return 'badge-Checked';
      case 5:
        return 'badge-Partially-verified';
      case 2:
        return 'badge-Verified';
      case 6:
        return 'badge-Partially-approved';
      case 3:
        return 'badge-approved';
      default:
        return 'badge-approved';
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
    const userId = userData?.id ?? 0;
    this.roleId = userData?.roleId ?? 0;

    this.service
      .getDocumentsByTypeId(
        this.selectedTypeId ?? 0,
        startIndex,
        this.docPageSize,
        this.roleId,
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
          }));
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

  // Doc list pagination
  get docHasPrevious(): boolean {
    return this.docCurrentPage > 1;
  }
  get docHasNext(): boolean {
    return this.documentList.length === this.docPageSize;
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

  // STEP 3 — click View → pass documentId to modal and open it
  async onDocumentClick(doc: any): Promise<void> {
    this.modalComponent.documentId = doc.documentId;
    this.modalComponent.documentName = doc.documentName;
    await this.modalComponent.open();
  }

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
