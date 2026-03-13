import { ChangeDetectorRef, Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ServiceService } from '../../settings.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-ocr-page-modal',
  templateUrl: './ocr-page-modal.component.html',
  styleUrls: ['./ocr-page-modal.component.scss']
})
export class OcrPageModalComponent {

  @Input() modalConfig: any;

  // set by parent before open()
  documentName: string = '';
  documentId: number | null = null;

  // pagination state
  pageList: any[] = [];
  currentPage: number = 1;
  pageSize: number = 1;
  loading: boolean = false;

  // edit state
  editedTexts:    { [id: number]: string }  = {};
  savingRows:     { [id: number]: boolean } = {};
  savedRows:      { [id: number]: boolean } = {};
  savingAll:      boolean = false;
  saveAllSuccess: boolean = false;

  private modalRef: NgbModalRef;

  @ViewChild('ocrPageModal')
  private modalContent: TemplateRef<OcrPageModalComponent>;

  constructor(
    private modalService: NgbModal,
    private service: ServiceService,
    private cdr: ChangeDetectorRef
  ) {}

  // ── Open ────────────────────────────────────────────────────

  open(): Promise<boolean> {
    this.currentPage    = 1;
    this.pageList       = [];
    this.editedTexts    = {};
    this.savingRows     = {};
    this.savedRows      = {};
    this.savingAll      = false;
    this.saveAllSuccess = false;
    this.loadPages();

    return new Promise<boolean>((resolve) => {
      this.modalRef = this.modalService.open(this.modalContent, {
        size: 'xl',
        scrollable: true,
      });
      this.modalRef.result.then(resolve, resolve);
    });
  }

  // ── Load Pages ───────────────────────────────────────────────

  loadPages(): void {
    if (!this.documentId) return;
    this.loading = true;
    const startIndex = (this.currentPage - 1) * this.pageSize;

    this.service.getDocumentByDocumentName(this.documentId, startIndex, this.pageSize).subscribe({
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

        // Seed editedTexts only for rows not yet edited
        this.pageList.forEach(item => {
          if (this.editedTexts[item.DocumentPageId] === undefined) {
            this.editedTexts[item.DocumentPageId] = item.ExtractedText;
          }
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Edit Helpers ─────────────────────────────────────────────

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

  // ── Status Helpers ───────────────────────────────────────────

  getStatusLabel(statusId: number): string {
    switch (statusId) {
      case 0:  return 'Processing';
      case 1:  return 'Pending';
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

  // ── Build payload — matches your DocumentPageRequest C# model ─

  private buildPayload(item: any): any {
    return {
      documentPageId: item.DocumentPageId,
      documentId:     item.DocumentId,
      pageNumber:     item.PageNumber,
      extractedText:  this.editedTexts[item.DocumentPageId],
      statusId:       item.StatusId + 1,  // each reviewer increments by 1
      createdBy:      item.CreatedBy
    };
  }

  // ── Save Single Row ──────────────────────────────────────────

  saveRow(item: any): void {
    if (this.savingRows[item.DocumentPageId]) return;
    this.savingRows[item.DocumentPageId] = true;

    const payload = this.buildPayload(item);

    this.service.saveDocumentPage(payload).subscribe({
      next: () => {
        item.ExtractedText                   = this.editedTexts[item.DocumentPageId];
        item.StatusId                        = payload.statusId;
        this.savingRows[item.DocumentPageId] = false;
        this.savedRows[item.DocumentPageId]  = true;

        setTimeout(() => {
          this.savedRows[item.DocumentPageId] = false;
          this.cdr.detectChanges();
        }, 2000);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Save failed', err);
        this.savingRows[item.DocumentPageId] = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Save All Dirty Rows ──────────────────────────────────────

  saveAll(): void {
    if (this.savingAll) return;
    if (!this.pageList.length) return;

    this.savingAll = true;

    // Save ALL rows on the page (not just dirty ones)
    const requests = this.pageList.map(item =>
      this.service.saveDocumentPage(this.buildPayload(item))
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.pageList.forEach(item => {
          item.ExtractedText                  = this.editedTexts[item.DocumentPageId];
          item.StatusId                       = this.isDirty(item) ? item.StatusId + 1 : item.StatusId;
          this.savedRows[item.DocumentPageId] = true;
        });

        this.savingAll      = false;
        this.saveAllSuccess = true;

        setTimeout(() => {
          this.saveAllSuccess = false;
          this.pageList.forEach(item => {
            this.savedRows[item.DocumentPageId] = false;
          });
          this.cdr.detectChanges();
        }, 2500);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Save all failed', err);
        this.savingAll = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Pagination ───────────────────────────────────────────────

  get hasPrevious(): boolean { return this.currentPage > 1; }
  get hasNext(): boolean     { return this.pageList.length === this.pageSize; }

  goToPrevious(): void {
    if (!this.hasPrevious) return;
    this.currentPage--;
    this.loadPages();
  }

  goToNext(): void {
    if (!this.hasNext) return;
    this.currentPage++;
    this.loadPages();
  }

  close(): void   { this.modalRef.close(); }
  dismiss(): void { this.modalRef.dismiss(); }
}