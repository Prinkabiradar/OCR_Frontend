import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {

  constructor() {
    // Empty constructor - no dependencies needed for simple image display
  }

  ngOnInit(): void {
    // No initialization needed for simple image display
  }
}