import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  TemplateRef,
  ViewChild,
  OnDestroy,
  HostListener,
  AfterViewChecked,
} from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ServiceService } from '../../settings.service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';

@Component({
  selector: 'app-ocr-page-modal',
  templateUrl: './ocr-page-modal.component.html',
  styleUrls: ['./ocr-page-modal.component.scss'],
})
export class OcrPageModalComponent implements OnDestroy, AfterViewChecked {
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
  itemsPerPage = 1;
  totalRecords: number = 0;
  selectedPageIndex: number = 0;
  pageJumpInput = '';
  swapToPageInput = '';
  textFileContent: string = '';
  statusTargetPageNumbers: number[] = [];
  loadingStatusTarget: boolean = false;
  swappingPages: boolean = false;

  editedTexts: any = {};
  savingRows: any = {};
  savedRows: any = {};
  savingAll: boolean = false;
  selectedItem: any = null;

  private modalRef!: NgbModalRef;
  private saveTimeout: any;

  @ViewChild('ocrPageModal')
  private modalContent!: TemplateRef<any>;

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  constructor(
    private modalService: NgbModal,
    private service: ServiceService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef<HTMLElement>,
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private router: Router,
  ) {}

  public CkEditor: any = (DecoupledEditor as any)?.default ?? DecoupledEditor;
  public ckEditorConfig = {
    toolbar: {
      shouldNotGroupWhenFull: true,
      items: [
        'undo',
        'redo',
        '|',
        'heading',
        '|',
        'fontFamily',
        'fontSize',
        'fontColor',
        'fontBackgroundColor',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'bulletedList',
        'numberedList',
        '|',
        'blockQuote',
        '|',
        'alignment',
        '|',
        'outdent',
        'indent',
      ],
    },
    fontFamily: {
      supportAllValues: true,
    },
    fontSize: {
      options: [9, 11, 13, 'default', 17, 19, 21, 27, 35],
      supportAllValues: true,
    },
    alignment: {
      options: ['left', 'center', 'right', 'justify'],
    },
    htmlSupport: {
      allow: [
        {
          name: /.*/,
          styles: true,
          classes: true,
          attributes: true,
        },
      ],
    },
    table: {
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
    },
    removePlugins: ['ImageUpload', 'EasyImage', 'CKFinder', 'CKFinderUploadAdapter'],
  };
  private summaryCkEditor: any = null;
  private pageCkEditors: { [id: number]: any } = {};
  private lastActiveCkEditable: HTMLElement | null = null;
  private readonly ckDebug = true;

  summary: string = '';
  summaryId: number = 0;
  summaryFromCache: boolean = false;
  summaryDirty: boolean = false;
  isSummarizing: boolean = false;
  isSavingSummary: boolean = false;
  showSummary: boolean = false;
  summaryExpanded: boolean = false;
  isSpeaking: boolean = false;
  summaryUpdatedAt: Date | null = null;
  summarySearchTerm: string = '';
  pageSearchTerms: { [id: number]: string } = {};
  private lastSummarySearchTerm: string = '';
  private lastPageSearchTerms: { [id: number]: string } = {};
  previewZoomByPage: { [documentPageId: number]: number } = {};

  readonly minPreviewZoom = 0.5;
  readonly maxPreviewZoom = 3;
  readonly previewZoomStep = 0.25;
  private dragPreviewState: {
    active: boolean;
    pageId: number | null;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  } = {
    active: false,
    pageId: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  };
  private previewBlobUrls: { [documentPageId: number]: string } = {};
  private previewLoadAttempted: { [documentPageId: number]: boolean } = {};
  private previewLoadingByPage: { [documentPageId: number]: boolean } = {};

  ngAfterViewChecked(): void {
    this.logCk('ngAfterViewChecked', {
      loading: this.loading,
      pageListCount: this.pageList.length,
      hasSummaryEditor: !!this.summaryCkEditor,
      pageEditorCount: Object.keys(this.pageCkEditors).length,
    });
    this.initializeSummaryEditor();
    this.initializePageEditors();
    this.syncSummaryEditorData();
    this.syncPageEditorsData();
  }

  // ─── FILE PREVIEW HELPERS ───────────────────────────────────────────────────

  /**
   * Determines file type from stored path extension.
   */
  getFileType(filePath: string): string {
    if (!filePath) return 'none';
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? ''))
      return 'image';
    if (ext === 'txt') return 'text';
    return 'none';
  }

  /**
   * Converts stored DB path → full public URL → sanitized SafeResourceUrl.
   * Adjust the split key ('uploads/') to match your server's folder name.
   */
  // getSafeUrl(filePath: string, pageNumber?: number): SafeResourceUrl {
  //   if (!filePath) return '';

  //   let normalized = filePath.replace(/\\/g, '/');

  //   const ext = normalized.split('.').pop()?.toLowerCase();

  //   // 🔥 Only modify for images
  //   if (pageNumber && ext !== 'pdf') {
  //     normalized = normalized.replace(
  //       /OCR\d+\.jpeg/,
  //       `page_${pageNumber}.jpeg`,
  //     );
  //   }

  //   // 🔥 IMPORTANT: Correct URL building
  //   let baseUrl = environment.BaseUrl;

  //   // ensure trailing slash
  //   if (!baseUrl.endsWith('/')) {
  //     baseUrl += '/';
  //   }

  //   // avoid duplicate uploads
  //   if (normalized.startsWith('uploads/')) {
  //     normalized = normalized.replace('uploads/', '');
  //   }

  //   const fullUrl = `${baseUrl}uploads/${normalized}`;


  //   return this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl);
  // }


  getSafeUrl(item: any): SafeResourceUrl {
    const raw = this.getRawUrl(item);
    const filePath = item?.FilePath ?? '';
    const ext = filePath?.split('.').pop()?.toLowerCase();
    const url = ext === 'pdf' && raw ? `${raw}#toolbar=0&navpanes=0` : raw;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getImageSafeUrl(item: any): SafeUrl {
    const raw = this.getRawUrl(item);
    return this.sanitizer.bypassSecurityTrustUrl(raw);
  }

  isPreviewLoading(item: any): boolean {
    const pageId = Number(item?.DocumentPageId);
    if (!Number.isFinite(pageId)) return false;
    return !!this.previewLoadingByPage[pageId];
  }

getRawUrl(item: any): string {
  const pageId = Number(item?.DocumentPageId);
  if (Number.isFinite(pageId) && this.previewBlobUrls[pageId]) {
    return this.previewBlobUrls[pageId];
  }
    return '';
  }

  private ensurePreviewLoaded(item: any): void {
    if (!item || !this.documentId) return;
    const pageId = Number(item?.DocumentPageId);
    const pageNumber = Number(item?.PageNumber ?? 1);
    if (!Number.isFinite(pageId) || !Number.isFinite(pageNumber)) return;
    if (this.previewBlobUrls[pageId]) return;
    if (this.previewLoadAttempted[pageId]) return;
    this.previewLoadAttempted[pageId] = true;
    this.previewLoadingByPage[pageId] = true;

    let baseUrl = environment.BaseUrl;
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    const qp = new URLSearchParams({
      documentId: String(this.documentId),
      pageNumber: String(pageNumber),
    });
    if (item?.FilePath) qp.set('filePath', String(item.FilePath));
    if (item?.JobId) qp.set('requestJobId', String(item.JobId));
    const apiUrl = `${baseUrl}api/DocumentPage/GetDocumentFile?${qp.toString()}`;

    this.fetchPreviewBlobWithFallback(pageId, pageNumber, apiUrl);
  }

  private fetchPreviewBlobWithFallback(pageId: number, pageNumber: number, apiUrl: string): void {
    this.http.get(apiUrl, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const objectUrl = URL.createObjectURL(blob);
        this.previewBlobUrls[pageId] = objectUrl;
        this.previewLoadingByPage[pageId] = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.previewLoadingByPage[pageId] = false;
        const pageProtocol = (typeof window !== 'undefined' && window.location?.protocol) || '';
        const canHttpFallback =
          err?.status === 0 &&
          apiUrl.startsWith('https://localhost:7045/') &&
          pageProtocol !== 'https:';

        if (canHttpFallback) {
          const fallbackUrl = apiUrl.replace(
            'https://localhost:7045/',
            'http://localhost:5247/'
          );
          this.previewLoadingByPage[pageId] = true;
          this.http.get(fallbackUrl, { responseType: 'blob' }).subscribe({
            next: (blob: Blob) => {
              const objectUrl = URL.createObjectURL(blob);
              this.previewBlobUrls[pageId] = objectUrl;
              this.previewLoadingByPage[pageId] = false;
              this.cdr.detectChanges();
            },
            error: (fallbackErr: HttpErrorResponse) => {
              this.previewLoadingByPage[pageId] = false;
              delete this.previewLoadAttempted[pageId];
              this.cdr.detectChanges();
            },
          });
          return;
        }

        // Allow retry if this page failed once (network/auth/transient timing).
        delete this.previewLoadAttempted[pageId];
        this.cdr.detectChanges();
      },
    });
  }

  getPreviewZoom(item: any): number {
    const key = Number(item?.DocumentPageId);
    if (!Number.isFinite(key)) return 1;
    return this.previewZoomByPage[key] ?? 1;
  }

  zoomInPreview(item: any): void {
    this.setPreviewZoom(item, this.getPreviewZoom(item) + this.previewZoomStep);
  }

  zoomOutPreview(item: any): void {
    this.setPreviewZoom(item, this.getPreviewZoom(item) - this.previewZoomStep);
  }

  resetPreviewZoom(item: any): void {
    this.setPreviewZoom(item, 1);
  }

  private setPreviewZoom(item: any, zoom: number): void {
    const key = Number(item?.DocumentPageId);
    if (!Number.isFinite(key)) return;
    const clamped = Math.max(this.minPreviewZoom, Math.min(this.maxPreviewZoom, zoom));
    this.previewZoomByPage[key] = Number(clamped.toFixed(2));
  }

  onImagePanStart(event: MouseEvent, item: any): void {
    if (this.getFileType(item?.FilePath) !== 'image') return;
    if (this.getPreviewZoom(item) <= 1) return;

    const container = event.currentTarget as HTMLElement | null;
    const pageId = Number(item?.DocumentPageId);
    if (!container || !Number.isFinite(pageId)) return;

    this.dragPreviewState = {
      active: true,
      pageId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: container.scrollLeft,
      startScrollTop: container.scrollTop,
    };
  }

  onImagePanMove(event: MouseEvent): void {
    if (!this.dragPreviewState.active) return;
    const container = event.currentTarget as HTMLElement | null;
    if (!container) return;

    const dx = event.clientX - this.dragPreviewState.startX;
    const dy = event.clientY - this.dragPreviewState.startY;
    container.scrollLeft = this.dragPreviewState.startScrollLeft - dx;
    container.scrollTop = this.dragPreviewState.startScrollTop - dy;
    event.preventDefault();
  }

  onImagePanEnd(): void {
    this.dragPreviewState.active = false;
    this.dragPreviewState.pageId = null;
  }

  isImagePanning(item: any): boolean {
    return (
      this.dragPreviewState.active &&
      this.dragPreviewState.pageId === Number(item?.DocumentPageId)
    );
  }
  // ─── SUMMARY ────────────────────────────────────────────────────────────────

  summarizeDocument() {
    if (!this.documentName) return;
    this.logCk('summarizeDocument:start', { documentName: this.documentName });
    this.isSummarizing = true;
    this.summary = '';
    this.showSummary = false;
    this.summaryExpanded = false;
    this.summaryDirty = false;
    this.summaryId = 0;
    this.cdr.detectChanges();

    this.service.summarizeDocument(this.documentName).subscribe({
      next: (res: any) => {
        const raw: string = res.summary.summary || '';
        this.logCk('summarizeDocument:api-success', {
          rawLength: raw?.length ?? 0,
          summaryId: res.summary.summaryId ?? 0,
          rawPreview: (raw || '').slice(0, 200),
        });
        this.summary = this.markdownToHtml(raw);
        this.summaryId = res.summary.summaryId ?? 0;
        this.summaryFromCache = res.summary.fromCache;
        this.summaryUpdatedAt = res.summary.updatedAt
          ? new Date(res.summary.updatedAt)
          : null;
        this.isSummarizing = false;
        this.showSummary = true;
        this.summaryDirty = false;
        this.syncSummaryEditorData();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSummarizing = false;
        this.cdr.detectChanges();
      },
    });
  }

  private markdownToHtml(text: string): string {
    if (text.trim().startsWith('<')) return this.normalizeIndentMarkupForEditor(text);
    return text
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(?!<[hul\/])(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');
  }

  saveSummary() {
    this.summary = this.normalizeIndentMarkupForStorage(this.getSummaryEditorContent());
    if (!this.documentName || !this.summary.trim()) return;
    this.isSavingSummary = true;
    this.cdr.detectChanges();

    const lsValue = localStorage.getItem(this.authLocalStorageToken);
    const userData = lsValue ? JSON.parse(lsValue) : null;
    const userId = userData?.id ?? 0;
    const roleId = userData?.roleId ?? 0;

    this.service
      .saveSummary(
        this.documentName,
        this.summary,
        this.summaryId,
        userId,
        roleId,
      )
      .subscribe({
        next: (res: any) => {
          this.summaryId = res.summaryId ?? this.summaryId;
          this.summaryFromCache = true;
          this.summaryUpdatedAt = res.updatedAt
            ? new Date(res.updatedAt)
            : null;
          this.isSavingSummary = false;
          this.summaryDirty = false;
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'success',
            title: 'Saved!',
            text: 'Summary saved successfully',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: () => {
          this.isSavingSummary = false;
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to save summary',
          });
        },
      });
  }

  onSummaryEdit() {
    this.summaryDirty = true;
  }

  private getSummaryEditorContent(): string {
    const wrapperContentEditable = this.queryEditorElement(
      `[data-summary-editor-wrap="true"] [contenteditable="true"]`,
    );
    if (wrapperContentEditable) {
      return wrapperContentEditable.innerHTML || '';
    }
    return this.summary || '';
  }

  private initializeSummaryEditor(): void {
    if (this.summaryCkEditor) return;
    const host = this.queryEditorElement(
      '[data-summary-ckeditor="true"]',
    );
    this.logCk('summaryEditor:host-check', { hasHost: !!host, showSummary: this.showSummary });
    if (!host) return;
    this.logCk('summaryEditor:create-attempt', {
      hasHost: !!host,
      currentSummaryLength: this.summary?.length ?? 0,
      editorFactoryType: typeof this.CkEditor?.create,
    });

    this.CkEditor.create(host, this.ckEditorConfig).then((editor: any) => {
      this.summaryCkEditor = editor;
      const toolbarHost = this.queryEditorElement('[data-summary-ckeditor-toolbar="true"]');
      if (toolbarHost && editor?.ui?.view?.toolbar?.element) {
        toolbarHost.innerHTML = '';
        toolbarHost.appendChild(editor.ui.view.toolbar.element);
      }
      editor.setData(this.summary || '');
      this.restoreFirstLineIndentVisuals(editor, this.summary || '');
      this.logCk('summaryEditor:create-success', {
        initialDataLength: (this.summary || '').length,
      });
      editor.model.document.on('change:data', () => {
        this.summary = editor.getData();
        this.logCk('summaryEditor:change', {
          dataLength: this.summary?.length ?? 0,
        });
        this.onSummaryEdit();
      });
    }).catch(() => {});
  }

  private syncSummaryEditorData(): void {
    if (!this.summaryCkEditor) return;
    const current = this.summaryCkEditor.getData() || '';
    const next = this.summary || '';
    if (current !== next) {
      this.logCk('summaryEditor:sync-setData', {
        currentLength: current.length,
        nextLength: next.length,
      });
      this.summaryCkEditor.setData(next);
      this.restoreFirstLineIndentVisuals(this.summaryCkEditor, next);
    }
  }

  private initializePageEditors(): void {
    const hosts = this.queryEditorElements(
      '[data-page-ckeditor]',
    );
    this.logCk('pageEditor:host-scan', {
      hostCount: hosts.length,
      pageListCount: this.pageList.length,
      loading: this.loading,
    });
    hosts.forEach((host) => {
      const pageId = Number(host.getAttribute('data-page-ckeditor'));
      if (!Number.isFinite(pageId) || this.pageCkEditors[pageId]) return;
      this.logCk('pageEditor:create-attempt', {
        pageId,
        hasHost: !!host,
        seedDataLength: (this.editedTexts[pageId] || '').length,
      });

      this.CkEditor.create(host, this.ckEditorConfig).then((editor: any) => {
        this.pageCkEditors[pageId] = editor;
        const toolbarHost = this.queryEditorElement(
          `[data-page-ckeditor-toolbar="${pageId}"]`,
        );
        if (toolbarHost && editor?.ui?.view?.toolbar?.element) {
          toolbarHost.innerHTML = '';
          toolbarHost.appendChild(editor.ui.view.toolbar.element);
        }
        editor.setData(this.editedTexts[pageId] || '');
        this.restoreFirstLineIndentVisuals(editor, this.editedTexts[pageId] || '');
        this.logCk('pageEditor:create-success', { pageId });
        const pageItem = this.pageList.find((x) => Number(x?.DocumentPageId) === pageId);
        if (pageItem && !this.canEdit(pageItem)) {
          editor.enableReadOnlyMode(`page-${pageId}`);
        }
        editor.model.document.on('change:data', () => {
          const value = editor.getData();
          this.editedTexts[pageId] = value;
          this.logCk('pageEditor:change', {
            pageId,
            dataLength: value?.length ?? 0,
          });
        });
      }).catch(() => {});
    });
  }

  private syncPageEditorsData(): void {
    Object.keys(this.pageCkEditors).forEach((key) => {
      const pageId = Number(key);
      const editor = this.pageCkEditors[pageId];
      if (!editor) return;
      const next = this.editedTexts[pageId] || '';
      const current = editor.getData() || '';
      if (current !== next) {
        this.logCk('pageEditor:sync-setData', {
          pageId,
          currentLength: current.length,
          nextLength: next.length,
        });
        editor.setData(next);
        this.restoreFirstLineIndentVisuals(editor, next);
      }
    });
  }

  findInSummaryEditor(direction: 'next' | 'prev' = 'next') {
    const query = this.summarySearchTerm?.trim();
    if (!query) {
      Swal.fire('Enter search text', 'Type a word or phrase to search in summary.', 'info');
      return;
    }

    this.focusEditorWithin('[data-summary-editor-wrap="true"]');

    if (this.lastSummarySearchTerm !== query) {
      window.getSelection()?.removeAllRanges();
    }

    const found = this.runBrowserFind(query, direction === 'prev');
    this.lastSummarySearchTerm = query;

    if (found) {
      this.scrollCurrentSelectionIntoView();
    }

    if (!found) {
      Swal.fire('No match found', `Could not find "${query}" in summary.`, 'info');
    }
  }

  findInPageEditor(pageId: number, direction: 'next' | 'prev' = 'next') {
    const query = (this.pageSearchTerms[pageId] || '').trim();
    if (!query) {
      Swal.fire('Enter search text', 'Type a word or phrase to search in page text.', 'info');
      return;
    }

    this.focusEditorWithin(`[data-page-editor-wrap="${pageId}"]`);

    if (this.lastPageSearchTerms[pageId] !== query) {
      window.getSelection()?.removeAllRanges();
    }

    const found = this.runBrowserFind(query, direction === 'prev');
    this.lastPageSearchTerms[pageId] = query;

    if (found) {
      this.scrollCurrentSelectionIntoView();
    }

    if (!found) {
      Swal.fire('No match found', `Could not find "${query}" on this page.`, 'info');
    }
  }

  private focusEditorWithin(wrapperSelector: string) {
    const wrapper = this.queryEditorElement(wrapperSelector);
    const editable = wrapper?.querySelector('[contenteditable="true"]') as HTMLElement | null;
    editable?.focus();
  }

  private runBrowserFind(query: string, backwards = false): boolean {
    const browserWindow = window as Window & {
      find?: (
        text: string,
        caseSensitive?: boolean,
        backwards?: boolean,
        wrapAround?: boolean,
        wholeWord?: boolean,
        searchInFrames?: boolean,
        showDialog?: boolean,
      ) => boolean;
    };

    if (typeof browserWindow.find !== 'function') {
      return false;
    }

    return browserWindow.find(
      query,
      false,
      backwards,
      true,
      false,
      false,
      false,
    );
  }

  private scrollCurrentSelectionIntoView() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const node = range.startContainer?.parentElement;
    node?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }

  speakText(text: string) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    this.isSpeaking = true;
    utterance.onend = () => {
      this.isSpeaking = false;
      this.cdr.detectChanges();
    };
    window.speechSynthesis.speak(utterance);
    this.cdr.detectChanges();
  }

  stopSpeaking() {
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
    this.cdr.detectChanges();
  }

  // ─── EDITOR HELPERS ─────────────────────────────────────────────────────────

  /**
   * Get the current HTML content from the ngx-editor instance.
   * This is crucial because toolbar button clicks (indent, bold, etc.) don't trigger ngModelChange.
   */
  private getEditorContent(editorId: number): string {
    const wrapperContentEditable = this.queryEditorElement(
      `[data-page-editor-wrap="${editorId}"] [contenteditable="true"]`,
    );
    if (wrapperContentEditable) {
      return this.normalizeIndentMarkupForEditor(wrapperContentEditable.innerHTML || '');
    }

    return this.normalizeIndentMarkupForEditor(this.editedTexts[editorId] || '');
  }

  /**
   * Sync all editor content with editedTexts before saving.
   * This ensures toolbar formatting changes are captured.
   */
  private syncAllEditorContent(): void {
    Object.keys(this.editedTexts).forEach((editorId) => {
      const id = Number(editorId);
      const freshContent = this.getEditorContent(id);
      if (freshContent && freshContent.trim()) {
        this.editedTexts[id] = freshContent;
      }
    });
  }

  private preserveLines(text: string): string {
    if (!text) return '';
    const normalized = this.normalizeForEditor(text);
    if (!normalized) return '';
    if (normalized.trim().startsWith('<')) return normalized;

    return normalized
      .split('\n')
      .map((line) => {
        const trimmed = line.trimEnd();
        if (!trimmed) return '<p><br></p>';
        if (trimmed.startsWith('### '))
          return `<h3>${this.inlineFormat(trimmed.slice(4))}</h3>`;
        if (trimmed.startsWith('## '))
          return `<h2>${this.inlineFormat(trimmed.slice(3))}</h2>`;
        if (trimmed.startsWith('# '))
          return `<h1>${this.inlineFormat(trimmed.slice(2))}</h1>`;
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

  private normalizeForEditor(value: string): string {
    if (!value) return '';

    // If value contains HTML markup, preserve it (don't decode it to plain text)
    if (value.trim().startsWith('<')) {
      // Just handle escape sequences, keep HTML intact
      const cleaned = value
        .replace(/\\r/g, '\r')
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .trim();
      return this.normalizeIndentMarkupForEditor(cleaned);
    }

    // For plain text values, decode HTML entities but preserve newlines
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    const decoded = textarea.value;

    return decoded
      .replace(/\\r/g, '\r')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .trim();
  }

  private normalizeIndentMarkupForEditor(html: string): string {
    return this.normalizeCkEditorHtml(html);
  }

  private normalizeIndentMarkupForStorage(html: string): string {
    return this.normalizeCkEditorHtml(html);
  }

  /**
   * Keep CKEditor-generated styles/classes intact so font family/size/color
   * persist after saving and reopening.
   */
  private normalizeCkEditorHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/margin-inline-start\s*:/gi, 'margin-left:')
      .replace(/padding-inline-start\s*:/gi, 'padding-left:');
  }

  // ─── MODAL OPEN ─────────────────────────────────────────────────────────────

  open(): Promise<boolean> {
    this.resetState();
    this.loadPages();

    return new Promise((resolve) => {
      this.modalRef = this.modalService.open(this.modalContent, {
        size: 'xl',
        scrollable: true,
        backdrop: 'static',
        centered: true,
        fullscreen: true,
      });
      this.modalRef.result.then(resolve, resolve);
    });
  }

  resetState() {
    Object.values(this.previewBlobUrls).forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    this.previewBlobUrls = {};
    this.previewLoadAttempted = {};
    this.previewLoadingByPage = {};

    if (this.summaryCkEditor) {
      this.summaryCkEditor.destroy();
      this.summaryCkEditor = null;
    }
    Object.values(this.pageCkEditors).forEach((editor: any) => editor?.destroy?.());
    this.pageCkEditors = {};

    this.currentPage = 1;
    this.pageList = [];
    this.editedTexts = {};
    this.savingRows = {};
    this.savedRows = {};
    this.selectedPageIndex = 0;
    this.pageJumpInput = '';
    this.swapToPageInput = '';
    this.pageSize = 1;
    this.itemsPerPage = 1;
    this.textFileContent = '';
    this.statusTargetPageNumbers = [];
    this.loadingStatusTarget = false;
    this.previewZoomByPage = {};
    this.swappingPages = false;

    this.summary = '';
    this.summaryId = 0;
    this.summaryFromCache = false;
    this.summaryDirty = false;
    this.showSummary = false;
    this.summaryExpanded = false;
    this.isSummarizing = false;
    this.isSavingSummary = false;
    this.summarySearchTerm = '';
    this.pageSearchTerms = {};
    this.lastSummarySearchTerm = '';
    this.lastPageSearchTerms = {};
  }

  // ─── LOAD PAGES ─────────────────────────────────────────────────────────────

  loadPages(): void {
    if (!this.documentId) return;

    this.loading = true;
    const startIndex = (this.currentPage - 1) * this.pageSize + 1;

    this.service
      .getDocumentByDocumentName(this.documentId, startIndex, this.pageSize)
      .subscribe({
        next: (res: any) => {
          this.logCk('loadPages:api-success', {
            currentPage: this.currentPage,
            resultCount: Array.isArray(res) ? res.length : 0,
          });
          Object.values(this.pageCkEditors).forEach((editor: any) => editor?.destroy?.());
          this.pageCkEditors = {};

          const safeRes = Array.isArray(res) ? res : [];

          this.pageList = safeRes.map((x: any) => this.mapDocumentPage(x));
          this.pageList.forEach((item) => this.ensurePreviewLoaded(item));

          if (safeRes.length > 0) {
            this.totalRecords = safeRes[0].totalrecords;
          }

          if (this.selectedPageIndex >= this.pageList.length) {
            this.selectedPageIndex = Math.max(0, this.pageList.length - 1);
          }
          this.selectedItem = this.pageList.length
            ? this.pageList[this.selectedPageIndex]
            : null;

          const allSuggestionsRaw =
            safeRes.length > 0 ? safeRes[0]?.allsuggestions : null;

          if (
            typeof allSuggestionsRaw === 'string' &&
            allSuggestionsRaw.trim() !== ''
          ) {
            this.suggestedPages = allSuggestionsRaw
              .split('|')
              .map((entry: string) => {
                const parts = entry.split(':');
                return {
                  PageNumber: parseInt(parts[0]),
                  SuggestionId: parseInt(parts[2]),
                };
              })
              .filter((s) => !isNaN(s.PageNumber) && !isNaN(s.SuggestionId));
          } else {
            this.suggestedPages = [];
          }

          this.pageList.forEach((item) => {
            if (!this.editedTexts[item.DocumentPageId]) {
              // If the extracted text contains HTML (from database), use it directly
              // to preserve indentation markup and other formatting
              const extractedText = item.ExtractedText;
              if (extractedText && extractedText.trim().startsWith('<')) {
                const normalizedHtml = this.normalizeIndentMarkupForEditor(extractedText);
                this.editedTexts[item.DocumentPageId] = normalizedHtml;
              } else {
                // For plain text, process with preserveLines
                this.editedTexts[item.DocumentPageId] = this.preserveLines(extractedText);
              }
              this.logCk('loadPages:seed-page-data', {
                pageId: item.DocumentPageId,
                pageNumber: item.PageNumber,
                length: (this.editedTexts[item.DocumentPageId] || '').length,
                preview: (this.editedTexts[item.DocumentPageId] || '').slice(0, 200),
              });
            }
          });

          this.loading = false;
          this.loadStatusTargetPages();
          this.syncPageEditorsData();
          this.cdr.detectChanges();
          setTimeout(() => {
            this.logCk('loadPages:post-render-init');
            this.initializePageEditors();
            this.syncPageEditorsData();
          }, 0);
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private logCk(_label: string, _data?: any): void {
    return;
  }

  private queryEditorElement(selector: string): HTMLElement | null {
    return (
      (document.querySelector(selector) as HTMLElement | null) ??
      (this.elementRef?.nativeElement?.querySelector(selector) as HTMLElement | null) ??
      null
    );
  }

  private queryEditorElements(selector: string): HTMLElement[] {
    const fromDocument = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    if (fromDocument.length > 0) return fromDocument;
    return Array.from(
      this.elementRef?.nativeElement?.querySelectorAll(selector) ?? [],
    ) as HTMLElement[];
  }

  private mapDocumentPage(x: any): any {
    const extractedText = this.normalizeForEditor(
      x.extractedtext ?? x.ExtractedText ?? '',
    );

    return {
      DocumentPageId: x.documentpageid ?? x.DocumentPageId,
      DocumentId: x.documentid ?? x.DocumentId,
      PageNumber: x.pagenumber ?? x.PageNumber,
      ExtractedText: extractedText,
      StatusId: x.statusid ?? x.StatusId,
      RejectionReason: x.rejectionreason ?? x.RejectionReason,
      totalRecords: x.totalrecords ?? x.totalRecords,
      FilePath: x.filepath ?? x.FilePath ?? null,
      JobId: x.job_id ?? x.JobId ?? null,
      ResultId: x.resultid ?? x.ResultId ?? null,
      Suggestion:
        typeof (x.suggestiontext ?? x.Suggestion) === 'string' &&
        String(x.suggestiontext ?? x.Suggestion).trim() !== ''
          ? String(x.suggestiontext ?? x.Suggestion)
          : '',
      SuggestedPage:
        typeof (x.suggestionpagenumber ?? x.SuggestedPage) === 'number'
          ? x.suggestionpagenumber ?? x.SuggestedPage
          : null,
      SuggestionId:
        typeof (x.suggestionid ?? x.SuggestionId) === 'number'
          ? x.suggestionid ?? x.SuggestionId
          : null,
    };
  }

  private loadSinglePageByNumber(pageNumber: number, onSuccess: (page: any | null) => void, onError?: () => void): void {
    if (!this.documentId) {
      onSuccess(null);
      return;
    }

    this.service.getDocumentByDocumentName(this.documentId, pageNumber, 1).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : [];
        onSuccess(list.length ? this.mapDocumentPage(list[0]) : null);
      },
      error: () => {
        if (onError) onError();
      },
    });
  }

  // ─── SUGGESTION REVIEW ──────────────────────────────────────────────────────

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
          suggestionId: s.SuggestionId,
          documentPageId: s.DocumentPageId,
          action: action,
          reviewedBy: userData?.id ?? 0,
          roleId: userData?.roleId ?? 0,
        };

        this.service.reviewSuggestion(model).subscribe({
          next: () => {
            const page = this.pageList.find(
              (x) => x.DocumentPageId === s.DocumentPageId,
            );
            if (page) page.Suggestion = '';

            this.suggestedPages = this.suggestedPages.filter(
              (p) => p !== s.PageNumber,
            );

            this.cdr.detectChanges();
            Swal.fire('Success', `Marked as ${action}`, 'success');
          },
          error: () => {
            Swal.fire('Error', 'Failed to update', 'error');
          },
        });
      }
    });
  }

  // ─── EDITOR CHANGE ──────────────────────────────────────────────────────────

  onEditorChange(item: any, html: string): void {
    this.editedTexts[item.DocumentPageId] = html;
  }

  isDirty(item: any): boolean {
    return this.editedTexts[item.DocumentPageId] !== item.ExtractedText;
  }

  get suggestedPageNumbers(): string {
    if (!this.suggestedPages.length) return '';
    return this.suggestedPages.map((s) => 'Page ' + s.PageNumber).join(', ');
  }

  get hasDirtyRows(): boolean {
    return this.pageList.some((x) => this.isDirty(x));
  }

  private htmlToPlainText(value: string): string {
    if (!value) return '';
    return value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getWordCount(item: any): number {
    const text = this.htmlToPlainText(
      this.editedTexts[item.DocumentPageId] ?? item.ExtractedText ?? '',
    );
    if (!text) return 0;
    return text.split(' ').filter(Boolean).length;
  }

  getCharacterCount(item: any): number {
    const text = this.htmlToPlainText(
      this.editedTexts[item.DocumentPageId] ?? item.ExtractedText ?? '',
    );
    return text.length;
  }

  get reviewProgressPercent(): number {
    if (!this.totalRecords) return 0;
    return Math.round((this.absolutePageNumber / this.totalRecords) * 100);
  }

  get currentPageNumber(): number {
    const selectedNumber = Number(this.selectedItem?.PageNumber);
    if (Number.isFinite(selectedNumber) && selectedNumber > 0) {
      return selectedNumber;
    }
    return this.absolutePageNumber;
  }

  get editorGuidanceText(): string {
    if (this.roleId === 1) return 'Check OCR text against the original page.';
    if (this.roleId === 2) return 'Verify corrections and confirm page quality.';
    if (this.roleId === 3) return 'Finalize proofreading and approve the page.';
    return 'Review OCR text carefully before saving.';
  }

  get saveButtonLabel(): string {
    switch (this.roleId) {
      case 1:
        return '✔ Check';
      case 2:
        return '✔ Verify';
      case 3:
        return '✔ Approve';
      default:
        return '✔ Save';
    }
  }

    get saveAllButtonLabel(): string {
    switch (this.roleId) {
      case 1:
        return '✔ Check All';
      case 2:
        return '✔ Verify All';
      case 3:
        return '✔ Approve All';
      default:
        return '✔ Save All';
    }
  }

  // ─── ROLE-BASED STATUS ──────────────────────────────────────────────────────

  getNextStatus(statusId: number): number {
    switch (this.roleId) {
      case 1:
        return statusId === 0 || statusId === 7 ? 1 : statusId;
      case 2:
        return statusId === 1 || statusId === 7 ? 2 : statusId;
      case 3:
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
      case 8:
        return 'Suggestion';
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
      case 8:
        return 'badge-suggestion';
      default:
        return 'badge-default';
    }
  }

  get statusNavigationTarget(): { statusId: number; label: string } | null {
    switch (this.roleId) {
      case 1:
        return { statusId: 0, label: 'Pending' };
      case 2:
        return { statusId: 1, label: 'Checked' };
      case 3:
        return { statusId: 2, label: 'Verified' };
      default:
        return null;
    }
  }

  get showStatusNavigationButton(): boolean {
    return !!this.statusNavigationTarget && this.statusTargetPageNumbers.length > 0;
  }

  get statusNavigationButtonLabel(): string {
    const target = this.statusNavigationTarget;
    return target ? `Go to ${target.label} Page` : '';
  }

  private loadStatusTargetPages(): void {
    const target = this.statusNavigationTarget;
    if (!this.documentId || !target || !this.totalRecords) {
      this.statusTargetPageNumbers = [];
      return;
    }

    this.loadingStatusTarget = true;
    const pageSize = Math.max(this.totalRecords, 1);

    this.service.getDocumentByDocumentName(this.documentId, 1, pageSize).subscribe({
      next: (res: any) => {
        const pages = Array.isArray(res) ? res : [];
        this.statusTargetPageNumbers = pages
          .filter((x: any) => Number(x.statusid ?? x.StatusId) === target.statusId)
          .map((x: any) => Number(x.pagenumber ?? x.PageNumber))
          .filter((pageNumber: number) => Number.isFinite(pageNumber))
          .sort((a: number, b: number) => a - b);

        this.loadingStatusTarget = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.statusTargetPageNumbers = [];
        this.loadingStatusTarget = false;
        this.cdr.detectChanges();
      },
    });
  }

  goToStatusTargetPage(): void {
    if (!this.statusTargetPageNumbers.length) return;

    const nextPage =
      this.statusTargetPageNumbers.find((pageNumber) => pageNumber >= this.currentPageNumber) ??
      this.statusTargetPageNumbers[0];

    this.jumpToPage(nextPage);
  }

  swapCurrentPageWithPrevious(): void {
    this.swapPagesByNumber(this.currentPageNumber, this.currentPageNumber - 1);
  }

  swapCurrentPageWithNext(): void {
    this.swapPagesByNumber(this.currentPageNumber, this.currentPageNumber + 1);
  }

  swapCurrentPageToTarget(rawValue: string | number): void {
    const total = this.totalRecords;
    if (total < 2) return;

    const parsed = Number.parseInt(String(rawValue ?? '').trim(), 10);
    if (Number.isNaN(parsed)) return;

    const targetPage = Math.max(1, Math.min(total, parsed));
    if (targetPage === this.currentPageNumber) {
      this.swapToPageInput = '';
      return;
    }

    this.swapPagesByNumber(this.currentPageNumber, targetPage);
    this.swapToPageInput = '';
  }

  private swapPagesByNumber(pageA: number, pageB: number): void {
    if (!this.documentId || this.swappingPages) return;
    if (pageA < 1 || pageB < 1 || pageA > this.totalRecords || pageB > this.totalRecords || pageA === pageB) return;
    if (!this.selectedItem || !this.canEdit(this.selectedItem)) {
      Swal.fire('Not Allowed', 'You cannot swap pages at this stage.', 'warning');
      return;
    }

    this.swappingPages = true;
    this.cdr.detectChanges();

    this.loadSinglePageByNumber(pageA, (firstPage) => {
      if (!firstPage) {
        this.swappingPages = false;
        this.cdr.detectChanges();
        Swal.fire('Error', 'Unable to load source page for swapping.', 'error');
        return;
      }

      this.loadSinglePageByNumber(pageB, (secondPage) => {
        if (!secondPage) {
          this.swappingPages = false;
          this.cdr.detectChanges();
          Swal.fire('Error', 'Unable to load target page for swapping.', 'error');
          return;
        }

        const firstText = this.editedTexts[firstPage.DocumentPageId] ?? firstPage.ExtractedText ?? '';
        const secondText = this.editedTexts[secondPage.DocumentPageId] ?? secondPage.ExtractedText ?? '';

        if (!this.canEdit(firstPage) || !this.canEdit(secondPage)) {
          this.swappingPages = false;
          this.cdr.detectChanges();
          Swal.fire(
            'Not Allowed',
            'One of the selected pages is locked for your role/status, so swap cannot be performed.',
            'warning',
          );
          return;
        }

        const firstPayload = this.buildSwapSavePayload(firstPage, pageB, firstText);
        const secondPayload = this.buildSwapSavePayload(secondPage, pageA, secondText);

        const tempCandidates = Array.from(
          new Set([
            this.totalRecords + 1,
            Math.max(pageA, pageB) + 1,
            9999,
            1000000,
          ]),
        ).filter((n) => Number.isFinite(n) && n > 0 && n !== pageA && n !== pageB);

        const tryPrepareSwap = (candidateIndex: number) => {
          if (candidateIndex >= tempCandidates.length) {
            this.swappingPages = false;
            this.cdr.detectChanges();
            Swal.fire(
              'Error',
              'Unable to prepare page swap with valid temporary page number.',
              'error',
            );
            return;
          }

          const tempPageNumber = tempCandidates[candidateIndex];
          const firstToTempPayload = this.buildSwapSavePayload(
            firstPage,
            tempPageNumber,
            firstText,
          );

          this.service.saveDocumentPage(firstToTempPayload).subscribe({
            next: () => {
              this.service.saveDocumentPage(secondPayload).subscribe({
                next: () => {
                  this.service.saveDocumentPage(firstPayload).subscribe({
                    next: () => {
                      this.swappingPages = false;
                      this.loadStatusTargetPages();
                      this.jumpToPage(pageB);
                      this.cdr.detectChanges();
                      Swal.fire('Swapped', `Page ${pageA} and Page ${pageB} swapped successfully.`, 'success');
                    },
                    error: (err) => {
                      this.swappingPages = false;
                      this.cdr.detectChanges();
                      Swal.fire(
                        'Error',
                        err?.error?.message || 'Failed to finalize page swap.',
                        'error',
                      );
                    },
                  });
                },
                error: (err) => {
                this.swappingPages = false;
                this.cdr.detectChanges();
                Swal.fire(
                  'Error',
                  err?.error?.message || 'Failed to move target page during swap.',
                  'error',
                );
                },
              });
            },
            error: () => {
              // Retry with a different temporary page number for backends
              // that enforce strict page-number bounds/uniqueness rules.
              tryPrepareSwap(candidateIndex + 1);
            },
          });
        };

        tryPrepareSwap(0);
      }, () => {
        this.swappingPages = false;
        this.cdr.detectChanges();
        Swal.fire('Error', 'Unable to load target page for swapping.', 'error');
      });
    }, () => {
      this.swappingPages = false;
      this.cdr.detectChanges();
      Swal.fire('Error', 'Unable to load source page for swapping.', 'error');
    });
  }

  private buildSwapSavePayload(page: any, targetPageNumber: number, extractedText: string): any {
    return {
      documentPageId: page.DocumentPageId,
      documentId: page.DocumentId,
      pageNumber: targetPageNumber,
      extractedText: this.normalizeIndentMarkupForStorage(extractedText),
      statusId: Number(page.StatusId),
      userId: this.currentUserId,
      roleId: this.roleId,
      rejectionReason: page.RejectionReason ?? '',
    };
  }

  get canReject(): boolean {
    return this.roleId === 2 || this.roleId === 3;
  }

  canEdit(item: any): boolean {
    if (item.StatusId === 8 && this.roleId !== 3) return false;
    if (this.roleId === 1 && (item.StatusId === 2 || item.StatusId === 3))
      return false;
    if (this.roleId === 2 && item.StatusId === 3) return false;
    return true;
  }

  // ─── REJECT ROW ─────────────────────────────────────────────────────────────

  rejectRow(item: any) {
    if (!this.canEdit(item)) {
      Swal.fire('Not Allowed', 'You cannot reject this page.', 'warning');
      return;
    }

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
        if (!value || !value.trim()) return 'Please enter a rejection reason.';
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
        extractedText: this.normalizeIndentMarkupForStorage(
          this.editedTexts[item.DocumentPageId] ?? item.ExtractedText ?? '',
        ),
        statusId: 7,
        userId: this.currentUserId,
        rejectionReason: rejectionReason,
        roleId: this.roleId,
      };

      this.savingRows[item.DocumentPageId] = true;
      item.StatusId = 7;

      this.service.saveDocumentPage(payload).subscribe({
        next: () => {
          this.savingRows[item.DocumentPageId] = false;
          this.loadStatusTargetPages();
          this.cdr.detectChanges();
        },
        error: () => {
          item.StatusId = oldStatus;
          this.savingRows[item.DocumentPageId] = false;
          Swal.fire('Error', 'Rejection failed', 'error');
        },
      });
    });
  }

  // ─── SAVE ROW ───────────────────────────────────────────────────────────────

  saveRow(item: any) {
    if (!this.canEdit(item)) {
      Swal.fire(
        'Not Allowed',
        'You cannot edit this page at this stage.',
        'warning',
      );
      return;
    }

    if (this.savingRows[item.DocumentPageId]) return;

    // CRITICAL: Sync editor content before saving
    // This captures toolbar button changes (indent, bold, etc.) that don't trigger ngModelChange
    this.syncAllEditorContent();

    const oldText = item.ExtractedText;
    const oldEditedText = this.editedTexts[item.DocumentPageId];
    const oldStatus = item.StatusId;

    const payload = {
      documentPageId: item.DocumentPageId,
      documentId: item.DocumentId,
      pageNumber: item.PageNumber,
      extractedText: this.normalizeIndentMarkupForStorage(
        this.editedTexts[item.DocumentPageId] ?? item.ExtractedText ?? '',
      ),
      statusId: this.getNextStatus(item.StatusId),
      userId: this.currentUserId,
      roleId: this.roleId,
      rejectionReason: '',
    };

    this.savingRows[item.DocumentPageId] = true;
    item.ExtractedText = payload.extractedText;
    this.editedTexts[item.DocumentPageId] = payload.extractedText;
    item.StatusId = payload.statusId;

    this.service.saveDocumentPage(payload).subscribe({
      next: () => {
        this.savedRows[item.DocumentPageId] = true;
        this.savingRows[item.DocumentPageId] = false;
        this.loadStatusTargetPages();
        this.cdr.detectChanges();

        Swal.fire({
          icon: 'success',
          title: 'Saved Successfully',
          text: `Page ${item.PageNumber} has been saved.`,
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          if (this.absolutePageNumber === this.totalRecords) {
            this.close();
          } else {
            this.goToNext();
          }
        });

        setTimeout(() => {
          this.savedRows[item.DocumentPageId] = false;
        }, 2000);
      },
      error: () => {
        item.ExtractedText = oldText;
        this.editedTexts[item.DocumentPageId] = oldEditedText;
        item.StatusId = oldStatus;
        this.savingRows[item.DocumentPageId] = false;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'error', title: 'Error', text: 'This Document is already saved.' });
      },
    });
  }

  // ─── SAVE ALL ───────────────────────────────────────────────────────────────

  saveAll() {
    if (!this.documentId || this.savingAll) return;

    Swal.fire({
      icon: 'warning',
      title: 'Are you sure you want to Save all ?',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      confirmButtonColor: '#16a34a',
    }).then((result) => {
      if (!result.isConfirmed) return;

      // CRITICAL: Sync all editor content before saving
      // This captures toolbar button changes that don't trigger ngModelChange
      this.syncAllEditorContent();

      this.savingAll = true;
      this.cdr.detectChanges();

      const pageSize = Math.max(this.totalRecords || this.pageSize || 1, 1);

      this.service.getDocumentByDocumentName(this.documentId!, 1, pageSize).subscribe({
        next: (res: any) => {
          const allPages = (Array.isArray(res) ? res : []).map((x: any) => ({
            DocumentPageId: x.documentpageid ?? x.DocumentPageId,
            DocumentId: x.documentid ?? x.DocumentId,
            PageNumber: x.pagenumber ?? x.PageNumber,
            ExtractedText: x.extractedtext ?? x.ExtractedText,
            StatusId: x.statusid ?? x.StatusId,
            RejectionReason: x.rejectionreason ?? x.RejectionReason,
          }));

          const requests = allPages
            .filter((item: any) => {
              const nextStatus = this.getNextStatus(Number(item.StatusId));
              return this.canEdit(item) && nextStatus !== Number(item.StatusId);
            })
            .map((item: any) => {
              const extractedText = this.normalizeIndentMarkupForStorage(
                this.editedTexts[item.DocumentPageId] ?? item.ExtractedText ?? '',
              );
              return {
                item,
                extractedText,
                request: this.service.saveDocumentPage({
                  documentPageId: item.DocumentPageId,
                  documentId: item.DocumentId,
                  pageNumber: item.PageNumber,
                  extractedText: extractedText,
                  statusId: this.getNextStatus(Number(item.StatusId)),
                  userId: this.currentUserId,
                  roleId: this.roleId,
                  rejectionReason: '',
                }),
              };
            });

          if (!requests.length) {
            this.savingAll = false;
            this.cdr.detectChanges();
            Swal.fire('Info', 'No pages are available to verify.', 'info');
            return;
          }

          const requestsOnly = requests.map((r) => r.request);

          forkJoin(requestsOnly).subscribe({
            next: () => {
              // Update editedTexts with saved content
              requests.forEach((r) => {
                if (r.item && r.extractedText) {
                  this.editedTexts[r.item.DocumentPageId] = r.extractedText;
                  r.item.ExtractedText = r.extractedText;
                }
              });
              
              this.savingAll = false;
              this.cdr.detectChanges();
              Swal.fire('Success', 'All pages verified successfully.', 'success').then(() => {
                this.modalRef.close(true);
                this.router.navigate(['/settings/ocr-data']);
              });
            },
            error: () => {
              this.savingAll = false;
              this.cdr.detectChanges();
              Swal.fire('Error', 'Failed to verify all pages.', 'error');
            },
          });
        },
        error: () => {
          this.savingAll = false;
          this.cdr.detectChanges();
          Swal.fire('Error', 'Failed to load pages for verification.', 'error');
        },
      });
    });
  }

  // ─── PAGINATION ─────────────────────────────────────────────────────────────

  get hasPrevious() {
    return this.currentPage > 1;
  }

  get hasNext() {
    return this.pageList.length === this.pageSize;
  }

  get absolutePageNumber(): number {
    return (
      (this.currentPage - 1) * this.itemsPerPage + this.selectedPageIndex + 1
    );
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.itemsPerPage);
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

  jumpToPage(rawValue: string | number) {
    const total = this.totalRecords;
    if (total === 0) return;

    const parsed = Number.parseInt(String(rawValue ?? '').trim(), 10);
    if (Number.isNaN(parsed)) return;

    const clampedPage = Math.max(1, Math.min(total, parsed));
    const pageSize = Math.max(1, this.itemsPerPage || this.pageSize || 1);

    this.selectedPageIndex = (clampedPage - 1) % pageSize;
    this.currentPage = Math.ceil(clampedPage / pageSize);
    this.pageJumpInput = '';
    this.loadPages();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.selectedPageIndex = 0;
    this.loadPages();
  }

  onPageSizeChange(size: number) {
    this.itemsPerPage = size;
    this.pageSize = size;
    this.currentPage = 1;
    this.selectedPageIndex = 0;
    this.loadPages();
  }

  // ─── CLOSE ──────────────────────────────────────────────────────────────────

  close() {
    this.modalRef.close();
  }

  // ─── DESTROY ────────────────────────────────────────────────────────────────

  ngOnDestroy() {
    Object.values(this.previewBlobUrls).forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    this.previewBlobUrls = {};
    this.previewLoadAttempted = {};
    this.previewLoadingByPage = {};

    if (this.summaryCkEditor) {
      this.summaryCkEditor.destroy();
      this.summaryCkEditor = null;
    }
    Object.values(this.pageCkEditors).forEach((editor: any) => editor?.destroy?.());
    this.pageCkEditors = {};

    if (this.documentId) {
      this.service
        .manageLock(this.documentId, this.currentUserId, 'UNLOCK')
        .subscribe();
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleGlobalEditorShortcuts(event: KeyboardEvent) {
    const hasModKey = event.ctrlKey || event.metaKey;
    if (!hasModKey || event.altKey) return;

    const keyLower = (event.key || '').toLowerCase();
    if (keyLower === 's') {
      event.preventDefault();
      this.saveAll();
      return;
    }

    const key = event.key || '';
    const code = event.code || '';
    const keyCode = (event as any).keyCode as number | undefined;

    const isIndentShortcut =
      code === 'BracketRight' ||
      key === ']' ||
      key === '}' ||
      keyCode === 221;
    const isOutdentShortcut =
      code === 'BracketLeft' ||
      key === '[' ||
      key === '{' ||
      keyCode === 219;
    if (!isIndentShortcut && !isOutdentShortcut) return;

    const delta = isIndentShortcut ? 40 : -40;
    const mode: 'paragraph' | 'first-line' = event.shiftKey ? 'first-line' : 'paragraph';
    const applied = this.applyManualIndentFromTarget(
      event.target as HTMLElement | null,
      delta,
      mode,
    );
    this.logCk('shortcut:indent-detected', {
      key,
      code,
      keyCode,
      shift: event.shiftKey,
      meta: event.metaKey,
      ctrl: event.ctrlKey,
      mode,
      applied,
    });
    if (applied) {
      event.preventDefault();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  handleIndentToolbarMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const button = target.closest('button') as HTMLElement | null;
    if (!button) return;

    const label = (
      button.getAttribute('aria-label') ||
      button.getAttribute('title') ||
      button.textContent ||
      ''
    ).toLowerCase();

    const isIncreaseIndent = label.includes('increase indent');
    const isDecreaseIndent = label.includes('decrease indent');
    if (!isIncreaseIndent && !isDecreaseIndent) return;

    const delta = isIncreaseIndent ? 40 : -40;
    setTimeout(() => {
      this.applyManualIndentFromTarget(target, delta, 'paragraph');
    }, 0);
  }

  indentFirstLineInCurrentEditor(): void {
    const target = this.lastActiveCkEditable ?? (document.activeElement as HTMLElement | null);
    this.applyManualIndentFromTarget(target, 40, 'first-line');
  }

  outdentFirstLineInCurrentEditor(): void {
    const target = this.lastActiveCkEditable ?? (document.activeElement as HTMLElement | null);
    this.applyManualIndentFromTarget(target, -40, 'first-line');
  }

  private applyManualIndentFromTarget(
    target: HTMLElement | null,
    delta: number,
    mode: 'paragraph' | 'first-line',
  ): boolean {
    const root = this.getActiveCkEditorRoot(target);
    if (!root) return false;

    const blocks = this.getSelectedBlocksInRoot(root);
    if (!blocks.length) return false;

    // Let native list indentation handle list items.
    if (blocks.some((block) => block.tagName.toLowerCase() === 'li')) return false;

    blocks.forEach((block) => {
      if (mode === 'first-line') {
        const current = this.readTextIndentPx(block);
        const next = Math.max(0, current + delta);
        block.style.textIndent = `${next}px`;
        block.setAttribute('data-first-line-indent', `${next}`);
        return;
      }

      const current = this.readLeftIndentPx(block);
      const next = Math.max(0, current + delta);
      block.style.marginLeft = `${next}px`;
    });

    return true;
  }

  private getActiveCkEditorRoot(target: HTMLElement | null): HTMLElement | null {
    const directEditable = target?.closest(
      '.ck-editor__editable[contenteditable="true"]',
    ) as HTMLElement | null;
    if (directEditable) return directEditable;

    const origin =
      this.lastActiveCkEditable ??
      target ??
      (document.activeElement as HTMLElement | null);
    const editor = origin?.closest('.ck-editor') as HTMLElement | null;
    if (!editor) return null;
    return editor.querySelector(
      '.ck-editor__editable[contenteditable="true"]',
    ) as HTMLElement | null;
  }

  @HostListener('document:focusin', ['$event'])
  trackLastActiveCkEditable(event: FocusEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const editable = target.closest(
      '.ck-editor__editable[contenteditable="true"]',
    ) as HTMLElement | null;
    if (editable) {
      this.lastActiveCkEditable = editable;
    }
  }

  private getSelectedBlocksInRoot(root: HTMLElement): HTMLElement[] {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return [];

    const range = selection.getRangeAt(0);
    const selector = 'p, blockquote, h1, h2, h3, h4, h5, h6, li';
    const blocks: HTMLElement[] = [];

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node: Node) => {
        const el = node as HTMLElement;
        if (!el.matches(selector)) return NodeFilter.FILTER_SKIP;
        return range.intersectsNode(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });

    while (walker.nextNode()) {
      blocks.push(walker.currentNode as HTMLElement);
    }

    if (blocks.length > 0) return blocks;

    const anchor = selection.anchorNode?.nodeType === Node.ELEMENT_NODE
      ? (selection.anchorNode as HTMLElement)
      : selection.anchorNode?.parentElement ?? null;
    const single = anchor?.closest(selector) as HTMLElement | null;
    return single ? [single] : [];
  }

  private readLeftIndentPx(element: HTMLElement): number {
    const inline = element.style.marginLeft || '';
    const parsedInline = Number.parseInt(inline.replace('px', ''), 10);
    if (Number.isFinite(parsedInline)) return parsedInline;
    const computed = window.getComputedStyle(element).marginLeft;
    const parsedComputed = Number.parseInt(computed.replace('px', ''), 10);
    return Number.isFinite(parsedComputed) ? parsedComputed : 0;
  }

  private readTextIndentPx(element: HTMLElement): number {
    const inline = element.style.textIndent || '';
    const parsedInline = Number.parseInt(inline.replace('px', ''), 10);
    if (Number.isFinite(parsedInline)) return parsedInline;
    const computed = window.getComputedStyle(element).textIndent;
    const parsedComputed = Number.parseInt(computed.replace('px', ''), 10);
    return Number.isFinite(parsedComputed) ? parsedComputed : 0;
  }

  private restoreFirstLineIndentVisuals(editor: any, sourceHtml: string): void {
    if (!editor || !sourceHtml) return;
    const editable = editor.ui?.getEditableElement?.() as HTMLElement | null;
    if (!editable) return;

    const parser = new DOMParser();
    const parsed = parser.parseFromString(sourceHtml, 'text/html');
    const sourceBlocks = Array.from(
      parsed.body.querySelectorAll('p, blockquote, h1, h2, h3, h4, h5, h6'),
    ) as HTMLElement[];
    const liveBlocks = Array.from(
      editable.querySelectorAll('p, blockquote, h1, h2, h3, h4, h5, h6'),
    ) as HTMLElement[];

    const count = Math.min(sourceBlocks.length, liveBlocks.length);
    for (let i = 0; i < count; i++) {
      const source = sourceBlocks[i];
      const live = liveBlocks[i];
      const sourceIndent = this.readTextIndentPx(source);
      if (sourceIndent > 0) {
        live.style.textIndent = `${sourceIndent}px`;
        live.setAttribute('data-first-line-indent', `${sourceIndent}`);
      }
    }
  }
}
