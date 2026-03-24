import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ServiceService } from '../../settings.service';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-view-summary',
  templateUrl: './view-summary.component.html',
  styleUrl: './view-summary.component.scss'
})
export class ViewSummaryComponent {
  @Input() documentName: string;
  @Input() summaryId: number;

  summaryText: string = '';
  loading = false;
  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
   

  constructor(
    public activeModal: NgbActiveModal,
    private service: ServiceService
  ) {}

  ngOnInit(): void {
    this.getSummary();
  }

 
  getSummary() {
    this.loading = true;

    this.service.summarizeDocument(this.documentName).subscribe({
      next: (res) => {
        this.summaryText = res.summary.summary || '';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

 
  saveSummary() {

    const lsValue = localStorage.getItem(this.authLocalStorageToken);
    const userData = lsValue ? JSON.parse(lsValue) : null;
    const userId = userData?.id ?? 0;
    const roleId = userData?.roleId ?? 0;

    this.service.saveSummary(
      this.documentName,
      this.summaryText,
      this.summaryId || 0,
       userData?.id??0,
       userData?.roleId ?? 0
    ).subscribe({
      next: () => { 
        Swal.fire({
          icon: 'success',
          title: 'Saved!',
          text: 'Summary saved successfully',
          confirmButtonText: 'OK'
        }).then((result) => {
          if (result.isConfirmed) { 
            this.activeModal.close(true);
          }
  
        });
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Failed to save summary'
        });
      }
    });
  }

  close() {
    this.activeModal.dismiss();
  }
}
