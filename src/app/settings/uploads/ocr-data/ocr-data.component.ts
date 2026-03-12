import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ServiceService } from '../../settings.service';
import { Options } from 'select2';

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

  // ── STEP 2: Document List + Pagination ────────────────────
  documentList: any[] = [];
  loadingDocs = false;
  docsError = '';

  currentPage: number = 1;
  pageSize: number = 2;

  // ── STEP 3: OCR Pages ──────────────────────────────────────
  selectedDocumentId: number | null = null;
  selectedDocumentName = '';
  pageList: any[] = [];
  loadingPages = false;
  errorMessage = '';

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

  // STEP 2 — dropdown changed → reset to page 1 and load
  onTypeChange(event: any): void {
    const typeId = event ? Number(event) : null;

    this.selectedTypeId       = typeId;
    this.documentList         = [];
    this.docsError            = '';
    this.selectedDocumentId   = null;
    this.selectedDocumentName = '';
    this.pageList             = [];
    this.errorMessage         = '';
    this.currentPage          = 1;

    if (!typeId) return;

    this.loadDocuments();
  }

  // fetch documents — StartIndex is 1-based: page 1 → StartIndex=1, page 2 → StartIndex=11
  loadDocuments(): void {
    if (!this.selectedTypeId) return;

    this.loadingDocs = true;
    this.docsError = '';

    const startIndex = (this.currentPage - 1) * this.pageSize + 1;  // 1-based

    this.service.getDocumentsByTypeId(this.selectedTypeId, startIndex, this.pageSize).subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? res?.Data ?? []);
        this.documentList = raw.map((d: any) => ({
          documentId:   d.documentid   ?? d.documentId   ?? d.DocumentId,
          documentName: d.documentname ?? d.documentName ?? d.DocumentName,
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

  // Previous / Next
  get hasPrevious(): boolean {
    return this.currentPage > 1;
  }

  get hasNext(): boolean {
    return this.documentList.length === this.pageSize;
  }

  goToPrevious(): void {
    if (!this.hasPrevious) return;
    this.currentPage--;
    this.selectedDocumentId   = null;
    this.selectedDocumentName = '';
    this.pageList             = [];
    this.loadDocuments();
  }

  goToNext(): void {
    if (!this.hasNext) return;
    this.currentPage++;
    this.selectedDocumentId   = null;
    this.selectedDocumentName = '';
    this.pageList             = [];
    this.loadDocuments();
  }

  // STEP 3 — click document name → fetch OCR pages
  onDocumentClick(doc: any): void {
    this.selectedDocumentId   = doc.documentId;
    this.selectedDocumentName = doc.documentName;
    this.pageList             = [];
    this.errorMessage         = '';
    this.getPages();
  }

  getPages(): void {
    if (!this.selectedDocumentId) return;

    this.loadingPages = true;
    this.errorMessage = '';

    this.service.getDocumentByDocumentName(this.selectedDocumentId).subscribe({
      next: (res) => {
        this.pageList = (res || []).map((x: any) => ({
          DocumentPageId: x.documentpageid,
          DocumentId:     x.documentid,
          PageNumber:     x.pagenumber,
          ExtractedText:  x.extractedtext,
          StatusId:       x.statusid,
          CreatedBy:      x.createdby,
          CreatedDate:    x.createddate,
          UpdatedBy:      x.updatedby,
          UpdatedDate:    x.updateddate
        }));
        this.loadingPages = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to load OCR data';
        this.loadingPages = false;
        this.cdr.detectChanges();
      }
    });
  }

  refresh(): void {
    this.getPages();
  }

  clearPages(): void {
    this.selectedDocumentId   = null;
    this.selectedDocumentName = '';
    this.pageList             = [];
    this.errorMessage         = '';
    this.cdr.detectChanges();
  }
}