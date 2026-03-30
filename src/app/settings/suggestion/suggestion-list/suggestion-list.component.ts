import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ServiceService } from '../../settings.service';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SuggestionModalComponent } from '../suggestion-modal/suggestion-modal.component';

// ❌ REMOVE this if file not exists
// import { ViewSummaryComponent } from '../view-summary/view-summary.component';

@Component({
  selector: 'app-suggestion-list',
  templateUrl: './suggestion-list.component.html',
  styleUrls: ['./suggestion-list.component.scss']
})
export class SuggestionListComponent implements OnInit {

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  suggestions: any[] = [];

  isLoading: boolean = false;
  loaded: boolean = false;

  // ✅ FIX: added because HTML is using it
  documentName: string = '';

  constructor(
    private service: ServiceService,
    private cd: ChangeDetectorRef,
    private modalService: NgbModal
  ) {}

  currentPage: number = 1;
  pageSize: number = 5;
  totalRecords: number = 0;
  totalPages: number = 0;
  hasNext: boolean = false;
hasPrevious: boolean = false;

  ngOnInit(): void {
    this.loadSuggestions();
  }

  // ✅ TEMP FIX (until your modal is ready)
  openViewModal(s: any) {
  const modalRef = this.modalService.open(SuggestionModalComponent, {
    size: 'xl',
    backdrop: 'static',
    centered: true
  });

  modalRef.componentInstance.documentId = s.documentid;
  modalRef.componentInstance.documentPageId = s.documentpageid;
  modalRef.componentInstance.documentName =
    s.documentname || ('Doc #' + s.documentid);

  modalRef.result.then((result: any) => {
    if (result === true) {
      this.loadSuggestions();
    }
  }).catch(() => {});
}
  // ✅ LOAD SUGGESTIONS
  loadSuggestions() {
  this.isLoading = true;
  this.loaded = false;

  const startIndex = (this.currentPage - 1) * this.pageSize;

  this.service.getActiveSuggestions(0, startIndex, this.pageSize, '', '', 0)
    .subscribe({
      next: (res: any[]) => {

        this.suggestions = res || [];

        // ✅ Set pagination flags
        this.hasPrevious = this.currentPage > 1;
        this.hasNext = res.length === this.pageSize;

        this.isLoading = false;
        this.loaded = true;
        this.cd.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.loaded = true;
        Swal.fire('Error', 'Failed to load suggestions', 'error');
      }
    });
}
goToNext() {
  if (this.hasNext) {
    this.currentPage++;
    this.loadSuggestions();
  }
}

goToPrevious() {
  if (this.hasPrevious) {
    this.currentPage--;
    this.loadSuggestions();
  }
}


prevPage() {
  if (this.currentPage > 1) {
    this.currentPage--;
    this.loadSuggestions();
  }
}
  // ✅ ACCEPT / REJECT (UI only for now)
  reviewSuggestion(s: any, action: string) {

  Swal.fire({
    title: 'Are you sure?',
    text: `You want to mark as ${action}`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes'
  }).then(result => {

    if (result.isConfirmed) {

      const lsValue = localStorage.getItem(this.authLocalStorageToken);
      const userData = lsValue ? JSON.parse(lsValue) : null;

      const model = {
        suggestionId: s.suggestionid,
        documentPageId: s.documentpageid,
        action: action,                // ✅ matches API
        reviewedBy: userData?.id ?? 0,
        roleId: userData?.roleId ?? 0
      };

      this.service.reviewSuggestion(model).subscribe({
        next: () => {

          // ✅ Remove from UI (since IsActive = false)
          this.suggestions = this.suggestions.filter(
            x => x.suggestionid !== s.suggestionid
          );

          this.cd.detectChanges();

          Swal.fire(
            'Success',
            `Marked as ${action}`,
            'success'
          );
        },
        error: () => {
          Swal.fire('Error', 'Failed to update', 'error');
        }
      });

    }

  });
}

  // ✅ INITIALS
  getInitials(name: string): string {
    if (!name) return '?';
    return name.trim().split(' ')
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');
  }
}