import { Component, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-suggestion-modal',
  templateUrl: './suggestion-modal.component.html',
})
export class SuggestionModalComponent {
  @ViewChild('content') content: any;

  documentId: number = 0;
  documentName: string = '';

  suggestionText: string = '';

  constructor(private modalService: NgbModal) {}

  open() {
    this.modalService.open(this.content, { size: 'lg' });
  }

  saveSuggestion() {
    console.log('Suggestion:', this.suggestionText);
    // 👉 call API here later

    this.suggestionText = '';
  }
}