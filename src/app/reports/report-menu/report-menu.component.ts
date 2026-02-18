import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReportService } from '../report.service';

@Component({
  selector: 'app-report-menu',
  templateUrl: './report-menu.component.html',
  styleUrls: ['./report-menu.component.scss']
})
export class ReportMenuComponent implements OnInit {
  menu: any[] = [];

  constructor(
    private _service: ReportService,
    private cdRef: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this._service.SideMenuGetReports(62).subscribe({
      next: (data: any[]) => {
        console.log("Data", data);
        this.menu = data;
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching menu:', err);
        this.menu = [];
      }
    });
  }

  // Navigate to the selected report
  navigateToReport(route: string): void {
    if (route) {
      this.router.navigate([route]);
    }
  }

  // Get Payroll Overview reports
  getPayrollReports(): any[] {
    return this.menu.filter(item => 
      item.Title.toLowerCase().includes('payroll') ||
      item.Title.toLowerCase().includes('overtime') ||
      item.Title.toLowerCase().includes('additional pay') ||
      item.Title.toLowerCase().includes('components')
    );
  }

  // Get Employee Reports
  getEmployeeReports(): any[] {
    return this.menu.filter(item => 
      item.Title.toLowerCase().includes('employee') ||
      item.Title.toLowerCase().includes('resigned') 
      
      
    );
  }

  // Get Statutory Reports
  getStatutoryReports(): any[] {
     return this.menu.filter(item => 
      item.Title.toLowerCase().includes('leave') ||
      item.Title.toLowerCase().includes('absent') ||
      item.Title.toLowerCase().includes('holiday') ||
      item.Title.toLowerCase().includes('attendance')
     );
  }

  // Get Deduction Reports
  getDeductionReports(): any[] {
    return this.menu.filter(item => 
      item.Title.toLowerCase().includes('tax deduction') ||
      item.Title.toLowerCase().includes('monthaly tax') ||
      item.Title.toLowerCase().includes('monthly tax') ||
      item.Title.toLowerCase().includes('form 24q') ||
      item.Title.toLowerCase().includes('investment')
    );
  }

  // Get Tax Reports
  // getTaxReports(): any[] {
  //   return this.menu.filter(item => 
  //     item.Title.toLowerCase().includes('monthaly tax') ||
  //     item.Title.toLowerCase().includes('monthly tax') ||
  //     item.Title.toLowerCase().includes('form 24q')
  //   );
  // }

  // Get Investment Reports
  // getInvestmentReports(): any[] {
  //   return this.menu.filter(item => 
  //     item.Title.toLowerCase().includes('investment')
  //   );
  // }

  // Get all categorized report IDs
  private getCategorizedReportIds(): number[] {
    const categorized = [
      ...this.getPayrollReports(),
      ...this.getEmployeeReports(),
      ...this.getStatutoryReports(),
      ...this.getDeductionReports(),
    //  ...this.getTaxReports(),
     // ...this.getInvestmentReports()
    ];
    return categorized.map(item => item.MenuId);
  }

  // Get uncategorized reports (Others)
  getOtherReports(): any[] {
    const categorizedIds = this.getCategorizedReportIds();
    return this.menu.filter(item => !categorizedIds.includes(item.MenuId));
  }

  // Check if there are any other reports to show
  hasOtherReports(): boolean {
    return this.getOtherReports().length > 0;
  }
}