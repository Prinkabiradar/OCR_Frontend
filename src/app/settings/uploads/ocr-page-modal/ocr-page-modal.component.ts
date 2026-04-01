import {
  ChangeDetectorRef,
  Component,
  Input,
  TemplateRef,
  ViewChild,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ServiceService } from '../../settings.service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Editor, Toolbar } from 'ngx-editor';

@Component({
  selector: 'app-ocr-page-modal',
  templateUrl: './ocr-page-modal.component.html',
  styleUrls: ['./ocr-page-modal.component.scss'],
})
export class OcrPageModalComponent implements OnDestroy {
  @Input() modalConfig: any;
  @Input() roleId: number = 0;
  @Input() currentUserId: number = 0;

  documentName: string = '';
  documentId: number | null = null;
  suggestedPages: any[] = [];
  suggestions: any[] = [];

  pageList: any[] = [];
  currentPage: number = 1;
  pageSize: number = 1;
  loading: boolean = false;

  editedTexts: any = {};
  savingRows: any = {};
  savedRows: any = {};
  savingAll: boolean = false;

  private modalRef!: NgbModalRef;
  private saveTimeout: any;

  @ViewChild('ocrPageModal')
  private modalContent!: TemplateRef<any>;

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
  constructor(
    private modalService: NgbModal,
    private service: ServiceService,
    private cdr: ChangeDetectorRef,
  ) {}

  pageEditors: { [id: number]: Editor } = {};

  pageToolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['blockquote'],
    ['align_left', 'align_center', 'align_right'],
    ['format_clear'],
  ];
  summaryEditor: Editor = new Editor();
summaryToolbar: Toolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['ordered_list', 'bullet_list'],
  [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
  ['blockquote'],
  ['align_left', 'align_center', 'align_right'],
  ['format_clear'],
];

summary           : string  = '';
summaryId         : number  = 0;
summaryFromCache  : boolean = false;
summaryDirty      : boolean = false;
isSummarizing     : boolean = false;
isSavingSummary   : boolean = false;
showSummary       : boolean = false;
isSpeaking        : boolean = false;
summaryUpdatedAt  : Date | null = null;

summarizeDocument() {
  if (!this.documentName) return;
  this.isSummarizing = true;
  this.summary       = '';
  this.showSummary   = false;
  this.summaryDirty  = false;
  this.summaryId     = 0;
  this.cdr.detectChanges();

  this.service.summarizeDocument(this.documentName).subscribe({
    next: (res: any) => {
      const raw: string = res.summary.summary || '';
      this.summary          = this.markdownToHtml(raw);
      this.summaryId        = res.summary.summaryId ?? 0;
      this.summaryFromCache = res.summary.fromCache;
      this.summaryUpdatedAt = res.summary.updatedAt ? new Date(res.summary.updatedAt) : null;
      this.isSummarizing    = false;
      this.showSummary      = true;
      this.summaryDirty     = false;
      this.cdr.detectChanges();
    },
    error: () => { this.isSummarizing = false; this.cdr.detectChanges(); }
  });
}

private markdownToHtml(text: string): string {
  if (text.trim().startsWith('<')) return text;
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/^\* (.+)$/gm,    '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hul\/])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

saveSummary() {
  if (!this.documentName || !this.summary.trim()) return;
  this.isSavingSummary = true;
  this.cdr.detectChanges();

  const lsValue  = localStorage.getItem(this.authLocalStorageToken);
  const userData = lsValue ? JSON.parse(lsValue) : null;
  const userId   = userData?.id     ?? 0;
  const roleId   = userData?.roleId ?? 0;

  this.service.saveSummary(this.documentName, this.summary, this.summaryId, userId, roleId).subscribe({
    next: (res: any) => {
      this.summaryId        = res.summaryId ?? this.summaryId;
      this.summaryFromCache = true;
      this.summaryUpdatedAt = res.updatedAt ? new Date(res.updatedAt) : null;
      this.isSavingSummary  = false;
      this.summaryDirty     = false;
      this.cdr.detectChanges();
      Swal.fire({ icon: 'success', title: 'Saved!', text: 'Summary saved successfully', timer: 1500, showConfirmButton: false });
    },
    error: () => {
      this.isSavingSummary = false;
      this.cdr.detectChanges();
      Swal.fire({ icon: 'error', title: 'Error!', text: 'Failed to save summary' });
    }
  });
}

onSummaryEdit() {
  this.summaryDirty = true;
}

speakText(text: string) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = 'en-IN';
  this.isSpeaking = true;
  utterance.onend = () => { this.isSpeaking = false; this.cdr.detectChanges(); };
  window.speechSynthesis.speak(utterance);
  this.cdr.detectChanges();
}

stopSpeaking() {
  window.speechSynthesis.cancel();
  this.isSpeaking = false;
  this.cdr.detectChanges();
}


  private preserveLines(text: string): string {
    if (!text) return '';
    if (text.trim().startsWith('<')) return text; // already HTML
  
    return text
      .split('\n')
      .map(line => {
        const trimmed = line.trimEnd();
        if (!trimmed) return '<p><br></p>';
        if (trimmed.startsWith('### ')) return `<h3>${this.inlineFormat(trimmed.slice(4))}</h3>`;
        if (trimmed.startsWith('## '))  return `<h2>${this.inlineFormat(trimmed.slice(3))}</h2>`;
        if (trimmed.startsWith('# '))   return `<h1>${this.inlineFormat(trimmed.slice(2))}</h1>`;
        if (trimmed.startsWith('* ') || trimmed.startsWith('- '))
          return `<p>${this.inlineFormat(trimmed.slice(2))}</p>`;
        return `<p>${this.inlineFormat(trimmed)}</p>`;
      })
      .join('');
  }
  
  private inlineFormat(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }
  
  getOrCreateEditor(id: number): Editor {
    if (!this.pageEditors[id]) {
      this.pageEditors[id] = new Editor();
    }
    return this.pageEditors[id];
  }
  // 🔥 OPEN MODAL
  open(): Promise<boolean> {
    this.resetState();
    this.loadPages();

    return new Promise((resolve) => {
      this.modalRef = this.modalService.open(this.modalContent, {
        size: 'xl',
        scrollable: true,
      });
      this.modalRef.result.then(resolve, resolve);
    });
  }

  resetState() {
    this.currentPage = 1;
    this.pageList = [];
    this.editedTexts = {};
    this.savingRows = {};
    this.savedRows = {};
    
    this.summary        = '';
    this.summaryId      = 0;
    this.summaryFromCache = false;
    this.summaryDirty   = false;
    this.showSummary    = false;
    this.isSummarizing  = false;
    this.isSavingSummary = false;
  }

  // 🔥 LOAD DATA (FIXED PAGINATION)
  loadPages(): void {
    if (!this.documentId) return;

    this.loading = true;

    const userId = this.currentUserId;

    const startIndex = this.currentPage * this.pageSize;

    this.service
      .getDocumentByDocumentName(this.documentId, startIndex, this.pageSize)
      .subscribe({
        next: (res: any) => {
  const safeRes = Array.isArray(res) ? res : [];

  this.pageList = safeRes.map((x: any) => ({
    DocumentPageId: x.documentpageid,
    DocumentId: x.documentid,
    PageNumber: x.pagenumber,
    ExtractedText: x.extractedtext,
    StatusId: x.statusid,

    // ✅ Check it's a non-empty string (rejects {}, null, undefined)
    Suggestion: typeof x.suggestiontext === 'string' && x.suggestiontext.trim() !== ''
      ? x.suggestiontext
      : '',

    SuggestedPage: typeof x.suggestionpagenumber === 'number'
      ? x.suggestionpagenumber
      : null,

    SuggestionId: typeof x.suggestionid === 'number'
      ? x.suggestionid
      : null,
  }));

          const allSuggestionsRaw = safeRes.length > 0 ? safeRes[0]?.allsuggestions : null;

  if (typeof allSuggestionsRaw === 'string' && allSuggestionsRaw.trim() !== '') {
    this.suggestedPages = allSuggestionsRaw
      .split('|')
      .map((entry: string) => {
        const parts = entry.split(':');
        return {
          PageNumber: parseInt(parts[0]),
          SuggestionId: parseInt(parts[2]),
        };
      })
      .filter(s => !isNaN(s.PageNumber) && !isNaN(s.SuggestionId));
  } else {
    this.suggestedPages = []; // ✅ safely handles {} case
  }

  this.pageList.forEach((item) => {
    if (!this.editedTexts[item.DocumentPageId]) {
      this.editedTexts[item.DocumentPageId] = this.preserveLines(item.ExtractedText);
    }
    // ensure editor instance exists
    this.getOrCreateEditor(item.DocumentPageId);
  });

  this.loading = false;      // ✅ now always reached
  this.cdr.detectChanges();
},
error: () => {
  this.loading = false;
},
      });
  }

  reviewSuggestion(s: any, action: string) {
    Swal.fire({
      title: 'Are you sure?',
      text: `You want to mark as ${action}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
    }).then((result) => {
      if (result.isConfirmed) {
        const lsValue = localStorage.getItem(this.authLocalStorageToken);
        const userData = lsValue ? JSON.parse(lsValue) : null;

        const model = {
          suggestionId: s.SuggestionId, // ← match mapped property names
          documentPageId: s.DocumentPageId,
          action: action,
          reviewedBy: userData?.id ?? 0,
          roleId: userData?.roleId ?? 0,
        };

        this.service.reviewSuggestion(model).subscribe({
          next: () => {
            // Remove suggestion from the item in pageList
            const page = this.pageList.find(
              (x) => x.DocumentPageId === s.DocumentPageId,
            );
            if (page) {
              page.Suggestion = ''; // ← clear suggestion on UI
            }

            // Remove from suggestedPages
            this.suggestedPages = this.suggestedPages.filter(
              (p) => p !== s.PageNumber,
            );

            this.cdr.detectChanges(); // ← fix: cdr not cd

            Swal.fire('Success', `Marked as ${action}`, 'success');
          },
          error: () => {
            Swal.fire('Error', 'Failed to update', 'error');
          },
        });
      }
    });
  }

  // 🔥 AUTO SAVE (DEBOUNCE)
  onEditorChange(item: any, html: string): void {
    this.editedTexts[item.DocumentPageId] = html;
  }

  isDirty(item: any): boolean {
    return this.editedTexts[item.DocumentPageId] !== item.ExtractedText;
  }

  get suggestedPageNumbers(): string {
  if (!this.suggestedPages.length) return '';
  return this.suggestedPages.map(s => 'Page ' + s.PageNumber).join(', ');
}
  get hasDirtyRows(): boolean {
    return this.pageList.some((x) => this.isDirty(x));
  }

  // 🔥 ROLE-BASED STATUS FLOW
  // 🔥 ROLE-BASED STATUS FLOW
  getNextStatus(statusId: number): number {
    switch (this.roleId) {
      case 1:
        // Role 1: fresh start or restart after rejection
        return statusId === 0 || statusId === 7 ? 1 : statusId;

      case 2:
        return statusId === 0 || statusId === 7 ? 1 : statusId;

      case 3:
        return statusId === 1 || statusId === 7 ? 2 : statusId;

      case 4:
        return statusId === 2 || statusId === 7 ? 3 : statusId;

      default:
        return statusId;
    }
  }

  getStatusLabel(statusId: number): string {
    switch (statusId) {
      case 0:
        return 'Pending';
      case 1:
        return 'Checked';
      case 2:
        return 'Verified';
      case 3:
        return 'Approved';
      case 4:
        return 'Partially Checked';
      case 5:
        return 'Partially Verified';
      case 6:
        return 'Partially Approved';
      case 7:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 0:
        return 'badge-red';
      case 1:
      case 4:
        return 'badge-orange';
      case 2:
      case 5:
        return 'badge-yellow';
      case 3:
      case 6:
        return 'badge-green';
      case 7:
        return 'badge-rejected';
      default:
        return 'badge-default';
    }
  }

  get canReject(): boolean {
    return this.roleId === 2 || this.roleId === 3;
  }

  rejectRow(item: any) {
    if (this.savingRows[item.DocumentPageId]) return;

    Swal.fire({
      title: 'Reject Page',
      input: 'textarea',
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Enter reason for rejection...',
      inputAttributes: { 'aria-label': 'Rejection reason' },
      showCancelButton: true,
      confirmButtonText: 'Reject',
      confirmButtonColor: '#dc3545',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Please enter a rejection reason.';
        }
        return null;
      },
    }).then((result) => {
      if (!result.isConfirmed) return;

      const rejectionReason = result.value;
      const oldStatus = item.StatusId;

      const payload = {
        documentPageId: item.DocumentPageId,
        documentId: item.DocumentId,
        pageNumber: item.PageNumber,
        extractedText:
          this.editedTexts[item.DocumentPageId] ?? item.ExtractedText,
        statusId: 7, // ← Rejected
        userId: this.currentUserId,
        rejectionReason: rejectionReason,
        roleId: this.roleId,
      };

      this.savingRows[item.DocumentPageId] = true;
      item.StatusId = 7; // optimistic update

      this.service.saveDocumentPage(payload).subscribe({
        next: () => {
          this.savingRows[item.DocumentPageId] = false;
          Swal.fire('Rejected', 'Page has been rejected.', 'warning');
          this.cdr.detectChanges();
        },
        error: () => {
          item.StatusId = oldStatus; // rollback
          this.savingRows[item.DocumentPageId] = false;
          Swal.fire('Error', 'Rejection failed', 'error');
        },
      });
    });
  }

  // 🔥 SAVE ROW (OPTIMISTIC UI)
  saveRow(item: any) {
  if (this.savingRows[item.DocumentPageId]) return;

  const oldText = item.ExtractedText;
  const oldStatus = item.StatusId;
  const lsValue = localStorage.getItem(this.authLocalStorageToken);
  const userData = lsValue ? JSON.parse(lsValue) : null;
  const userId = this.currentUserId;
  this.roleId = userData?.roleId ?? 0;

  const payload = {
    documentPageId: item.DocumentPageId,
    documentId: item.DocumentId,
    pageNumber: item.PageNumber,
    extractedText: this.editedTexts[item.DocumentPageId],
    statusId: this.getNextStatus(item.StatusId),
    userId: this.currentUserId,
    roleId: this.roleId,
    rejectionReason: '',
  };

  this.savingRows[item.DocumentPageId] = true;

  // optimistic update
  item.ExtractedText = payload.extractedText;
  item.StatusId = payload.statusId;

  this.service.saveDocumentPage(payload).subscribe({
    next: () => {
      this.savedRows[item.DocumentPageId] = true;
      this.savingRows[item.DocumentPageId] = false;

      // ✅ SUCCESS SWAL
      Swal.fire({
        icon: 'success',
        title: 'Saved Successfully',
        text: `Page ${item.PageNumber} has been saved.`,
        timer: 1500,
        showConfirmButton: false
      });

      setTimeout(() => {
        this.savedRows[item.DocumentPageId] = false;
      }, 2000);
    },

    error: () => {
      item.ExtractedText = oldText;
      item.StatusId = oldStatus;
      this.savingRows[item.DocumentPageId] = false;

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Save failed'
      });
    },
  });
}

  // 🔥 SAVE ALL
  saveAll() {
    if (!this.hasDirtyRows) return;

    this.savingAll = true;

    const requests = this.pageList.map((item) =>
      this.service.saveDocumentPage({
        documentPageId: item.DocumentPageId,
        documentId: item.DocumentId,
        pageNumber: item.PageNumber,
        extractedText: this.editedTexts[item.DocumentPageId],
        statusId: this.getNextStatus(item.StatusId),
        userId: this.currentUserId, // ← ADD
        roleId: this.roleId, // ← ADD
        rejectionReason: '', // ← ADD (empty for normal save)
      }),
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.savingAll = false;
        Swal.fire('Success', 'All changes saved', 'success');
      },
      error: () => {
        this.savingAll = false;
      },
    });
  }

  // 🔥 PAGINATION
  get hasPrevious() {
    return this.currentPage > 1;
  }
  get hasNext() {
    return this.pageList.length === this.pageSize;
  }

  goToPrevious() {
    if (!this.hasPrevious) return;
    this.currentPage--;
    this.loadPages();
  }

  goToNext() {
    if (!this.hasNext) return;
    this.currentPage++;
    this.loadPages();
  }

  // 🔥 CLOSE WITH WARNING
  close() {
    // if (this.hasDirtyRows) {
    //   Swal.fire({
    //     title: 'Unsaved changes',
    //     showCancelButton: true,
    //   }).then((res) => {
    //     if (res.isConfirmed) this.modalRef.close();
    //   });
    // } else {
      this.modalRef.close();
    // }
  }

  // 🔥 AUTO UNLOCK
  ngOnDestroy() {
    // Destroy all page editors
    Object.values(this.pageEditors).forEach(editor => editor.destroy());
    this.summaryEditor.destroy(); 
    if (this.documentId) {
      this.service.manageLock(this.documentId, this.currentUserId, 'UNLOCK').subscribe();
    }
  }

  // 🔥 CTRL + S
  @HostListener('document:keydown.control.s', ['$event'])
  handleSave(event: KeyboardEvent) {
    event.preventDefault();
    this.saveAll();
  }
}
