import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ServiceService } from '../../settings.service';
import { Options } from 'select2';
import { ModalConfig } from 'src/app/_metronic/partials';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
 import { environment } from 'src/environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { ViewSummaryComponent } from '../view-summary/view-summary.component';

@Component({
  selector: 'app-data-summary',
  templateUrl: './data-summary.component.html',
  styleUrl: './data-summary.component.scss'
})
export class DataSummaryComponent {
 

  constructor(
  
    private route: ActivatedRoute,
    private router: Router,
    private _service: ServiceService,
    private cdRef: ChangeDetectorRef, 
    private modalService: NgbModal 
  
  ) {
    this.roleList$ = this.rolesListSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

ngOnInit(): void { 
  const lsValue = localStorage.getItem(this.authLocalStorageToken);
  const userData = lsValue ? JSON.parse(lsValue) : null;
  this.roleId = userData?.roleId ?? 0;
  this.SummaryDataGet();
}

   //Pagination
   totalPages   : number = 0;
   currentPage  : number = 1;
   totalRecords : number = 0;
   itemsPerPage          = 10;
   searchQuery  : string = ''; 
  
   loading = false;
  
   isLoading$: Observable<boolean>;
   private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  
   roleList$: Observable<any[]>;
   private rolesListSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  
   private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
   userId: number;
   roleId: number = 0;
  
   @ViewChild('ocrModal') modalComponent!: ViewSummaryComponent;
   private modalRef: NgbModalRef;
   loadingPages = false;
 
   modalConfig: ModalConfig = {
     modalTitle: 'Sacred Pages',
     dismissButtonLabel: 'Close',
     closeButtonLabel: 'Close',
   };
 
   openViewModal(element: any) {
    const modalRef = this.modalService.open(ViewSummaryComponent, {
      size: 'xl',        // large modal
      backdrop: 'static',
      centered: true,
      //fullscreen: true   // ✅ FULL SCREEN
    });
  
    modalRef.componentInstance.documentName = element.DocumentName;
    modalRef.componentInstance.summaryId = element.SummaryId;
    modalRef.componentInstance.statusId = element.Status;      
    modalRef.componentInstance.currentRoleId = this.roleId;
    modalRef.result.then((result) => {
      if (result === true) { 
        this.SummaryDataGet();
      }
    }).catch(() => {
      // modal dismissed
    });
  }
  
  SummaryDataGet() {
    const startIndex = this.currentPage;
    const pageSize = this.itemsPerPage;
    const searchBy = this.searchQuery ? '' : '';
    const searchCriteria = this.searchQuery;
  
    this._service
     .SummaryDataGet(
        startIndex,
        pageSize,
        searchBy,
        searchCriteria
      )
      .subscribe((response: any) => {
        this.rolesListSubject.next(response);
        this.totalRecords = response[0].TotalCount;
        this.totalPages = Math.ceil(this.totalRecords / this.itemsPerPage);
      });
  }
  
    onSearch(target: EventTarget | null): void {
      if (target instanceof HTMLInputElement) {
        this.searchQuery = target.value;
        this.currentPage = 1;
        this.SummaryDataGet();
      }
    }
  
    onPageChange(page: number) {
      this.currentPage = page;
      this.SummaryDataGet();
      this.cdRef.detectChanges(); 
    }
    onPageSizeChange(newSize: number) {
      this.itemsPerPage = newSize;
      this.SummaryDataGet();
      this.cdRef.detectChanges();
     }
getStatusLabel(statusId: number): string {
  switch (statusId) {
    case 0:  return 'Pending';
    case 1:  return 'Checked';
    case 2:  return 'verified';
    case 3:  return 'Approve';
    default: return 'Reviewed';
  }
}

getStatusClass(statusId: number): string {
  switch (statusId) {
    case 0:  return 'badge-pending'; //'badge-processing';
    case 1:  return 'badge-processing';
    case 2:  return 'badge-partially-verified';
    case 3:  return 'badge-verified';
    default: return 'badge-pending';
  }
}

}
