import { ChangeDetectorRef, Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { DataService } from '../DataService';
import { ServiceService } from '../settings.service';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import * as Highcharts from 'highcharts';

 

@Component({
  selector: 'app-admindashboard',
  templateUrl: './admindashboard.component.html',
  styleUrl: './admindashboard.component.scss'
})
export class AdmindashboardComponent implements OnInit, OnDestroy {
  currentTime = '';
  currentDate = '';
  private clockInterval: any;
 
  // ✅ Floating lotus particles
  particles = Array.from({ length: 10 }, (_, i) => ({
    left:     `${Math.random() * 100}%`,
    delay:    `${Math.random() * 8}s`,
    duration: `${8 + Math.random() * 6}s`
  }));
 
  // ✅ Recent Documents
  recentDocs = [
    { icon: '📿', name: 'Shri Krishna Aarti',        type: 'Aarti & Prayer', pages: 3,  date: '12 Mar 2026', lang: 'Hindi',   status: 'Scanned',    statusClass: 'status-done'    },
    { icon: '📖', name: 'Bhagavad Gita Chapter 2',   type: 'Scripture',      pages: 12, date: '11 Mar 2026', lang: 'Sanskrit', status: 'Scanned',    statusClass: 'status-done'    },
    { icon: '📜', name: 'Mandir Trust Letter 2026',   type: 'Letter',         pages: 2,  date: '10 Mar 2026', lang: 'Marathi',  status: 'Processing', statusClass: 'status-pending' },
    { icon: '📋', name: 'Donation Register Jan 2026', type: 'Record',         pages: 8,  date: '09 Mar 2026', lang: 'Hindi',   status: 'Scanned',    statusClass: 'status-done'    },
    { icon: '📿', name: 'Hanuman Chalisa',            type: 'Aarti & Prayer', pages: 4,  date: '08 Mar 2026', lang: 'Hindi',   status: 'Scanned',    statusClass: 'status-done'    },
    { icon: '📖', name: 'Vishnu Sahasranama',         type: 'Scripture',      pages: 6,  date: '07 Mar 2026', lang: 'Telugu',  status: 'Summarized', statusClass: 'status-summary' },
  ];
 
  // ✅ Monthly upload data
  monthlyData = [
    { month: 'Apr', count: 42,  height: '42%',  color: '#ff6600' },
    { month: 'May', count: 58,  height: '58%',  color: '#ff6600' },
    { month: 'Jun', count: 35,  height: '35%',  color: '#ff6600' },
    { month: 'Jul', count: 74,  height: '74%',  color: '#ff6600' },
    { month: 'Aug', count: 91,  height: '91%',  color: '#f9a825' },
    { month: 'Sep', count: 67,  height: '67%',  color: '#ff6600' },
    { month: 'Oct', count: 83,  height: '83%',  color: '#ff6600' },
    { month: 'Nov', count: 110, height: '100%', color: '#2e7d32' },
    { month: 'Dec', count: 95,  height: '95%',  color: '#ff6600' },
    { month: 'Jan', count: 78,  height: '78%',  color: '#ff6600' },
    { month: 'Feb', count: 88,  height: '88%',  color: '#ff6600' },
    { month: 'Mar', count: 64,  height: '64%',  color: '#1565c0' },
  ];
 
  // ✅ Top voice searched documents
  topSearched = [
    { name: 'Shri Krishna Aarti',      count: 412, width: '100%', color: '#ff6600' },
    { name: 'Bhagavad Gita Ch. 1',     count: 338, width: '82%',  color: '#f9a825' },
    { name: 'Hanuman Chalisa',          count: 289, width: '70%',  color: '#2e7d32' },
    { name: 'Vishnu Sahasranama',       count: 201, width: '49%',  color: '#1565c0' },
    { name: 'Mandir Trust Letter 2026', count: 154, width: '37%',  color: '#6a1b9a' },
    { name: 'Donation Register',        count: 98,  width: '24%',  color: '#c62828' },
  ];
 
  constructor(private router: Router) {}
 
  ngOnInit(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }
 
  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
  }
 
  updateClock() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.currentDate = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}