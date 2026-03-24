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

  documentName: string = '';
  documentId: number | null = null;

  
  pageList: any[] = [];
  currentPage: number = 1;
  pageSize: number = 1;
  loading: boolean = false;

  editedTexts:    { [id: number]: string }  = {};
  savingRows:     { [id: number]: boolean } = {};
  savedRows:      { [id: number]: boolean } = {};
  savingAll:      boolean = false;
  saveAllSuccess: boolean = false;

  private modalRef: NgbModalRef;

  @ViewChild('ocrPageModal')
  private modalContent: TemplateRef<OcrPageModalComponent>;
  pdfUrl: string;

  constructor(
    private modalService: NgbModal,
    private service: ServiceService,
    private cdr: ChangeDetectorRef
  ) {}

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
  loadPages(): void {
    if (!this.documentId) return;
    this.loading = true;
    const startIndex = (this.currentPage) * this.pageSize;

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
      case 0:  return 'Pending';
      case 4:  return 'Partially checked';
      case 1:  return 'Checked';
      case 5:  return 'Partially verified';
      case 2:  return 'Verified';
      case 6:  return 'Partially Approved';
      case 3:  return 'Approved';
      default: return `Reviewed (${statusId})`;
    }
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 0:  return 'badge-pending';
      case 4:  return 'badge-partially-checked';
      case 1:  return 'badge-Checked';
      case 5:  return 'badge-Partially-verified';
      case 2:  return 'badge-Verified';
      case 6:  return 'badge-Partially-approved';
      case 3:  return 'badge-approved';
      default: return 'badge-approved';
    }
  }

  private buildPayload(item: any): any {
    return {
      documentPageId: item.DocumentPageId,
      documentId:     item.DocumentId,
      pageNumber:     item.PageNumber,
      extractedText:  this.editedTexts[item.DocumentPageId],
      statusId:       item.StatusId,  
      createdBy:      item.CreatedBy
    };
  }

  saveRow(item: any): void {
  if (this.savingRows[item.DocumentPageId]) return;

  this.savingRows[item.DocumentPageId] = true;

  const payload = this.buildPayload(item);

  this.service.saveDocumentPage(payload).subscribe({
    next: (res: any) => {

      // ✅ IMPORTANT: use response data
      const updated = res?.data || res; // adjust based on API

      item.ExtractedText = updated.extractedText || this.editedTexts[item.DocumentPageId];

      // 🔥 THIS FIXES YOUR ISSUE
      item.StatusId = updated.statusId;  

      this.savingRows[item.DocumentPageId] = false;
      this.savedRows[item.DocumentPageId] = true;

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
  saveAll(): void {
    if (this.savingAll) return;
    if (!this.pageList.length) return;

    this.savingAll = true;
    const requests = this.pageList.map(item =>
      this.service.saveDocumentPage(this.buildPayload(item))
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.pageList.forEach(item => {
          item.ExtractedText                  = this.editedTexts[item.DocumentPageId];
          item.StatusId                       = this.isDirty(item) ? item.StatusId : item.StatusId;
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