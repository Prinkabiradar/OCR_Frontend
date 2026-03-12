import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ServiceService } from '../../settings.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-agent-add',
  templateUrl: './agent-add.component.html',
  styleUrls: ['./agent-add.component.scss']
})
export class AgentAddComponent implements OnInit {

  // ✅ Pagination — exactly like RolesDataComponent
  totalPages   : number = 0;
  currentPage  : number = 1;
  totalRecords : number = 0;
  itemsPerPage          = 5;
  searchQuery  : string = '';

  pages: any[] = [];

  // ✅ Pages list — exactly like roleList$
  pageList$: Observable<any[]>;
  private pageListSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  userQuestion  = '';
  documentName  = '';
  fullText      = '';
  isListening   = false;
  isLoading     = false;
  isSpeaking    = false;
  notFound      = false;
  summary       = '';
  isSummarizing = false;
  showSummary   = false;

  // ✅ Voice controls
  availableVoices: SpeechSynthesisVoice[] = [];
  selectedVoice  : SpeechSynthesisVoice | null = null;
  speechRate      = 0.85;
  speechPitch     = 1.0;
  speechVolume    = 1.0;
  detectedLang    = '';

  private recognition: any;

  private maleVoiceKeywords   = ['ravi', 'male', 'man', 'david', 'james', 'paul', 'hemant'];
  private femaleVoiceKeywords = ['heera', 'female', 'woman', 'lekha', 'priya', 'zira', 'susan'];

  private langPatterns = [
    { lang: 'hi-IN', label: 'Hindi',          pattern: /[\u0900-\u097F]/ },
    { lang: 'bn-IN', label: 'Bengali',         pattern: /[\u0980-\u09FF]/ },
    { lang: 'ta-IN', label: 'Tamil',           pattern: /[\u0B80-\u0BFF]/ },
    { lang: 'te-IN', label: 'Telugu',          pattern: /[\u0C00-\u0C7F]/ },
    { lang: 'kn-IN', label: 'Kannada',         pattern: /[\u0C80-\u0CFF]/ },
    { lang: 'ml-IN', label: 'Malayalam',       pattern: /[\u0D00-\u0D7F]/ },
    { lang: 'gu-IN', label: 'Gujarati',        pattern: /[\u0A80-\u0AFF]/ },
    { lang: 'pa-IN', label: 'Punjabi',         pattern: /[\u0A00-\u0A7F]/ },
    { lang: 'en-IN', label: 'Indian English',  pattern: /[a-zA-Z]/        }
  ];

  constructor(private service: ServiceService, private cd: ChangeDetectorRef) {
    this.pageList$ = this.pageListSubject.asObservable();
    this.setupSpeechRecognition();
  }

  ngOnInit(): void {
    this.loadVoices();
  }
  get indianVoices() {
    const indianLangs = ['en-IN', 'hi', 'bn', 'ta', 'te', 'kn', 'ml', 'gu', 'pa'];
    return this.availableVoices.filter(v => indianLangs.some(l => v.lang.startsWith(l)));
  }
  // ✅ Main search — exactly like RolesGET()
  AgentGET() {
    const startIndex     = this.currentPage;
    const pageSize       = this.itemsPerPage;
    const searchBy       = this.searchQuery ? '1' : '0';
    const searchCriteria = this.userQuestion;  // ✅ document name/question

    this.isLoading = true;
    this.notFound  = false;
    this.cd.detectChanges();

    this.service.askAgent(
      this.userQuestion,
      startIndex,
      pageSize,
      searchBy,
      searchCriteria
    ).subscribe({
      next: (response: any) => {
        this.isLoading    = false;
        this.documentName = response.documentName;
        this.fullText     = response.fullText;
        this.totalPages   = response.totalPages;    // ✅ like response[0].TotalPages
        this.totalRecords = response.totalCount;    // ✅ like response[0].TotalRecords
        this.notFound     = response.pages.length === 0;
        this.pages        = response.pages;

        this.pageListSubject.next(response.pages);  // ✅ like rolesListSubject.next()

        if (!this.notFound) {
          this.autoSelectVoice(response.fullText);
          setTimeout(() => this.speakText(response.fullText), 300);
        }
        this.cd.detectChanges();
      },
      error: () => { this.isLoading = false; this.cd.detectChanges(); }
    });
  }

  // ✅ Exactly like onSearch()
  onSearch(target: EventTarget | null): void {
    if (target instanceof HTMLInputElement) {
      this.userQuestion = target.value;
      this.currentPage  = 1;
      this.AgentGET();
    }
  }

  // ✅ Exactly like onPageChange()
  onPageChange(page: number) {
    this.currentPage = page;
    this.AgentGET();
    this.cd.detectChanges();
  }

  // ✅ Exactly like onPageSizeChange()
  onPageSizeChange(newSize: number) {
    this.itemsPerPage = newSize;
    this.AgentGET();
    this.cd.detectChanges();
  }

  // ✅ Search button / Enter key / Voice
  askQuestion() {
    if (!this.userQuestion.trim()) return;
    this.currentPage = 1;
    this.AgentGET();
  }

  // ✅ Summary
  summarizeDocument() {
    if (!this.documentName) return;
    this.isSummarizing = true;
    this.summary       = '';
    this.showSummary   = false;
    this.cd.detectChanges();

    this.service.summarizeDocument(this.documentName).subscribe({
      next: (res: any) => {
        this.summary       = res.summary;
        this.isSummarizing = false;
        this.showSummary   = true;
        this.cd.detectChanges();
      },
      error: () => { this.isSummarizing = false; this.cd.detectChanges(); }
    });
  }

  // ✅ Voice recognition
  setupSpeechRecognition() {
    const SR = (window as any).SpeechRecognition
            || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    this.recognition                = new SR();
    this.recognition.lang           = 'en-US';
    this.recognition.continuous     = false;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }

      this.userQuestion = finalText || interimText;
      this.cd.detectChanges();

      if (finalText) {
        this.isListening = false;
        this.askQuestion();
      }
    };

    this.recognition.onend   = () => { this.isListening = false; this.cd.detectChanges(); };
    this.recognition.onerror = () => { this.isListening = false; this.cd.detectChanges(); };
  }

  startListening() {
    this.userQuestion = '';
    this.notFound     = false;
    this.isListening  = true;
    this.recognition.start();
    this.cd.detectChanges();
  }

  stopListening() {
    this.recognition.stop();
    this.isListening = false;
    this.cd.detectChanges();
  }

  // ✅ Voice output
  loadVoices() {
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.availableVoices = voices;
        this.selectedVoice   = this.availableVoices.find(
          v => v.name === 'Microsoft Heera - English (India)'
        ) || this.findBestVoice('en-IN');
        this.cd.detectChanges();
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = () => load();
    setTimeout(() => { if (this.availableVoices.length === 0) load(); }, 1000);
  }

  findBestVoice(langCode: string): SpeechSynthesisVoice | null {
    let voice = this.availableVoices.find(v => v.lang === langCode);
    if (!voice) {
      const base = langCode.split('-')[0];
      voice = this.availableVoices.find(v => v.lang.startsWith(base));
    }
    if (!voice) voice = this.availableVoices.find(v => v.lang.startsWith('en'));
    return voice || this.availableVoices[0];
  }

  detectLanguage(text: string): { lang: string; label: string } {
    for (const entry of this.langPatterns) {
      if (entry.lang === 'en-IN') continue;
      if (entry.pattern.test(text)) return { lang: entry.lang, label: entry.label };
    }
    return { lang: 'en-IN', label: 'Indian English' };
  }

  autoSelectVoice(text: string) {
    const detected     = this.detectLanguage(text);
    this.detectedLang  = detected.label;
    this.selectedVoice = this.findBestVoice(detected.lang);
    this.cd.detectChanges();
  }

  onVoiceChange(event: any) {
    this.selectedVoice = this.availableVoices.find(v => v.name === event.target.value) || null;
  }

  speakText(text: string) {
    window.speechSynthesis.cancel();
    this.autoSelectVoice(text);
    const utterance    = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) utterance.voice = this.selectedVoice;
    utterance.lang     = this.selectedVoice?.lang || 'en-IN';
    utterance.rate     = this.speechRate;
    utterance.pitch    = this.speechPitch;
    utterance.volume   = this.speechVolume;
    this.isSpeaking    = true;
    utterance.onend    = () => { this.isSpeaking = false; this.cd.detectChanges(); };
    window.speechSynthesis.speak(utterance);
    this.cd.detectChanges();
  }

  stopSpeaking() {
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
    this.cd.detectChanges();
  }

  previewVoice() {
    const name = this.selectedVoice?.name?.toLowerCase() || '';
    const lang = this.selectedVoice?.lang || 'en-IN';
    let text   = 'Hello, this is a voice preview.';
    if (lang.startsWith('hi'))        text = 'नमस्ते, यह एक आवाज़ पूर्वावलोकन है।';
    else if (name.includes('heera')) text = 'Hello, I am Heera. Indian English female voice.';
    else if (name.includes('ravi'))  text = 'Hello, I am Ravi. Indian English male voice.';
    this.speakText(text);
  }

  isMaleVoice(voice: SpeechSynthesisVoice): boolean {
    return this.maleVoiceKeywords.some(k => voice.name.toLowerCase().includes(k));
  }

  isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
    return this.femaleVoiceKeywords.some(k => voice.name.toLowerCase().includes(k));
  }

  get indianMaleVoices()   { return this.availableVoices.filter(v => v.lang === 'en-IN' && this.isMaleVoice(v)); }
  get indianFemaleVoices() { return this.availableVoices.filter(v => v.lang === 'en-IN' && this.isFemaleVoice(v)); }
  get indianEnglishVoices(){ return this.availableVoices.filter(v => v.lang === 'en-IN'); }
  get hindiVoices()        { return this.availableVoices.filter(v => v.lang.startsWith('hi')); }
  get otherVoices() {
    const indian = ['en-IN', 'hi', 'bn', 'ta', 'te', 'kn', 'ml', 'gu', 'pa'];
    return this.availableVoices.filter(v => !indian.some(l => v.lang.startsWith(l)));
  }

  min(a: number, b: number): number { return Math.min(a, b); }
}