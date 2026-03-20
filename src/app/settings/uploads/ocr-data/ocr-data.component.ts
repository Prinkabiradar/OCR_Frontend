import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ServiceService } from '../../settings.service';
import { Options } from 'select2';
import { ModalConfig } from 'src/app/_metronic/partials';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { OcrPageModalComponent } from '../ocr-page-modal/ocr-page-modal.component';

@Component({
  selector: 'app-ocr-data',
  templateUrl: './ocr-data.component.html',
  styleUrls: ['./ocr-data.component.scss']
})
export class OcrDataComponent implements OnInit {

  // ── STEP 1: Dropdown ───────────────────────────────────────
  public documentTypeoptions: Options = {};
  public documentTypedata: Array<{ id: string; text: string }> = [];
  documentTypesearchTerm: string = '';
  selectedTypeId: number | null = null;

  editedTexts:    { [id: number]: string }  = {};
  savingRows:     { [id: number]: boolean } = {};
  savedRows:      { [id: number]: boolean } = {};
  savingAll:      boolean = false;
  saveAllSuccess: boolean = false;

   pageList: any[] = [];

  roleId: number = 0; 
  // ── STEP 2: Document List + Pagination ────────────────────
  documentList: any[] = [];
  loadingDocs = false;
  docsError = '';
  docCurrentPage: number = 1;
  docPageSize: number = 10;

  // ── Modal ──────────────────────────────────────────────────
  @ViewChild('ocrModal') modalComponent!: OcrPageModalComponent;
  private modalRef: NgbModalRef;
  loadingPages = false;

  modalConfig: ModalConfig = {
    modalTitle: 'Sacred Pages',
    dismissButtonLabel: 'Close',
    closeButtonLabel: 'Close',
  };

  constructor(
    private service: ServiceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.documentTypeDropdown();
  }

  // STEP 1 — load document types into dropdown
  documentTypeDropdown(): void {
    this.service.dropdownAll(this.documentTypesearchTerm, '1', '3', '0')
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
        error: (error) => console.error('Error fetching document types:', error)
      });
  }

  // STEP 2 — dropdown changed → reset and load doc list page 1
  onTypeChange(event: any): void {
    const typeId = event ? Number(event) : null;

    this.selectedTypeId  = typeId;
    this.documentList    = [];
    this.docsError       = '';
    this.docCurrentPage  = 1;

    if (!typeId) return;
    this.loadDocuments();
  }

  isDirty(item: any): boolean {
    return this.editedTexts[item.DocumentPageId] !== item.ExtractedText;
  }
  onTextChange(item: any, value: string): void {
    this.editedTexts[item.DocumentPageId] = value;
    this.savedRows[item.DocumentPageId]   = false;
    this.saveAllSuccess                   = false;
    this.cdr.detectChanges();
  }
  get hasDirtyRows(): boolean {
    return this.pageList.some(item => this.isDirty(item));
  }

  getStatusLabel(statusId: number): string {
    switch (statusId) {
      case 0:  return 'Processing';
      case 1:  return 'Checked';
      case 2:  return 'Partially verified';
      case 3:  return 'Verified';
      default: return `Reviewed (${statusId})`;
    }
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 0:  return 'badge-processing';
      case 1:  return 'badge-pending';
      case 2:  return 'badge-partially-verified';
      default: return 'badge-verified';
    }
  }

  // fetch document list — 0-based offset
  loadDocuments(): void {
    if (!this.selectedTypeId) return;

    this.loadingDocs = true;
    this.docsError = '';

    const startIndex = (this.docCurrentPage - 1) * this.docPageSize;

    
    this.service.getDocumentsByTypeId(this.selectedTypeId, startIndex, this.docPageSize, this.roleId).subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? res?.Data ?? []);
        this.documentList = raw.map((d: any) => ({
          documentId:   d.documentid   ?? d.documentId   ?? d.DocumentId,
          documentName: d.documentname ?? d.documentName ?? d.DocumentName,
          statusId:     d.statusid     ?? d.statusId     ?? d.StatusId,
          userName:     d.user_name    ?? d.userName    ?? d.UserName
        }));
        this.loadingDocs = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load documents:', err);
        this.docsError   = 'Could not load documents. Please try again.';
        this.loadingDocs = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Doc list pagination
  get docHasPrevious(): boolean { return this.docCurrentPage > 1; }
  get docHasNext(): boolean { return this.documentList.length === this.docPageSize; }

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
    this.modalComponent.documentId   = doc.documentId;   // modal fetches its own pages
    this.modalComponent.documentName = doc.documentName;
    await this.modalComponent.open();
  }
}