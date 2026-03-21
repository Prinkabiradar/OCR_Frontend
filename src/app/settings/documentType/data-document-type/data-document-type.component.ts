import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ServiceService } from '../../settings.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-data-document-type',
  templateUrl: './data-document-type.component.html',
  styleUrl: './data-document-type.component.scss'
})
export class DataDocumentTypeComponent implements OnInit {

  isLoading: boolean = false;
  totalPages: number = 1;
  currentPage: number = 1;
  totalRecords: number = 0;
  itemsPerPage: number = 10;
  searchBy: string = '';
  searchCriteria: string = '';

  documents$: Observable<any[]>;
  private documentsSubject = new BehaviorSubject<any[]>([]);

  constructor(
    private service: ServiceService,
    private cdRef: ChangeDetectorRef,
    private router: Router
  ) {
    this.documents$ = this.documentsSubject.asObservable();
  }

  goToAddDocument() {
  this.router.navigate(['/settings/add-documentType']);
}

formatLabel(text: any): string {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2');
}

searchTimeout: any;

onSearchChange(value: string) {
  if (this.searchTimeout) {
    clearTimeout(this.searchTimeout);
  }

  this.searchTimeout = setTimeout(() => {
    this.currentPage = 1;
    this.search();
  }, 400);
}

  ngOnInit(): void {
    this.fetchDocuments();
  }

  fetchDocuments(): void {
    this.isLoading = true;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;

    this.service.getDocumentType(
      startIndex,
      this.itemsPerPage,
      this.searchBy,
      this.searchCriteria
    ).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const items: any[] = response?.items ?? response ?? [];
        this.documentsSubject.next(items);
        this.totalRecords = response?.totalCount ?? items.length;
        this.totalPages = response?.totalPages ?? Math.ceil(this.totalRecords / this.itemsPerPage);
        this.cdRef.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error:', err);
      }
    });
  }

  search(): void {
    this.currentPage = 1;
    this.fetchDocuments();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchDocuments();
    this.cdRef.detectChanges();
  }

  onPageSizeChange(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.itemsPerPage = parseInt(event.target.value, 10);
      this.currentPage = 1;
      this.fetchDocuments();
      this.cdRef.detectChanges();
    }
  }
}