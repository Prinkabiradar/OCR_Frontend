import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ServiceService } from '../../settings.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-data-document',
  templateUrl: './data-document.component.html',
  styleUrl: './data-document.component.scss'
})
export class DataDocumentComponent implements OnInit {

  isLoading: boolean = false;
  searchBy: string = '';
  searchCriteria: string = '';
  searchTimeout: any;

  // ── Pagination (standard pattern) ─────────────────────────
  currentPage: number = 1;
  pageSize: number = 10;

  documents$: Observable<any[]>;
  private documentsSubject = new BehaviorSubject<any[]>([]);

  constructor(
    private service: ServiceService,
    private cdRef: ChangeDetectorRef,
    private router: Router
  ) {
    this.documents$ = this.documentsSubject.asObservable();
  }

  // ── Standard pagination getters ───────────────────────────
  get hasPrevious(): boolean { return this.currentPage > 1; }
  get hasNext(): boolean { return this.documentsSubject.getValue().length === this.pageSize; }

  goToPrevious(): void {
    if (!this.hasPrevious) return;
    this.currentPage--;
    this.fetchDocuments();
  }

  goToNext(): void {
    if (!this.hasNext) return;
    this.currentPage++;
    this.fetchDocuments();
  }

  // ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.fetchDocuments();
  }

  formatLabel(text: any): string {
    return text
      ? text.toString().replace(/([a-z])([A-Z])/g, '$1 $2')
      : '';
  }

  goToAddDocument(): void {
    this.router.navigate(['/settings/add-document']);
  }

  onSearchChange(value: string): void {
    this.searchCriteria = value;
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.fetchDocuments();
    }, 500);
  }

  search(): void {
    this.currentPage = 1;
    this.fetchDocuments();
  }

  fetchDocuments(): void {
    this.isLoading = true;
    const startIndex = (this.currentPage - 1) * this.pageSize;

    this.service.getDocuments(
      startIndex,
      this.pageSize,
      this.searchBy,
      this.searchCriteria
    ).subscribe({
      next: (response: any) => {
        const items: any[] = response?.items ?? response ?? [];
        this.documentsSubject.next(items);
        this.isLoading = false;
        this.cdRef.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error:', err);
        this.cdRef.detectChanges();
      }
    });
  }
}