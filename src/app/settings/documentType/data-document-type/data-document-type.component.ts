import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ServiceService } from '../../settings.service';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-data-document-type',
  templateUrl: './data-document-type.component.html',
  styleUrl: './data-document-type.component.scss'
})
export class DataDocumentTypeComponent implements OnInit {

  isLoading: boolean = false;
  currentPage: number = 1;
  pageSize: number = 10;
  searchBy: string = '';
  searchCriteria: string = '';
  searchTimeout: any;

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  documents$: Observable<any[]>;
  private documentsSubject = new BehaviorSubject<any[]>([]);

  constructor(
    private service: ServiceService,
    private cdRef: ChangeDetectorRef,
    private router: Router
  ) {
    this.documents$ = this.documentsSubject.asObservable();
  }

  ngOnInit(): void {
    this.fetchDocuments();
  }

  // ── Pagination ─────────────────────────────────────────────
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

  // ── Fetch ──────────────────────────────────────────────────
  fetchDocuments(): void {
    this.isLoading = true;
    const startIndex = (this.currentPage - 1) * this.pageSize;

    this.service.getDocumentType(
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

  // ── Search ─────────────────────────────────────────────────
  search(): void {
    this.currentPage = 1;
    this.fetchDocuments();
  }

  onSearchChange(value: string): void {
    this.searchCriteria = value;
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.fetchDocuments();
    }, 500);
  }

  formatLabel(text: any): string {
    return text ? text.toString().replace(/([a-z])([A-Z])/g, '$1 $2') : '';
  }

  // ── Navigate ───────────────────────────────────────────────
  goToAddDocument(): void {
    this.router.navigate(['/settings/add-documentType']);
  }

  goToEdit(item: any): void {
    const id = item.documentTypeId ?? item.DocumentTypeId ?? item.id;
    this.router.navigate(['/settings/add-documentType'], { queryParams: { id } });
  }

  // ── Delete ─────────────────────────────────────────────────
  confirmDelete(item: any): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This document type will be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteDocument(item);
      }
    });
  }

  deleteDocument(item: any): void {
    const id = item.documentTypeId ?? item.DocumentTypeId ?? item.id;

    const lsValue = localStorage.getItem(this.authLocalStorageToken);
    const userId = lsValue ? JSON.parse(lsValue)?.id ?? 0 : 0;

    this.service.DeleteForAll(3, id, userId).subscribe({
      next: () => {
        Swal.fire({
          title: 'Deleted!',
          text: 'Document type has been deleted.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        this.fetchDocuments();
      },
      error: (err) => {
        console.error('Delete failed:', err);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to delete. Please try again.',
          icon: 'error'
        });
      }
    });
  }
}