import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ServiceService } from '../../settings.service';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';
import { Editor, Toolbar } from 'ngx-editor';

@Component({
  selector: 'app-view-summary',
  templateUrl: './view-summary.component.html',
  styleUrl: './view-summary.component.scss'
})
export class ViewSummaryComponent implements OnInit, OnDestroy {
  @Input() documentName: string;
  @Input() summaryId: number;
  @Input() statusId: number = 0;      
  @Input() currentRoleId: number = 0;

  editor: Editor;
  toolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['blockquote', 'code'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
    ['horizontal_rule', 'format_clear'],
  ];

  // ngx-editor works with HTML string
  editorContent: string = '';
  loading = false;

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  constructor(
    public activeModal: NgbActiveModal,
    private service: ServiceService
  ) {}

  ngOnInit(): void {
    this.editor = new Editor();
    this.getSummary();
  }

  ngOnDestroy(): void {
    this.editor.destroy(); // important: prevents memory leaks
  }
  get isReadOnly(): boolean {
    if ((this.statusId === 0 || this.statusId === 1) && (this.currentRoleId === 2 || this.currentRoleId === 3)) {
      return true;
    }
    // statusId=2 → roleId 1 or 3 cannot edit
    if (this.statusId === 2 && (this.currentRoleId === 1 || this.currentRoleId === 3)) {
      return true;
    }
    // statusId=3 → roleId 1 or 2 cannot edit
    if (this.statusId === 3 && (this.currentRoleId === 1 || this.currentRoleId === 2)) {
      return true;
    }
    return false;
  }
  getSummary() {
    this.loading = true;
    this.service.summarizeDocument(this.documentName).subscribe({
      next: (res) => {
        const raw: string = res.summary.summary || '';
        // If data is markdown, convert to HTML; if already HTML, use directly
        this.editorContent = this.markdownToHtml(raw);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // Simple markdown → HTML converter (no extra library needed)
  private markdownToHtml(text: string): string {
    return text
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Bullet points
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      // Line breaks
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(?!<[hul])(.+)$/gm, '<p>$1</p>')
      // Clean up empty tags
      .replace(/<p><\/p>/g, '');
  }

  saveSummary() {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);
    const userData = lsValue ? JSON.parse(lsValue) : null;

    // editorContent already holds the latest HTML from the editor
    this.service.saveSummary(
      this.documentName,
      this.editorContent,
      this.summaryId || 0,
      userData?.id ?? 0,
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