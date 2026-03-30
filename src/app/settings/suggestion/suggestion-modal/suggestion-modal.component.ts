import { Component, Input, OnInit } from '@angular/core';
import { ServiceService } from '../../settings.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-suggestion-modal',
  templateUrl: './suggestion-modal.component.html',
  styleUrls: ['./suggestion-modal.component.scss']
})
export class SuggestionModalComponent implements OnInit {

  @Input() documentId!: number;
  @Input() documentPageId!: number;
  @Input() documentName!: string;

  suggestionPages: any[] = [];
  isLoading: boolean = false;

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  constructor(
    private service: ServiceService,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.loadSuggestionPages();
  }

  loadSuggestionPages() {
    if (!this.documentId || !this.documentPageId) return;

    this.isLoading = true;

    this.service
      .getSuggestionPages(this.documentId, this.documentPageId, 1, 10)
      .subscribe({
        next: (res: any[]) => {
          this.suggestionPages = res;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  saveAll() {

  const lsValue = localStorage.getItem(this.authLocalStorageToken);
  const userData = lsValue ? JSON.parse(lsValue) : null;

  this.suggestionPages.forEach(p => {

    const model = {
      documentPageId: p.documentpageid ?? p.documentPageId,
      documentId: this.documentId,
      pageNumber: p.pagenumber ?? p.pageNumber,
      extractedText: p.extractedtext ?? p.extractedText,
      statusId: p.statusid ?? p.statusId ?? 0,
      userId: userData?.id ?? 0,
      roleId: userData?.roleId ?? 0
    };

    this.service.saveDocumentPage(model).subscribe({
      next: () => {
        console.log('Saved page:', model.pageNumber);
      },
      error: () => {
        console.log('Error saving page:', model.pageNumber);
      }
    });

  });

  Swal.fire('Success', 'Page saved ✅', 'success');
}
}