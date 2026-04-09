import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { ServiceService, OcrJobStatus, OcrFileResult } from '../../settings.service';
import { Options } from 'select2';
import Swal from 'sweetalert2';
import { Editor, Toolbar } from 'ngx-editor';
import { Router } from '@angular/router';

interface ParsedOcrPage {
  fileName: string;
  extractedText: string;
  pageNumber: number;
}

interface FailedOcrPage {
  fileName: string;
  pageNumber: number;
  message: string;
}

@Component({
  selector: 'app-add-image',
  templateUrl: './add-image.component.html',
  styleUrls: ['./add-image.component.scss'],
})
export class AddImageComponent implements OnInit, OnDestroy {
  // ── File selection
  selectedFiles: File[] = [];
  uploading = false;
  readonly SUPPORTED_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.pdf',
    '.tiff',
    '.tif',
  ];
  readonly SUPPORTED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'image/tiff',
    'image/tif',
  ];

  rejectedFiles: { name: string; extension: string; reason: string }[] = [];

  pageEditor: Editor;
  pageToolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['blockquote'],
    ['align_left', 'align_center', 'align_right'],
    ['format_clear'],
  ];

  // ── Job tracking
  currentJobId: string | null = null;
  jobStatus: OcrJobStatus | null = null;
  pollingInterval: any = null;
  pollingMessage = '';
  progressPercent = 0;
  jobStartedAt: string | null = null;
  elapsedTimer: any = null;
  elapsedSeconds = 0;

  // ── Screen states
  // 'upload'     → show file picker
  // 'processing' → show full-screen progress
  // 'edit'       → show edit form after completion
  screenState: 'upload' | 'processing' | 'edit' = 'upload';
  cancellingJob = false;

  // ── Edit form
  ocrResults: ParsedOcrPage[] = [];
  failedOcrPages: FailedOcrPage[] = [];
  retryingFailedPages = new Set<string>();
  editForm!: FormGroup;
  documentId: number = 0;
  documentTypeId: number = 0;
  isDocumentTypeSaved = false;
  isDocumentSaved = false;
  savedPages: Set<number> = new Set();
  currentPageIndex = 0;

  // SELECT2
  public documentoptions!: Options;
  public documentdata: Array<{ id: string; text: string }> = [];
  public documentTypeoptions!: Options;
  public documentTypedata: Array<{ id: string; text: string }> = [];

  constructor(
    private fb: FormBuilder,
    private service: ServiceService,
    private cd: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.pageEditor = new Editor();
    this.documentropdown();
    this.documentTyperopdown();
    this.checkForActiveJob(); // ← Resume polling if job was running
  }

  ngOnDestroy(): void {
    this.pageEditor.destroy();
    this.stopPolling();
    this.stopElapsedTimer();
  }

  checkForActiveJob() {
    const saved = this.service.getActiveJob();
    if (!saved) return;

    // Job was running before — check its current status
    this.service.getOcrJobById(saved.jobId).subscribe({
      next: (status: OcrJobStatus) => {
        if (status.status === 'Queued' || status.status === 'Processing') {
          // Job still running — resume progress screen
          this.currentJobId = saved.jobId;
          this.jobStatus = status;
          this.jobStartedAt = saved.startedAt;
          this.screenState = 'processing';
          this.uploading = true;
          this.updateProgress(status);
          this.startPolling(saved.jobId);
          this.startElapsedTimer(saved.startedAt);
          this.cd.detectChanges();

          Swal.fire({
            icon: 'info',
            title: 'Job Resumed',
            text: `Your OCR job (${status.processed_files}/${status.total_files} files done) is still running.`,
            confirmButtonText: 'OK',
            timer: 4000,
            timerProgressBar: true,
          });
        } else if (status.status === 'Completed') {
          // Completed while user was away — load results directly
          this.currentJobId = saved.jobId;
          this.service.clearActiveJob();
          this.loadResults(saved.jobId);
        } else if (status.status === 'Failed') {
          this.service.clearActiveJob();
          Swal.fire({
            icon: 'error',
            title: 'Previous Job Failed',
            text: status.error_message || 'The previous OCR job failed.',
            confirmButtonText: 'OK',
          });
        }
      },
      error: () => {
        // Job not found or API error — clear stale localStorage
        this.service.clearActiveJob();
      },
    });
  }

  onFileSelect(event: any) {
    const files: FileList = event.target.files;
    const accepted: File[] = [];
    const rejected: { name: string; extension: string; reason: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = this.getExtension(file.name);
      const mime = file.type.toLowerCase();

      if (
        this.SUPPORTED_EXTENSIONS.includes(ext) &&
        this.SUPPORTED_MIME_TYPES.includes(mime)
      ) {
        accepted.push(file);
      } else {
        rejected.push({
          name: file.name,
          extension: ext || '(no extension)',
          reason: this.getRejectionReason(ext, mime),
        });
      }
    }
    // ── Sort accepted files by name ascending before adding ──
    accepted.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );

    this.selectedFiles.push(...accepted);
    this.rejectedFiles.push(...rejected);

    event.target.value = null;
    this.cd.detectChanges();

    // ── Show Swal only if there are rejections
    if (rejected.length > 0) {
      this.showRejectedFilesAlert(rejected, accepted.length);
    }
  }

  // ── Getter — upload is blocked if ANY rejected file still exists
  get hasRejectedFiles(): boolean {
    return this.rejectedFiles.length > 0;
  }

  // ── Remove a rejected file from the rejected list
  removeRejectedFile(index: number) {
    this.rejectedFiles.splice(index, 1);
    this.cd.detectChanges();
  }

  // ── Remove accepted file (your existing method — unchanged)
  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.cd.detectChanges();
  }

  private getExtension(filename: string): string {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }

  private getRejectionReason(ext: string, mime: string): string {
    const unsupportedMap: Record<string, string> = {
      '.bmp': 'BMP format is not supported by Gemini OCR',
      // '.tiff': 'TIFF format is not supported by Gemini OCR',
      // '.tif':  'TIFF format is not supported by Gemini OCR',
      '.svg': 'SVG is a vector format — OCR cannot extract text from it',
      '.heic': 'HEIC/HEIF format is not supported by Gemini OCR',
      '.heif': 'HEIC/HEIF format is not supported by Gemini OCR',
      '.docx': 'Word documents must be converted to PDF first',
      '.doc': 'Word documents must be converted to PDF first',
      '.xlsx': 'Excel files are not supported — export as PDF first',
      '.xls': 'Excel files are not supported — export as PDF first',
      '.txt': 'Plain text files do not need OCR — paste text directly',
      '.csv': 'CSV files are not supported by OCR',
      '.mp4': 'Video files are not supported by OCR',
      '.avi': 'Video files are not supported by OCR',
      '.mov': 'Video files are not supported by OCR',
      '.pptx': 'PowerPoint files must be converted to PDF first',
      '.ppt': 'PowerPoint files must be converted to PDF first',
    };

    if (unsupportedMap[ext]) return unsupportedMap[ext];
    if (!mime || mime === 'application/octet-stream')
      return 'Unknown file type — cannot process';
    return `File type "${ext}" is not supported by Gemini OCR`;
  }

  private showRejectedFilesAlert(
    rejected: { name: string; extension: string; reason: string }[],
    acceptedCount: number,
  ) {
    const rows = rejected
      .map(
        (f) => `
      <tr>
        <td style="padding:6px 10px;text-align:left;border-bottom:1px solid #f0f0f0">
          <span style="font-size:13px">📄 ${f.name}</span>
        </td>
        <td style="padding:6px 10px;text-align:left;border-bottom:1px solid #f0f0f0">
          <code style="background:#fff0f0;color:#c0392b;padding:2px 6px;
                       border-radius:4px;font-size:12px">${f.extension}</code>
        </td>
        <td style="padding:6px 10px;text-align:left;border-bottom:1px solid #f0f0f0;
                   font-size:12px;color:#666">${f.reason}</td>
      </tr>
    `,
      )
      .join('');

    const acceptedMsg =
      acceptedCount > 0
        ? `<p style="color:#27ae60;font-size:13px;margin-top:12px">
           ✅ <strong>${acceptedCount}</strong> valid file(s) were added successfully.
         </p>`
        : `<p style="color:#e74c3c;font-size:13px;margin-top:12px">
           ⚠️ No valid files were added.
         </p>`;

    Swal.fire({
      icon: 'warning',
      title: `${rejected.length} File(s) Not Supported`,
      html: `
        <p style="font-size:14px;color:#555;margin-bottom:12px">
          The following files were skipped because they are not supported by Gemini OCR:
        </p>
        <div style="max-height:260px;overflow-y:auto;border:1px solid #eee;border-radius:8px">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#fafafa">
                <th style="padding:8px 10px;text-align:left;font-size:12px;
                           color:#999;font-weight:600">File</th>
                <th style="padding:8px 10px;text-align:left;font-size:12px;
                           color:#999;font-weight:600">Type</th>
                <th style="padding:8px 10px;text-align:left;font-size:12px;
                           color:#999;font-weight:600">Reason</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
  
        <div style="margin-top:16px;padding:12px;background:#f8f9fa;
                    border-radius:8px;text-align:left">
          <p style="font-size:13px;font-weight:600;margin-bottom:6px;color:#333">
            ✅ Supported formats:
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${this.SUPPORTED_EXTENSIONS.map(
              (e) =>
                `<code style="background:#e8f5e9;color:#2e7d32;padding:2px 8px;
                            border-radius:4px;font-size:12px">${e}</code>`,
            ).join('')}
          </div>
        </div>
  
        ${acceptedMsg}
      `,
      confirmButtonText: 'Got it',
      width: '600px',
    });
  }


  uploadFiles() {
    if (this.selectedFiles.length === 0 || this.uploading) return;

    // Double-check — re-validate all selected files before sending
    const stillInvalid = this.selectedFiles.filter((f) => {
      const ext = this.getExtension(f.name);
      return !this.SUPPORTED_EXTENSIONS.includes(ext);
    });

    if (stillInvalid.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Files Detected',
        html: `Please remove these unsupported files before uploading:<br><br>
             ${stillInvalid
               .map(
                 (f) =>
                   `<code style="display:block;margin:4px 0;background:#fff0f0;
                             color:#c0392b;padding:3px 8px;border-radius:4px">
                  ${f.name}
                </code>`,
               )
               .join('')}`,
        confirmButtonText: 'OK',
      });
      return;
    }

    const formData = new FormData();
    this.selectedFiles.forEach((file) => formData.append('files', file));

    this.uploading = true;
    this.currentJobId = null;
    this.jobStatus = null;
    this.pollingMessage = 'Uploading files to server…';
    this.progressPercent = 0;
    this.elapsedSeconds = 0;
    this.screenState = 'processing';
    this.cd.detectChanges();

    this.service.uploadOcrImages(formData).subscribe({
      next: (res) => {
        this.currentJobId = res.jobId;
        this.jobStartedAt = new Date().toISOString();
        this.pollingMessage = 'Files uploaded. OCR processing started…';

        // Persist to localStorage so user can navigate away
        this.service.saveActiveJob(res.jobId, this.selectedFiles.length);
        this.startPolling(res.jobId);
        this.startElapsedTimer(this.jobStartedAt);
        this.cd.detectChanges();
      },
      error: (err) => {
        this.uploading = false;
        this.screenState = 'upload';
        this.pollingMessage = '';
        Swal.fire({
          icon: 'error',
          title: 'Upload Failed',
          text: err?.error?.message || 'Something went wrong while uploading.',
          confirmButtonText: 'OK',
        });
        this.cd.detectChanges();
      },
    });
  }

  startPolling(jobId: string) {
    this.stopPolling();

    this.pollingInterval = setInterval(() => {
      this.service.getOcrJobById(jobId).subscribe({
        next: (status: OcrJobStatus) => {
          this.jobStatus = status;
          this.updateProgress(status);
          this.cd.detectChanges();

          if (status.status === 'Completed') {
            this.stopPolling();
            this.stopElapsedTimer();
            this.service.clearActiveJob();
            this.loadResults(jobId);
          } else if (status.status === 'Failed') {
            this.stopPolling();
            this.stopElapsedTimer();
            this.service.clearActiveJob();
            this.uploading = false;
            this.screenState = 'upload';
            Swal.fire({
              icon: 'error',
              title: 'OCR Processing Failed',
              text: status.error_message || 'Job failed during processing.',
              confirmButtonText: 'OK',
            });
            this.cd.detectChanges();
          }
        },
        error: (err) => console.warn('Polling error (will retry):', err),
      });
    }, 3000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  cancelCurrentJob() {
    if (!this.currentJobId || this.cancellingJob) return;

    Swal.fire({
      icon: 'warning',
      title: 'Cancel OCR Job?',
      text: 'This will stop OCR processing for the current job.',
      showCancelButton: true,
      confirmButtonText: 'Yes, Cancel Job',
      cancelButtonText: 'Keep Running',
      confirmButtonColor: '#c0392b',
    }).then((result) => {
      if (!result.isConfirmed || !this.currentJobId) return;

      this.cancellingJob = true;
      this.cd.detectChanges();

      this.service.cancelOcrJob(this.currentJobId).subscribe({
        next: (res) => {
          this.stopPolling();
          this.stopElapsedTimer();
          this.service.clearActiveJob();
          this.uploading = false;
          this.cancellingJob = false;
          this.screenState = 'upload';
          this.pollingMessage = '';
          this.progressPercent = 0;
          this.jobStatus = null;
          this.currentJobId = null;
          this.cd.detectChanges();

          Swal.fire({
            icon: 'success',
            title: 'Job Cancelled',
            text: res?.message || 'OCR job cancelled successfully.',
            confirmButtonText: 'OK',
          });
        },
        error: (err) => {
          this.cancellingJob = false;
          Swal.fire({
            icon: 'error',
            title: 'Cancel Failed',
            text: err?.error?.message || 'Could not cancel the OCR job.',
            confirmButtonText: 'OK',
          });
          this.cd.detectChanges();
        },
      });
    });
  }

  updateProgress(status: OcrJobStatus) {
    this.progressPercent =
      status.total_files > 0
        ? Math.round((status.processed_files / status.total_files) * 100)
        : 0;

    switch (status.status) {
      case 'Queued':
        this.pollingMessage = 'Job is queued — waiting for worker…';
        break;
      case 'Processing':
        this.pollingMessage = `Processing ${status.processed_files} of ${status.total_files} files (${this.progressPercent}%)`;
        break;
      case 'Completed':
        this.pollingMessage = '✅ All files processed! Loading results…';
        this.progressPercent = 100;
        break;
    }
  }

  startElapsedTimer(startedAt: string) {
    this.stopElapsedTimer();
    const start = new Date(startedAt).getTime();

    this.elapsedTimer = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - start) / 1000);
      this.cd.detectChanges();
    }, 1000);
  }

  stopElapsedTimer() {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
  }

  get elapsedFormatted(): string {
    const m = Math.floor(this.elapsedSeconds / 60);
    const s = this.elapsedSeconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }

  get estimatedRemaining(): string {
    if (!this.jobStatus || this.jobStatus.processed_files === 0) return '—';
    const rate = this.elapsedSeconds / this.jobStatus.processed_files; // sec per file
    const remaining = Math.round(
      rate * (this.jobStatus.total_files - this.jobStatus.processed_files),
    );
    if (remaining <= 0) return 'Almost done…';
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return m > 0 ? `~${m}m ${s}s` : `~${s}s`;
  }

  private preserveLines(text: string): string {
    // If already HTML, return as-is
    if (text.trim().startsWith('<')) return text;

    return text
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
  private getSourceDocumentName(fileName: string): string {
    // Matches  _p<digits>.<ext>  at the end, e.g.  "_p12.jpg"
    return fileName.replace(/_p\d+\.[^.]+$/i, '') || fileName;
  }
  private getPageNumber(fileName: string): number | null {
    const match = fileName.match(/_p(\d+)\.[^.]+$/i);
    return match ? parseInt(match[1], 10) : null;
  }
  // loadResults(jobId: string) {
  //   this.service.getOcrJobResults(jobId).subscribe({
  //     next: (results: OcrFileResult[]) => {
  //       const parsed: any[] = [];
  //       const typeVotes: Record<string, number> = {};
  //       const nameVotes: Record<string, number> = {};
  
  //       results.forEach((fileResult, index) => {
  //         try {
  //           const geminiObj = JSON.parse(fileResult.ocr_text);
  //           const rawText = geminiObj?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  //           let extractedText = rawText;
  //           let suggestedType = '';
  //           let suggestedName = '';

  //           try {
  //             // Gemini sometimes wraps JSON in ```json ... ``` — strip it
  //             const clean = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  //             const structured = JSON.parse(clean);
  //             extractedText = structured.extracted_text ?? rawText;
  //             suggestedType = (structured.suggested_document_type ?? '').trim();
  //             suggestedName = (structured.suggested_document_name ?? '').trim();
  //           } catch {
  //             // fallback to raw text
  //           }
  
  //           // Vote counting
  //           if (suggestedType) typeVotes[suggestedType] = (typeVotes[suggestedType] ?? 0) + 1;
  //           if (suggestedName) nameVotes[suggestedName] = (nameVotes[suggestedName] ?? 0) + 1;
  //             // REPLACE with:
  //             parsed.push({ 
  //               fileName: fileResult.file_name, 
  //               extractedText: this.preserveLines(extractedText),  // ← convert here
  //               pageNumber: index + 1 
  //             });
  //         } catch {
  //           errorFiles.push({
  //             name: fileResult.file_name || `File ${index + 1}`,
  //             message: 'Failed to parse OCR response'
  //           });
  //         }
  //       });
  
  //       // Pick winner by most votes
  //       const bestType = this.topVote(typeVotes);
  //       const bestName = this.topVote(nameVotes);
  
  //       this.ocrResults = parsed;
  //       this.buildEditableForm(parsed, bestType, bestName);
  //       this.currentPageIndex = 0;
  //       this.uploading = false;
  //       this.screenState = 'edit';
  //       this.cd.detectChanges();
  //     };

  //     if (errorFiles.length > 0 && parsed.length > 0) {
  //       const rows = errorFiles.map(f => `
  //         <tr>
  //           <td style="padding:6px 10px;font-size:13px;border-bottom:1px solid #f0f0f0">📄 ${f.name}</td>
  //           <td style="padding:6px 10px;font-size:12px;color:#c0392b;border-bottom:1px solid #f0f0f0">
  //             ${f.message}
  //           </td>
  //         </tr>`).join('');

  //       Swal.fire({
  //         icon: 'warning',
  //         title: `${errorFiles.length} File(s) Failed`,
  //         html: `
  //           <p style="font-size:14px;color:#555;margin-bottom:12px">
  //             The following files could not be processed and were skipped:
  //           </p>
  //           <div style="max-height:200px;overflow-y:auto;border:1px solid #eee;border-radius:8px">
  //             <table style="width:100%;border-collapse:collapse">
  //               <tbody>${rows}</tbody>
  //             </table>
  //           </div>
  //           <p style="color:#27ae60;font-size:13px;margin-top:12px">
  //             ✅ ${parsed.length} file(s) loaded successfully.
  //           </p>`,
  //         confirmButtonText: 'Continue with valid files',
  //         width: '560px'
  //       }).then(() => proceedToEdit()); // ← .then() instead of await
  //     } else {
  //       proceedToEdit(); // ← all succeeded, go directly
  //     }
  //     }},
  //     error: () => {
  //       this.uploading = false;
  //       this.screenState = 'upload';
  //       Swal.fire({
  //         icon: 'error',
  //         title: 'Load Failed',
  //         text: 'Could not load OCR results.',
  //         confirmButtonText: 'OK',
  //       });
  //       this.cd.detectChanges();
  //     },
  //   });
  // }

  loadResults(jobId: string) {
    this.service.getOcrJobResults(jobId).subscribe({
      next: (results: OcrFileResult[]) => {
        const parsed: ParsedOcrPage[] = [];
        const typeVotes: Record<string, number> = {};
        const nameVotes: Record<string, number> = {};
        const errorFiles: FailedOcrPage[] = [];
  
        results.forEach((fileResult, index) => {
          const fallbackPageNumber = this.extractPageNumber(fileResult.file_name, index + 1);

          if (!fileResult.success || !fileResult.ocr_text) {
            errorFiles.push({
              fileName: fileResult.file_name || `File ${index + 1}`,
              pageNumber: fallbackPageNumber,
              message: fileResult.error || 'OCR processing failed'
            });
            return;
          }

          try {
            const geminiObj = JSON.parse(fileResult.ocr_text);
  
            // ── Detect top-level Gemini API error ──
            if (geminiObj?.error) {
              errorFiles.push({
                fileName: fileResult.file_name || `File ${index + 1}`,
                pageNumber: fallbackPageNumber,
                message: geminiObj.error.message || 'Unknown API error'
              });
              return;
            }
  
            const rawText = geminiObj?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
            let extractedText = rawText;
            let suggestedType = '';
            let suggestedName = '';
  
            try {
              const clean = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
              const structured = JSON.parse(clean);
              extractedText = structured.extracted_text        ?? rawText;
              suggestedType = (structured.suggested_document_type ?? '').trim();
              suggestedName = (structured.suggested_document_name ?? '').trim();
            } catch {
              // fallback to raw text
            }
  
            if (suggestedType) typeVotes[suggestedType] = (typeVotes[suggestedType] ?? 0) + 1;
            if (suggestedName) nameVotes[suggestedName] = (nameVotes[suggestedName] ?? 0) + 1;
  
            parsed.push({
              fileName: fileResult.file_name,
              extractedText: this.preserveLines(extractedText),
              pageNumber: fallbackPageNumber
            });
  
          } catch {
            errorFiles.push({
              fileName: fileResult.file_name || `File ${index + 1}`,
              pageNumber: fallbackPageNumber,
              message: 'Failed to parse OCR response'
            });
          }
        });

        parsed.sort((a, b) => a.pageNumber - b.pageNumber || a.fileName.localeCompare(b.fileName));
        errorFiles.sort((a, b) => a.pageNumber - b.pageNumber || a.fileName.localeCompare(b.fileName));
  
        // ── Helper to proceed to edit screen ──
        const proceedToEdit = () => {
          const bestType = this.topVote(typeVotes);
          const bestName = this.topVote(nameVotes);
          this.ocrResults = parsed;
          this.failedOcrPages = errorFiles;
          this.buildEditableForm(parsed, bestType, bestName);
          this.currentPageIndex = 0;
          this.uploading   = false;
          this.screenState = 'edit';
          this.cd.detectChanges();
        };
  
        // ── All files failed — go back to upload screen ──
        if (errorFiles.length > 0 && parsed.length === 0) {
          this.uploading   = false;
          this.screenState = 'upload';
  
          const rows = errorFiles.map(f => `
            <tr>
              <td style="padding:6px 10px;text-align:left;border-bottom:1px solid #f0f0f0;font-size:13px">
                📄 ${f.fileName}
              </td>
              <td style="padding:6px 10px;text-align:left;border-bottom:1px solid #f0f0f0;
                         font-size:12px;color:#c0392b">
                ${f.message}
              </td>
            </tr>`).join('');
  
          Swal.fire({
            icon: 'error',
            title: 'OCR Failed for All Files',
            html: `
              <p style="font-size:14px;color:#555;margin-bottom:12px">
                None of the files could be processed:
              </p>
              <div style="max-height:260px;overflow-y:auto;border:1px solid #eee;border-radius:8px">
                <table style="width:100%;border-collapse:collapse">
                  <thead>
                    <tr style="background:#fafafa">
                      <th style="padding:8px 10px;text-align:left;font-size:12px;color:#999">File</th>
                      <th style="padding:8px 10px;text-align:left;font-size:12px;color:#999">Error</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>`,
            confirmButtonText: 'OK',
            width: '580px'
          });
          this.cd.detectChanges();
          return;
        }
  
       // ── Some files failed, some succeeded — warn then continue ──
        if (errorFiles.length > 0 && parsed.length > 0) {
          const rows = errorFiles.map(f => `
            <tr>
              <td style="padding:6px 10px;font-size:13px;border-bottom:1px solid #f0f0f0">
                📄 ${f.fileName}
              </td>
              <td style="padding:6px 10px;font-size:12px;color:#c0392b;border-bottom:1px solid #f0f0f0">
                ${f.message}
              </td>
            </tr>`).join('');
  
          Swal.fire({
            icon: 'warning',
            title: `${errorFiles.length} File(s) Failed`,
            html: `
              <p style="font-size:14px;color:#555;margin-bottom:12px">
                The following files could not be processed and were skipped:
              </p>
              <div style="max-height:200px;overflow-y:auto;border:1px solid #eee;border-radius:8px">
                <table style="width:100%;border-collapse:collapse">
                  <tbody>${rows}</tbody>
                </table>
              </div>
              <p style="color:#27ae60;font-size:13px;margin-top:12px">
                ✅ ${parsed.length} file(s) loaded successfully.
              </p>`,
            confirmButtonText: 'Continue with valid files',
            width: '560px'
          }).then(() => proceedToEdit());
          return;
        }
  
        // ── All files failed — go back to upload screen ──
      //   if (errorFiles.length > 0 && parsed.length === 0) {
      //   this.uploading   = false;
      //   this.screenState = 'upload';

      //   Swal.fire({
      //     icon: 'error',
      //     title: 'OCR Failed',
      //     html: `
      //       <p style="font-size:14px;color:#555;">
      //         All <strong>${errorFiles.length}</strong> file(s) could not be processed.
      //       </p>
      //       <p style="font-size:13px;color:#c0392b;margin-top:8px;">
      //         ${errorFiles[0].message}
      //       </p>`,
      //     confirmButtonText: 'OK',
      //     width: '460px'
      //   });
      //   this.cd.detectChanges();
      //   return;
      // }
      // ── Some files failed, some succeeded — warn then continue ──
      // if (errorFiles.length > 0 && parsed.length > 0) {
      //   Swal.fire({
      //     icon: 'warning',
      //     title: `${errorFiles.length} File(s) Failed`,
      //     html: `
      //       <p style="font-size:14px;color:#555;margin-bottom:8px;">
      //         <strong>${errorFiles.length}</strong> file(s) could not be processed and were skipped.
      //       </p>
      //       <p style="font-size:13px;color:#c0392b;margin-bottom:8px;">
      //         ${errorFiles[0].message}
      //       </p>
      //       <p style="color:#27ae60;font-size:13px;">
      //         ✅ ${parsed.length} file(s) loaded successfully.
      //       </p>`,
      //     confirmButtonText: 'Continue with valid files',
      //     width: '460px'
      //   }).then(() => proceedToEdit());
      //   return;
      // }

        // ── All files succeeded ──
        proceedToEdit();
      },
      error: () => {
        this.uploading   = false;
        this.screenState = 'upload';
        Swal.fire({
          icon: 'error',
          title: 'Load Failed',
          text: 'Could not load OCR results.',
          confirmButtonText: 'OK'
        });
        this.cd.detectChanges();
      }
    });
  }

  private parseSingleResult(
    fileResult: OcrFileResult,
    fallbackPageNumber?: number,
  ): ParsedOcrPage | null {
    if (!fileResult?.ocr_text) {
      return null;
    }

    const pageNumber = this.extractPageNumber(
      fileResult.file_name,
      fallbackPageNumber ?? 1,
    );

    try {
      const geminiObj = JSON.parse(fileResult.ocr_text);
      if (geminiObj?.error) {
        return null;
      }

      const rawText = geminiObj?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let extractedText = rawText;

      try {
        const clean = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const structured = JSON.parse(clean);
        extractedText = structured.extracted_text ?? rawText;
      } catch {
      }

      return {
        fileName: fileResult.file_name,
        extractedText: this.preserveLines(extractedText),
        pageNumber,
      };
    } catch {
      return null;
    }
  }

  private upsertRetriedPage(page: ParsedOcrPage) {
    const sortedResults = [...this.ocrResults.filter(p => p.fileName !== page.fileName), page]
      .sort((a, b) => a.pageNumber - b.pageNumber || a.fileName.localeCompare(b.fileName));

    this.ocrResults = sortedResults;

    const existingIndex = this.pages.controls.findIndex(
      control => control.get('fileName')?.value === page.fileName,
    );

    const formGroup = this.fb.group({
      fileName: new FormControl(page.fileName),
      pageNumber: new FormControl(page.pageNumber),
      extractedText: new FormControl(page.extractedText),
    });

    const insertIndex = sortedResults.findIndex(
      item => item.fileName === page.fileName && item.pageNumber === page.pageNumber,
    );

    if (existingIndex >= 0) {
      this.pages.removeAt(existingIndex);
    }

    this.pages.insert(insertIndex, formGroup);
    this.currentPageIndex = insertIndex;
    this.rebuildSavedPagesAfterRetry(insertIndex, existingIndex);
  }

  private rebuildSavedPagesAfterRetry(insertIndex: number, removedIndex: number) {
    const updated = new Set<number>();

    this.savedPages.forEach((index) => {
      let nextIndex = index;

      if (removedIndex >= 0) {
        if (index === removedIndex) {
          return;
        }

        if (index > removedIndex) {
          nextIndex = index - 1;
        }
      }

      if (nextIndex >= insertIndex) {
        nextIndex += 1;
      }

      updated.add(nextIndex);
    });

    this.savedPages = updated;
  }

  private extractPageNumber(fileName: string, fallbackPageNumber: number): number {
    const match = fileName?.match(/_p(\d+)(?:\D|$)/i);
    return match ? Number(match[1]) : fallbackPageNumber;
  }

  private topVote(votes: Record<string, number>): string {
    const entries = Object.entries(votes);
    if (!entries.length) return '';
    return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }


  dismissAndContinue() {
    Swal.fire({
      icon: 'info',
      title: 'Job Running in Background',
      html: `Your OCR job is still processing.<br><br>
             <strong>Come back to this screen anytime</strong> — 
             the progress will resume automatically.`,
      confirmButtonText: 'Got it!',
    }).then(() => {
      // Navigate away — user's choice handled by router
      // For now just go back to upload screen (progress persists in localStorage)
      this.stopPolling();
      this.stopElapsedTimer();
      this.screenState = 'upload';
      this.uploading = false;
      this.cd.detectChanges();
    });
  }


  buildEditableForm(results: ParsedOcrPage[], suggestedType = '', suggestedName = '') {
    const pagesArray = this.fb.array<FormGroup>([]);
    results.forEach((r) => {
      pagesArray.push(
        this.fb.group({
          fileName: new FormControl(r.fileName),
          pageNumber: new FormControl(r.pageNumber),
          extractedText: new FormControl(r.extractedText),
        }),
      );
    });

    this.editForm = this.fb.group({
      documentTypeId: new FormControl(null),
      documentId: new FormControl(null),
      documentType: new FormControl(suggestedType),
      documentName: new FormControl(suggestedName),
      pages: pagesArray,
    });

    this.editForm.get('documentTypeId')?.valueChanges.subscribe((value) => {
      if (value) {
        this.editForm.get('documentType')?.setValue('', { emitEvent: false });
        this.isDocumentTypeSaved = true;
        this.documentTypeId = +value;
        this.documentropdown();
      } else {
        this.isDocumentTypeSaved = false;
        this.documentTypeId = 0;
      }
      this.cd.detectChanges();
    });

    this.editForm.get('documentType')?.valueChanges.subscribe((value) => {
      if (value?.trim()) {
        this.editForm
          .get('documentTypeId')
          ?.setValue(null, { emitEvent: false });
        this.isDocumentTypeSaved = false;
        this.documentTypeId = 0;
      }
      this.cd.detectChanges();
    });

    this.editForm.get('documentId')?.valueChanges.subscribe((value) => {
      if (value) {
        this.editForm.get('documentName')?.setValue('', { emitEvent: false });
        this.isDocumentSaved = true;
        this.documentId = +value;
      } else {
        this.isDocumentSaved = false;
        this.documentId = 0;
      }
      this.cd.detectChanges();
    });

    this.editForm.get('documentName')?.valueChanges.subscribe((value) => {
      if (value?.trim()) {
        this.editForm.get('documentId')?.setValue(null, { emitEvent: false });
        this.isDocumentSaved = false;
        this.documentId = 0;
      }
      this.cd.detectChanges();
    });
  }

  get pages(): FormArray<FormGroup> {
    return this.editForm.get('pages') as FormArray<FormGroup>;
  }

  goToPage(index: number) {
    if (index < 0 || index >= this.pages.controls.length) return;
    this.pageEditor.destroy();
    this.pageEditor = new Editor();
    this.currentPageIndex = index;
    this.cd.detectChanges();
  }

  shouldShowPageButton(i: number): boolean {
    const total = this.pages.controls.length;
    if (total <= 7) return true;
    const cur = this.currentPageIndex;
    return (
      i === 0 || i === total - 1 || i === cur || i === cur - 1 || i === cur + 1
    );
  }

  shouldShowEllipsisBefore(i: number): boolean {
    const total = this.pages.controls.length;
    if (total <= 7) return false;
    const cur = this.currentPageIndex;
    if (i === Math.max(1, cur - 1) && cur > 2) return true;
    if (i === total - 1 && cur < total - 3) return true;
    return false;
  }

  getCurrentPageNumber(): number {
    return this.pages.at(this.currentPageIndex)?.get('pageNumber')?.value ?? this.currentPageIndex + 1;
  }

  isRetryingFailedPage(fileName: string): boolean {
    return this.retryingFailedPages.has(fileName);
  }

  retryFailedPage(item: FailedOcrPage) {
    if (!this.currentJobId || this.isRetryingFailedPage(item.fileName)) {
      return;
    }

    this.retryingFailedPages.add(item.fileName);
    this.cd.detectChanges();

    this.service.retryOcrResult(this.currentJobId, item.fileName).subscribe({
      next: (result) => {
        const parsedPage = this.parseSingleResult(result, item.pageNumber);
        if (!parsedPage) {
          this.retryingFailedPages.delete(item.fileName);
          Swal.fire({
            icon: 'error',
            title: 'Retry Failed',
            text: 'Retry completed but the OCR response is still invalid.',
            confirmButtonText: 'OK'
          });
          this.cd.detectChanges();
          return;
        }

        this.upsertRetriedPage(parsedPage);
        this.failedOcrPages = this.failedOcrPages.filter(page => page.fileName !== item.fileName);
        this.retryingFailedPages.delete(item.fileName);
        this.cd.detectChanges();

        Swal.fire({
          icon: 'success',
          title: 'Page Retried',
          text: `Page ${parsedPage.pageNumber} was added back successfully.`,
          confirmButtonText: 'OK'
        });
      },
      error: (err) => {
        this.retryingFailedPages.delete(item.fileName);
        Swal.fire({
          icon: 'error',
          title: 'Retry Failed',
          text: err?.error?.message || `Could not retry ${item.fileName}. Please try again.`,
          confirmButtonText: 'OK'
        });
        this.cd.detectChanges();
      }
    });
  }

  documentTyperopdown() {
    this.service.dropdownAll('', '1', '3', '0').subscribe((response) => {
      this.documentTypedata = [
        { id: '', text: '' },
        ...response.map((item: any) => ({
          id: item.id.toString(),
          text: item.text,
        })),
      ];
      this.documentTypeoptions = {
        data: this.documentTypedata,
        width: '100%',
        placeholder: 'Select Document Type',
        allowClear: true,
      };
      this.cd.detectChanges();
    });
  }

  documentropdown() {
    this.service
      .dropdownAll('', '1', '1', this.documentTypeId?.toString() || '0')
      .subscribe((response) => {
        this.documentdata = [
          { id: '', text: '' },
          ...response.map((item: any) => ({
            id: item.id.toString(),
            text: item.text,
          })),
        ];
        this.documentoptions = {
          data: this.documentdata,
          width: '100%',
          placeholder: 'Select Document Name',
          allowClear: true,
        };
        this.cd.detectChanges();
      });
  }

  saveDocumentType() {
    const formValue = this.editForm.getRawValue();
    if (!formValue.documentType?.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation',
        text: 'Please enter a Document Type name.',
        confirmButtonText: 'OK',
      });
      return;
    }
    this.service
      .saveDocumentTypeJson({
        documentTypeId: 0,
        documentTypeName: formValue.documentType.trim(),
        isActive: true,
        createdBy: 1,
      })
      .subscribe({
        next: (res: any) => {
          const newId = res.documentTypeId || res.DocumentTypeId;
          if (!newId) {
            Swal.fire({
              icon: 'error',
              title: 'Failed',
              text: 'Save failed.',
              confirmButtonText: 'OK',
            });
            return;
          }
          this.documentTypeId = newId;
          this.isDocumentTypeSaved = true;
          Swal.fire({
            icon: 'success',
            title: 'Saved!',
            text: `Document Type saved. ID = ${newId}`,
            confirmButtonText: 'OK',
          });
          this.cd.detectChanges();
        },
        error: (err: any) => {
          //this.saving = false;

          const errorMessage = err?.error?.message || 'Failed to save Document Type';

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
          });
        },
      });
  }

  saveDocument() {
    if (!this.documentTypeId) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation',
        text: 'Please save or select a Document Type first.',
        confirmButtonText: 'OK',
      });
      return;
    }
    const formValue = this.editForm.getRawValue();
    if (!formValue.documentName?.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation',
        text: 'Please enter a Document Name.',
        confirmButtonText: 'OK',
      });
      return;
    }
    this.service
      .saveDocument({
        DocumentId: 0,
        DocumentTypeId: this.documentTypeId,
        DocumentName: formValue.documentName.trim(),
        TotalPages: this.pages.length,
        CreatedBy: 1,
      })
      .subscribe({
        next: (res: any) => {
          this.documentId = res.documentId || res.DocumentId;
          this.isDocumentSaved = true;
          Swal.fire({
            icon: 'success',
            title: 'Saved!',
            text: `Document saved.`,
            confirmButtonText: 'OK',
          });
          this.cd.detectChanges();
        },
        error: (err: any) => {
          const errorMessage = err?.error?.message || 'Failed to save Document';

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
          });
        },
      });
  }

  savePage(index: number) {
    if (!this.documentId) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation',
        text: 'Please save the Document first.',
        confirmButtonText: 'OK',
      });
      return;
    }
    const page = this.pages.at(index).value;
    this.service
      .saveDocumentPage({
        DocumentPageId: 0,
        DocumentId: this.documentId,
        PageNumber: page.pageNumber,
        ExtractedText: page.extractedText,
        StatusId: 0,
        CreatedBy: 1,
      })
      .subscribe({
        next: () => {
          this.savedPages.add(index);
          Swal.fire({
            icon: 'success',
            title: 'Saved!',
            text: `Page ${page.pageNumber} saved.`,
            confirmButtonText: 'OK',
          }).then(() => {
            const isLastPage = index === this.pages.controls.length - 1; // ← check if last
            if (isLastPage) {
              this.router.navigate(['/settings/ocr-data']); // ← navigate if last page
            } else {
              // your existing logic — go to next unsaved page
              const next = this.pages.controls.findIndex(
                (_, idx) => idx > index && !this.savedPages.has(idx),
              );
              if (next !== -1) this.goToPage(next);
            }
            this.cd.detectChanges();
          });
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Page Save Failed',
            text:
              err?.error?.message ||
              `Could not save Page ${page.pageNumber}. Please try again.`,
            confirmButtonText: 'OK',
          });
        },
      });
  }

  async saveAllRemainingPages() {
    if (!this.documentId) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation',
        text: 'Please save the Document first.',
        confirmButtonText: 'OK',
      });
      return;
    }
    const unsaved = this.pages.controls
      .map((_, i) => i)
      .filter((i) => !this.savedPages.has(i));
    if (!unsaved.length) {
      Swal.fire({
        icon: 'info',
        title: 'Info',
        text: 'All pages already saved!',
        confirmButtonText: 'OK',
      });
      return;
    }
    try {
      for (const i of unsaved) await this.savePageAsync(i);
      Swal.fire({
        icon: 'success',
        title: 'Done!',
        text: 'All pages saved!',
        confirmButtonText: 'OK',
      }).then(() => {
        this.router.navigate(['/settings/ocr-data']); // ← navigate after OK
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Bulk Save Failed',
        text:
          err?.error?.message ||
          'One or more pages could not be saved. Please check and retry.',
        confirmButtonText: 'OK',
      });
    }
    this.cd.detectChanges();
  }

  private savePageAsync(index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const page = this.pages.at(index).value;
      this.service
        .saveDocumentPage({
          DocumentPageId: 0,
          DocumentId: this.documentId,
          PageNumber: page.pageNumber,
          ExtractedText: page.extractedText,
          StatusId: 0,
          CreatedBy: 1,
          RejectionReason: page.rejectionreason,
        })
        .subscribe({
          next: () => {
            this.savedPages.add(index);
            this.cd.detectChanges();
            resolve();
          },
          error: (err) => reject(err),
        });
    });
  }
  removePage(index: number) {
    const pageNumber = this.pages.at(index).get('pageNumber')?.value ?? index + 1;
    Swal.fire({
      icon: 'warning',
      title: 'Remove Page?',
      html: `Are you sure you want to remove <strong>Page ${pageNumber}</strong>?<br>
             <small style="color:#999">${this.pages.at(index).get('fileName')?.value}</small>`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
    }).then((result) => {
      if (result.isConfirmed) {
        this.pages.removeAt(index);

        // Fix savedPages — shift all indexes above removed one down by 1
        const updated = new Set<number>();
        this.savedPages.forEach((i) => {
          if (i < index) updated.add(i);
          else if (i > index) updated.add(i - 1);
          // i === index is dropped (it's removed)
        });
        this.savedPages = updated;

        // Adjust currentPageIndex if needed
        if (this.currentPageIndex >= this.pages.controls.length) {
          this.currentPageIndex = Math.max(0, this.pages.controls.length - 1);
        }

        this.cd.detectChanges();

        Swal.fire({
          icon: 'success',
          title: 'Removed',
          text: `Page ${index + 1} has been removed.`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  }
}
