import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ServiceService } from '../../settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { environment } from 'src/environments/environment';
import { SharedDataService } from '../../shared-data.service';

@Component({
  selector: 'app-user-data',
  templateUrl: './user-data.component.html',
  styleUrl: './user-data.component.scss'
})
export class UserDataComponent implements OnInit {

  totalPages: number = 1;
  currentPage: number = 1;
  totalRecords: number = 0;
  itemsPerPage = 10;
  searchQuery: string = '';

  isLoading$: Observable<boolean>;
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  userList$: Observable<any[]>;
  private userListSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
  userId: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private _service: ServiceService,
    private cdRef: ChangeDetectorRef,
    private _shareds: SharedDataService,
  ) {
    this.userList$ = this.userListSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  ngOnInit(): void {
    this.UsersGET();
  }

  UsersGET() {
    const userId=0;
    const startIndex = this.currentPage;
    const pageSize = this.itemsPerPage;
    const searchBy = this.searchQuery ? '1' : '0';
    const searchCriteria = this.searchQuery || "''";

    this.isLoadingSubject.next(true);

    this._service
      .UsersGET(userId,startIndex, pageSize, searchBy, searchCriteria)
      .subscribe({
        next: (response: any[]) => {
          console.log('UsersGET response:', response); // ← keep for debug
          if (response && response.length > 0) {
            this.userListSubject.next(response);      // ← push data to stream
            this.totalPages = response[0].totalpages;
            this.totalRecords = response[0].totalrecords;
          } else {
            this.userListSubject.next([]);
          }
          this.isLoadingSubject.next(false);
          this.cdRef.detectChanges();
        },
        error: (err) => {
          console.error('UsersGET error:', err);
          this.isLoadingSubject.next(false);
          this.cdRef.detectChanges();
        }
      });
  }

  // Safe middle name helper — handles {}, null, undefined, empty string
  getMiddleName(middlename: any): string {
    if (!middlename || typeof middlename !== 'string') return '';
    return middlename.trim();
  }

  onSearch(target: EventTarget | null): void {
    if (target instanceof HTMLInputElement) {
      this.searchQuery = target.value;
      this.currentPage = 1;
      this.UsersGET();
    }
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.UsersGET();
    this.cdRef.detectChanges();
  }

  onPageSizeChange(newSize: number) {
    this.itemsPerPage = newSize;
    this.currentPage = 1;
    this.UsersGET();
    this.cdRef.detectChanges();
  }

  delete(data: any, event: Event) {
    event.preventDefault();

    const previousStatus = data.isactive;
    const newStatus = previousStatus ? 0 : 1;

    Swal.fire({
      title: newStatus == 0 ? 'Inactivate this user?' : 'Activate this user?',
      text: newStatus == 0 ? 'This will make the User inactive.' : 'This will make the User active.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus == 0 ? '#f1416c' : '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: newStatus == 0 ? 'Yes, Inactivate!' : 'Yes, Activate!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.makeInactivationCall(data, newStatus);
      } else {
        this.UsersGET(); // revert toggle visually
      }
    });
  }

  makeInactivationCall(data: any, newStatus: number) {
    if (!this.userId) this.detectUser();

    this._service.inactivateRecordForAll(5, data.userid, this.userId)
      .subscribe({
        next: () => {
          Swal.fire('Success!',
            `User ${newStatus == 0 ? 'inactivated' : 'activated'} successfully.`,
            'success');
          this.UsersGET();
        },
        error: (error) => {
          Swal.fire('Error!', error?.message || 'An error occurred.', 'error');
          this.UsersGET();
        }
      });
  }

  detectUser() {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);
    if (!lsValue) return;
    const userData = JSON.parse(lsValue);
    this.userId = userData.id;
  }

  edit(data: any) {
    this._shareds.setUserData(JSON.stringify(data));
    this.router.navigate(['/settings/user-add']);
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
      const id = item.userid ?? item.UserId ?? item.id;
  
      const lsValue = localStorage.getItem(this.authLocalStorageToken);
      const userId = lsValue ? JSON.parse(lsValue)?.id ?? 0 : 0;
      const userData = lsValue ? JSON.parse(lsValue) : null;
     // this.roleId = userData?.roleId ?? 0;
  
      this._service.DeleteForAll(4, id, userId).subscribe({
        next: () => {
          Swal.fire({
            title: 'Deleted!',
            text: 'Document type has been deleted.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
          this.UsersGET();
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