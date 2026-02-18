import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ServiceService } from '../../settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { SharedDataService } from '../../shared-data.service';
import Swal from 'sweetalert2';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-mastertable-data',
  templateUrl: './mastertable-data.component.html',
  styleUrls: ['./mastertable-data.component.scss'],
})
export class MastertableDataComponent implements OnInit {
  //Pagination
  totalPages: number = 50;
  currentPage: number = 1;
  totalRecords: number = 0;
  itemsPerPage = 10;
  totalItems = 0;
  searchQuery: string;

  loading = false;

  isLoading$: Observable<boolean>;
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  mastertableList$: Observable<any[]>;
  private mastertableListSubject: BehaviorSubject<any[]> = new BehaviorSubject<
    any[]
  >([]);

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
  userId: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private _service: ServiceService,
    private cdRef: ChangeDetectorRef,
    private _shareds: SharedDataService
  ) {
    this.mastertableList$ = this.mastertableListSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  ngOnInit(): void {
    this.masterTableGET();
  }

  masterTableGET() {
    const startIndex = this.currentPage;
    const pageSize = this.itemsPerPage;
    const searchBy = this.searchQuery ? '1' : '0';
    const searchCriteria = this.searchQuery || '0';

    this._service
      .masterTableGet(startIndex, pageSize, searchBy, searchCriteria)
      .subscribe((response: any[]) => {
        this.mastertableListSubject.next(response);
        this.totalPages = response[0].TotalPages;
        this.totalRecords = response[0].TotalRecords;
      });
  }

  onSearch(target: EventTarget | null): void {
    if (target instanceof HTMLInputElement) {
      this.searchQuery = target.value;
      this.currentPage = 1;
      this.masterTableGET();
    }
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.masterTableGET();
  }

  onPageSizeChange(newSize: number) {
    this.itemsPerPage = newSize;
    this.masterTableGET();
  }
  edit(data: any) {
    this._shareds.setmastertableData(JSON.stringify(data));
    this.router.navigate(['/settings/mastertable-add']);
  }

  // deleting the record
  delete(data: any, event: Event) {
    event.preventDefault(); // Prevents checkbox from toggling before confirmation

    const previousStatus = data.IsActive; // Store the original status
    const newStatus = previousStatus == 1 ? 0 : 1; // Toggle status

    Swal.fire({
      title:
        newStatus == 0
          ? 'Do you want to inactivate this record?'
          : 'Do you want to activate this record?',
      text:
        newStatus == 0
          ? 'This will make the Master   inactive.'
          : 'This will make the Master   active.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus == 0 ? '#f1416c' : '#28a745', // Red for Inactivate, Green for Activate
      cancelButtonColor: '#6c757d',
      confirmButtonText:
        newStatus == 0 ? 'Yes, Inactivate this!' : 'Yes, Activate this!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.makeInactivationCall(data, newStatus, previousStatus);
      } else {
        window.location.reload(); // Reload the page to revert changes
      }
    });
  }

  makeInactivationCall(data: any, newStatus: number, previousStatus: number) {
    if (!this.userId) {
      this.detectUser();
    }

    this._service
      .inactivateRecordForAll(10, data.MasterId, this.userId)
      .subscribe(
        (response: any) => {
          data.IsActive = newStatus;

          Swal.fire(
            'Success!',
            `Master has been ${
              newStatus == 0 ? 'inactivated' : 'activated'
            } successfully.`,
            'success'
          );

          this.masterTableGET(); // Refresh data
        },
        (error) => {
          console.error('API Error:', error);
          Swal.fire('Error!', error?.message || 'An error occurred.', 'error');

          window.location.reload(); // Reload the page to revert changes
        }
      );
  }

  detectUser() {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return;
    }

    const userData = JSON.parse(lsValue);
    this.userId = userData.id;

    console.log('User ID:', this.userId);
  }
  deleteItem(): void {
    console.log('Item deleted');
    // Add your item deletion logic here
  }
}
