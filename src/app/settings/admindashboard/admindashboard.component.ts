import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ServiceService } from '../settings.service';

// ── Interfaces — PascalCase matching actual API response keys ─────────────────
interface DashboardStats {
  TotalDocuments:     number;
  TotalPagesScanned:  number;
  AISummaries:        number;
  DocumentTypes:      number;
  LanguagesSupported: number;
  TodayUploads:       number;
  TodaySummaries:     number;
  ThisMonthDocuments: number;
  ThisWeekPages:      number;
  TodayUploadsChange: number;
}

interface RecentDocumentResult {
  DocumentId:       number;
  DocumentName:     string;
  DocumentTypeName: string;
  TotalPages:       number;
  CreatedDate:      string;
  Status:           string;
  StatusClass:      string;
}

interface DocumentTypeBreakdown {
  DocumentTypeId:   number;
  DocumentTypeName: string;
  DocumentCount:    number;
  Percentage:       number;
}

interface MonthlyUploadActivity {
  Year:          number;
  Month:         number;
  MonthName:     string;
  DocumentCount: number;
}

interface TopSearchedDocument {
  Rank:         number;
  DocumentName: string;
  SearchCount:  number;
}

interface TodaySevaStats {
  TodayUploads:   number;
  TodayPages:     number;
  TodaySummaries: number;
  TodayNewTypes:  number;
  TodayVoiceReqs: number;
}

interface DashboardResponse {
  stats:           DashboardStats;
  recentDocs:      RecentDocumentResult[];
  typeBreakdown:   DocumentTypeBreakdown[];
  monthlyActivity: MonthlyUploadActivity[];
  topSearched:     TopSearchedDocument[];
  todaySeva:       TodaySevaStats;
}

@Component({
  selector: 'app-admindashboard',
  templateUrl: './admindashboard.component.html',
  styleUrl: './admindashboard.component.scss'
})
export class AdmindashboardComponent implements OnInit, OnDestroy {

  // ── Clock ─────────────────────────────────────────────────────────────────
  currentTime = '';
  currentDate = '';
  private clockInterval: any;

  // ── API data ──────────────────────────────────────────────────────────────
  stats:           DashboardStats | null   = null;
  recentDocs:      RecentDocumentResult[]  = [];
  typeBreakdown:   DocumentTypeBreakdown[] = [];
  monthlyActivity: MonthlyUploadActivity[] = [];
  topSearched:     TopSearchedDocument[]   = [];
  todaySeva:       TodaySevaStats | null   = null;
  isLoading = true;
  hasError  = false;
  errorMsg  = '';

  // ── Floating lotus particles ──────────────────────────────────────────────
  particles = Array.from({ length: 10 }, () => ({
    left:     `${Math.random() * 100}%`,
    delay:    `${Math.random() * 8}s`,
    duration: `${8 + Math.random() * 6}s`
  }));

  // ── Donut colours ─────────────────────────────────────────────────────────
  donutColors = ['#ff6600','#2e7d32','#1565c0','#6a1b9a','#f9a825','#c62828','#00838f','#4e342e'];

  // ── Bar chart max ─────────────────────────────────────────────────────────
  get barMax(): number {
    if (!this.monthlyActivity.length) return 1;
    return Math.max(...this.monthlyActivity.map(m => m.DocumentCount)) || 1;
  }

  // ── Voice bar max ─────────────────────────────────────────────────────────
  get searchMax(): number {
    if (!this.topSearched.length) return 1;
    return this.topSearched[0].SearchCount || 1;
  }

  voiceBarColors = ['#ff6600','#f9a825','#2e7d32','#1565c0','#6a1b9a','#c62828'];

  constructor(
    private http: HttpClient,
    private router: Router,
    private _service: ServiceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
  }

  updateClock(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    this.currentDate = now.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.hasError  = false;
    this.errorMsg  = '';

    this._service.GetFullDashboard().subscribe({
      next: (raw: any) => {
        // ── Guard: log exactly what arrived ──────────────────────────────
        console.log('[Dashboard] raw response:', raw);

        // SP7 wraps everything — unwrap if needed
        // Some .NET setups return { value: {...} } or the object directly
        const data: DashboardResponse = (raw?.stats) ? raw : raw?.value ?? raw;

        this.stats           = data.stats           ?? null;
        this.recentDocs      = data.recentDocs      ?? [];
        this.typeBreakdown   = data.typeBreakdown   ?? [];
        this.monthlyActivity = data.monthlyActivity ?? [];
        this.topSearched     = data.topSearched     ?? [];
        this.todaySeva       = data.todaySeva       ?? null;

        console.log('[Dashboard] stats assigned:', this.stats);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[Dashboard] API error:', err);
        this.errorMsg  = err?.error?.message ?? err?.message ?? 'Unknown error';
        this.hasError  = true;
        this.isLoading = false;
      }
    });
  }

  // ── Donut SVG ─────────────────────────────────────────────────────────────
  private readonly CIRC = 2 * Math.PI * 70;

  getDonutDashArray(percentage: number): string {
    const slice = (percentage / 100) * this.CIRC;
    return `${slice} ${this.CIRC - slice}`;
  }

  getDonutOffset(index: number): string {
    let consumed = 0;
    for (let i = 0; i < index; i++) {
      consumed += (this.typeBreakdown[i].Percentage / 100) * this.CIRC;
    }
    return `${-consumed}`;
  }

  // ── Bar chart ─────────────────────────────────────────────────────────────
  getBarHeight(count: number): string {
    return `${Math.round((count / this.barMax) * 100)}%`;
  }

  getBarColor(index: number): string {
    const maxCount = this.barMax;
    if (this.monthlyActivity[index]?.DocumentCount === maxCount) return '#f9a825';
    const now = new Date();
    if (this.monthlyActivity[index]?.Month === now.getMonth() + 1
     && this.monthlyActivity[index]?.Year  === now.getFullYear()) return '#1565c0';
    return '#ff6600';
  }

  // ── Voice bars ────────────────────────────────────────────────────────────
  getVoiceBarWidth(count: number): string {
    return `${Math.round((count / this.searchMax) * 100)}%`;
  }

  // ── Date format ───────────────────────────────────────────────────────────
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}