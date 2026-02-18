import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-pagination-data',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
})
export class PaginationDataComponent {
  @Input() currentPage: number;
  @Input() totalPages: number;
  @Input() totalRecords: number;
  @Input() pageRange: number = 5; // Number of pages to display before and after the current page
  @Input() pageSize: number = 10; // Add this input property
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  getPages(): number[] {
    const pages = [];
    const currentPage = this.currentPage;

    const batchNumber = Math.ceil(currentPage / this.pageRange);

    let start = (batchNumber - 1) * this.pageRange + 1;
    let end = Math.min(batchNumber * this.pageRange, this.totalPages);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  prevBatch(event: Event) {
    event.preventDefault();
    const currentPage = this.currentPage;
    const currentBatch = Math.ceil(currentPage / this.pageRange);

    if (currentBatch > 1) {
      // Calculate the start of the previous batch
      const newStart = (currentBatch - 2) * this.pageRange + 1;
      this.pageChange.emit(newStart);
    }
  }

  nextBatch(event: Event) {
    event.preventDefault();
    const currentPage = this.currentPage;
    const currentBatch = Math.ceil(currentPage / this.pageRange);
    const lastBatch = Math.ceil(this.totalPages / this.pageRange);

    if (currentBatch < lastBatch) {
      // Calculate the start of the next batch
      const newStart = currentBatch * this.pageRange + 1;
      this.pageChange.emit(newStart);
    }
  }

  prevPage(event: Event) {
    event.preventDefault();
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  nextPage(event: Event) {
    event.preventDefault();
    if (this.currentPage < this.totalPages) {
      const nextPage = this.currentPage + 1;
      const currentBatch = Math.ceil(this.currentPage / this.pageRange);
      const nextBatch = Math.ceil(nextPage / this.pageRange);
      if (currentBatch !== nextBatch) {
        const newStart = (nextBatch - 1) * this.pageRange + 1;
        this.pageChange.emit(newStart);
      } else {
        this.pageChange.emit(nextPage);
      }
    }
  }

  goToPage(pageNumber: number, event: Event) {
    event.preventDefault();
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.pageChange.emit(pageNumber);
    }
  }

  onPageSizeChange(event: Event) {
    const newSize = +(event.target as HTMLInputElement).value; // Parse the selected value to a number
    this.pageSize = newSize;
    this.pageSizeChange.emit(newSize);

    // When the page size changes, you may want to reset the current page to 1:
    this.pageChange.emit(1);
  }
  Math_min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
