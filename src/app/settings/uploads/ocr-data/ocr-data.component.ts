import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ServiceService } from '../../settings.service';

@Component({
  selector: 'app-ocr-data',
  templateUrl: './ocr-data.component.html',
  styleUrls: ['./ocr-data.component.scss']
})
export class OcrDataComponent implements OnInit {

  documentId: number = 2;
  pageList: any[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private service: ServiceService,
    private cdr: ChangeDetectorRef   // ADD THIS
  ) {}

  ngOnInit(): void {
    this.getPages();
  }

  getPages() {
    this.loading = true;
    this.errorMessage = '';

    this.service.getDocumentPagesByDocument(this.documentId)
      .subscribe({
        next: (res) => {
          this.pageList = (res || []).map((x: any) => ({
            DocumentPageId: x.documentpageid,
            DocumentId: x.documentid,
            PageNumber: x.pagenumber,
            ExtractedText: x.extractedtext,
            StatusId: x.statusid,
            CreatedBy: x.createdby,
            CreatedDate: x.createddate,
            UpdatedBy: x.updatedby,
            UpdatedDate: x.updateddate
          }));

          this.loading = false;
          this.cdr.detectChanges(); // ADD THIS
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = 'Failed to load OCR data';
          this.loading = false;
          this.cdr.detectChanges(); 
        }
      });
  }

  refresh() {
    this.getPages();
  }
}