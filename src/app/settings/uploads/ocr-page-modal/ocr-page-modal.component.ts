import {
  ChangeDetectorRef,
  Component,
  ElementRef,
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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { removeMark } from 'ngx-editor/commands';
import { normalizeNgxEditorHtml } from '../../ngx-editor-html.util';

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

  pageEditors: { [id: number]: Editor } = {};
  colorPresets: string[] = [
    '#000000',
    '#111827',
    '#374151',
    '#6B7280',
    '#EF4444',
    '#F59E0B',
    '#10B981',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
  ];

  pageToolbar: Toolbar = [
    ['undo', 'redo'],
    ['bold', 'italic', 'underline', 'strike'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['blockquote'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
    ['indent', 'outdent'],
    ['link', 'image'],
    ['text_color', 'background_color'],
    ['format_clear'],
  ];

  summaryEditor: Editor = new Editor();
  summaryToolbar: Toolbar = [
    ['undo', 'redo'],
    ['bold', 'italic', 'underline', 'strike'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['blockquote'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
    ['indent', 'outdent'],
    ['link', 'image'],
    ['text_color', 'background_color'],
    ['format_clear'],
  ];

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

  //   console.log('PDF/Image URL:', fullUrl); // ✅ DEBUG

  //   return this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl);
  // }


  getSafeUrl(filePath: string): SafeResourceUrl {
  const raw = this.getRawUrl(filePath);
  const ext = filePath?.split('.').pop()?.toLowerCase();
  // Append PDF viewer params inside the sanitized URL
  const url = ext === 'pdf' ? `${raw}#toolbar=0&navpanes=0` : raw;
  return this.sanitizer.bypassSecurityTrustResourceUrl(url);
}

getRawUrl(filePath: string): string {
  if (!filePath) return '';
  let normalized = filePath.replace(/\\/g, '/');
  let baseUrl = environment.BaseUrl;
  if (!baseUrl.endsWith('/')) baseUrl += '/';
  if (normalized.startsWith('uploads/')) {
    normalized = normalized.substring('uploads/'.length);
  }
  return `${baseUrl}uploads/${normalized}`;
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
        this.summary = this.markdownToHtml(raw);
        this.summaryId = res.summary.summaryId ?? 0;
        this.summaryFromCache = res.summary.fromCache;
        this.summaryUpdatedAt = res.summary.updatedAt
          ? new Date(res.summary.updatedAt)
          : null;
        this.isSummarizing = false;
        this.showSummary = true;
        this.summaryDirty = false;
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

  clearTextColor(editor: Editor): void {
    this.removeEditorMark(editor, 'text_color');
  }

  clearBackgroundColor(editor: Editor): void {
    this.removeEditorMark(editor, 'text_background_color');
  }

  private removeEditorMark(
    editor: Editor | undefined,
    markName: 'text_color' | 'text_background_color',
  ): void {
    if (!editor?.view) return;

    const { state, dispatch } = editor.view;
    const markType = state.schema.marks[markName];
    if (!markType) return;

    removeMark(markType)(state, dispatch);
    editor.view.focus();
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
    const editor = this.summaryEditor;
    if (!editor?.view?.dom) return this.summary || '';

    try {
      const editorElement = editor.view.dom as HTMLElement;
      const contentEditable = editorElement.querySelector(
        '[contenteditable="true"]',
      ) as HTMLElement | null;
      if (contentEditable) {
        return contentEditable.innerHTML || '';
      }
      return editorElement.innerHTML || this.summary || '';
    } catch (error) {
      console.warn('Failed to read summary editor content, using ngModel value', error);
      return this.summary || '';
    }
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
    const host = this.elementRef?.nativeElement;
    if (!host) return;
    const wrapper = host.querySelector(wrapperSelector) as HTMLElement | null;
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
    const wrapperContentEditable = this.elementRef.nativeElement.querySelector(
      `[data-page-editor-wrap="${editorId}"] [contenteditable="true"]`,
    ) as HTMLElement | null;
    if (wrapperContentEditable) {
      return this.normalizeIndentMarkupForEditor(wrapperContentEditable.innerHTML || '');
    }

    const editor = this.pageEditors[editorId];
    if (!editor || !editor.view) {
      return this.editedTexts[editorId] || '';
    }

    try {
      // Prefer live contenteditable HTML because toolbar-only actions
      // (indent/outdent/alignment) may not update ngModel immediately.
      if (editor.view.dom) {
        const editorElement = editor.view.dom as HTMLElement;
        const contentEditable = editorElement.querySelector(
          '[contenteditable="true"]',
        ) as HTMLElement | null;
        if (contentEditable) {
          return this.normalizeIndentMarkupForEditor(contentEditable.innerHTML || '');
        }
        return this.normalizeIndentMarkupForEditor(editorElement.innerHTML || '');
      }
    } catch (e) {
      console.warn('Failed to get editor HTML, falling back to editedTexts', e);
    }

    return this.normalizeIndentMarkupForEditor(this.editedTexts[editorId] || '');
  }

  private applyIndentModeToSelection(
    editor: Editor | undefined,
    mode: 'first-line' | 'full',
  ): void {
    if (!editor) return;
    const root = editor.view?.dom as HTMLElement | undefined;
    if (!root) return;

    const blocks = this.getSelectedBlocks(root);
    if (blocks.length === 0) return;
    blocks.forEach((block: HTMLElement) => block.setAttribute('data-indent-mode', mode));
  }

  private getSelectedBlocks(root: HTMLElement): HTMLElement[] {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return [];

    const range = selection.getRangeAt(0);
    const selector = 'p, blockquote, h1, h2, h3, h4, h5, h6';

    if (range.collapsed) {
      const anchorNode = selection.anchorNode;
      const anchorElement =
        anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (anchorNode as HTMLElement)
          : anchorNode?.parentElement ?? null;
      const block = anchorElement?.closest(selector) as HTMLElement | null;
      return block ? [block] : [];
    }

    const blocks: HTMLElement[] = [];

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node: Node) => {
        const el = node as HTMLElement;
        if (!el.matches(selector)) return NodeFilter.FILTER_SKIP;
        return range.intersectsNode(el)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    while (walker.nextNode()) {
      blocks.push(walker.currentNode as HTMLElement);
    }

    if (blocks.length) return blocks;

    const anchorNode = selection.anchorNode;
    const anchorElement =
      anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement)
        : anchorNode?.parentElement ?? null;
    const block = anchorElement?.closest(selector) as HTMLElement | null;
    return block ? [block] : [];
  }

  /**
   * Sync all editor content with editedTexts before saving.
   * This ensures toolbar formatting changes are captured.
   */
  private syncAllEditorContent(): void {
    Object.keys(this.pageEditors).forEach((editorId) => {
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

  /**
   * Converts persisted class/data-indent based indentation into inline styles
   * so ngx-editor reliably renders indentation after reopening from DB.
   */
  private normalizeIndentMarkupForEditor(html: string): string {
    return normalizeNgxEditorHtml(html);
  }

  private normalizeIndentMarkupForStorage(html: string): string {
    return normalizeNgxEditorHtml(html, { forStorage: true });
  }

  getOrCreateEditor(id: number): Editor {
    if (!this.pageEditors[id]) {
      this.pageEditors[id] = new Editor();
    }
    return this.pageEditors[id];
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
          const safeRes = Array.isArray(res) ? res : [];

          this.pageList = safeRes.map((x: any) => this.mapDocumentPage(x));

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
            }
            this.getOrCreateEditor(item.DocumentPageId);
          });

          this.loading = false;
          this.loadStatusTargetPages();
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
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
    Object.values(this.pageEditors).forEach((editor) => editor.destroy());
    this.summaryEditor.destroy();
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

    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      this.saveAll();
      return;
    }

    const isIndentShortcut = event.code === 'BracketRight' || event.key === ']';
    const isOutdentShortcut = event.code === 'BracketLeft' || event.key === '[';
    if (!isIndentShortcut && !isOutdentShortcut) return;

    const target = event.target as HTMLElement | null;
    const activeEditor = this.getActiveNgxEditor(target);
    if (!activeEditor?.editor) return;

    event.preventDefault();
    if (isIndentShortcut) {
      this.applyIndentModeToSelection(
        activeEditor.editor,
        event.shiftKey ? 'full' : 'first-line',
      );
      activeEditor.editor.commands.focus().indent().exec();

      const mode: 'first-line' | 'full' = event.shiftKey ? 'full' : 'first-line';
      setTimeout(() => {
        this.applyIndentModeToSelection(activeEditor.editor, mode);
        if (activeEditor.kind === 'summary') {
          this.summaryDirty = true;
          this.summary = this.getSummaryEditorContent();
        } else {
          this.editedTexts[activeEditor.pageId] = this.getEditorContent(activeEditor.pageId);
        }
      }, 0);
    } else {
      activeEditor.editor.commands.focus().outdent().exec();
    }

    if (activeEditor.kind === 'summary') {
      this.summaryDirty = true;
      this.summary = this.getSummaryEditorContent();
      return;
    }

    this.editedTexts[activeEditor.pageId] = this.getEditorContent(activeEditor.pageId);
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
      ''
    ).toLowerCase();

    const isIncreaseIndent =
      label.includes('increase indent') ||
      (label.includes('indent') && !label.includes('decrease'));
    if (!isIncreaseIndent) return;

    const activeEditor = this.getEditorFromWrapper(target);
    if (!activeEditor?.editor) return;

    const mode: 'first-line' | 'full' = event.shiftKey ? 'full' : 'first-line';

    // On toolbar clicks, browser focus may temporarily move to the button,
    // so selection-based mode tagging can miss the target block. Re-apply
    // mode right after the editor command executes.
    setTimeout(() => {
      try {
        activeEditor.editor.commands.focus().exec();
      } catch {}

      this.applyIndentModeToSelection(activeEditor.editor, mode);

      if (activeEditor.kind === 'summary') {
        this.summaryDirty = true;
        this.summary = this.getSummaryEditorContent();
      } else {
        this.editedTexts[activeEditor.pageId] = this.getEditorContent(activeEditor.pageId);
      }
    }, 0);
  }

  private getActiveNgxEditor(
    target: HTMLElement | null,
  ): { kind: 'summary'; editor: Editor } | { kind: 'page'; pageId: number; editor: Editor } | null {
    if (!target) return null;

    const host = target.closest('.NgxEditor, .NgxEditor__Content, [contenteditable="true"]');
    if (!host) return null;

    const summaryWrap = host.closest('[data-summary-editor-wrap="true"]');
    if (summaryWrap) {
      return { kind: 'summary', editor: this.summaryEditor };
    }

    const pageWrap = host.closest('[data-page-editor-wrap]') as HTMLElement | null;
    if (!pageWrap) return null;

    const pageIdValue = pageWrap.getAttribute('data-page-editor-wrap');
    const pageId = Number(pageIdValue);
    if (!Number.isFinite(pageId)) return null;

    return { kind: 'page', pageId, editor: this.getOrCreateEditor(pageId) };
  }

  private getEditorFromWrapper(
    target: HTMLElement | null,
  ): { kind: 'summary'; editor: Editor } | { kind: 'page'; pageId: number; editor: Editor } | null {
    if (!target) return null;

    const summaryWrap = target.closest('[data-summary-editor-wrap="true"]');
    if (summaryWrap) {
      return { kind: 'summary', editor: this.summaryEditor };
    }

    const pageWrap = target.closest('[data-page-editor-wrap]') as HTMLElement | null;
    if (!pageWrap) return null;

    const pageIdValue = pageWrap.getAttribute('data-page-editor-wrap');
    const pageId = Number(pageIdValue);
    if (!Number.isFinite(pageId)) return null;

    return { kind: 'page', pageId, editor: this.getOrCreateEditor(pageId) };
  }
}
