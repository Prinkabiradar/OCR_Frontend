import { ChangeDetectorRef, Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { DataService } from '../DataService';
import { ServiceService } from '../settings.service';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import * as Highcharts from 'highcharts';

interface MonthWiseSummary {
  MonthName: string;
  InvoiceTotal: number;
  PurchaseTotal: number;
}

interface DashboardData {
  GoodsCount: number;
  ServicesCount: number;
  VendorCount: number;
  CustomerCount: number;
  VendorCustomerCount: number;
  MonthWiseSummary: string; // JSON string that needs to be parsed
}

@Component({
  selector: 'app-admindashboard',
  templateUrl: './admindashboard.component.html',
  styleUrl: './admindashboard.component.scss'
})
export class AdmindashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;
  @ViewChild('pieChartContainer', { static: false }) pieChartContainer!: ElementRef;
  
  currentMonth: string = '';
  todayDate: string = '';
  isLoading: boolean = false;
  
  // Dashboard data properties
  goodsCount: number = 0;
  servicesCount: number = 0;
  vendorCount: number = 0;
  customerCount: number = 0;
  vendorCustomerCount: number = 0;
  
  // Chart data
  monthWiseData: MonthWiseSummary[] = [];
  barChart: Highcharts.Chart | null = null;
  pieChart: Highcharts.Chart | null = null;
  
  productList$: Observable<any[]>;
  private productListSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  isLoading$: Observable<boolean>;
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private _service: ServiceService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private dataService: DataService
  ) {
    this.productList$ = this.productListSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  ngOnInit(): void {
    this.getCurrentMonthAndDate();
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Charts will be created after data is loaded
  }

  getCurrentMonthAndDate() {
    const now = new Date();
    this.currentMonth = now.toLocaleString('en-US', { month: 'long' });
    this.todayDate = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }); 
  }

  loadDashboardData() {
    this.isLoading = true;
    this.isLoadingSubject.next(true);
    
    const LocationId = 0;
    this._service.dashboardDataGet(LocationId).subscribe({
      next: (response: DashboardData[]) => {
        if (response && response.length > 0) {
          const data = response[0];
          this.goodsCount = data.GoodsCount;
          this.servicesCount = data.ServicesCount;
          this.vendorCount = data.VendorCount;
          this.customerCount = data.CustomerCount;
          this.vendorCustomerCount = data.VendorCustomerCount;
          
          // Parse MonthWiseSummary JSON string
          if (data.MonthWiseSummary) {
            try {
              this.monthWiseData = JSON.parse(data.MonthWiseSummary);
              // Create charts after data is loaded
              setTimeout(() => {
                this.createBarChart();
                this.createPieChart();
              }, 100);
            } catch (error) {
              console.error('Error parsing MonthWiseSummary:', error);
              this.monthWiseData = [];
            }
          }
        }
        this.productListSubject.next(response);
        this.isLoading = false;
        this.isLoadingSubject.next(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
        this.isLoadingSubject.next(false);
        this.cdr.detectChanges();
      }
    });
  }

  createBarChart(): void {
    if (!this.chartContainer || !this.monthWiseData.length) {
      return;
    }

    // Destroy existing chart
    if (this.barChart) {
      this.barChart.destroy();
    }

    const categories = this.monthWiseData.map(item => item.MonthName);
    const invoiceData = this.monthWiseData.map(item => item.InvoiceTotal);
    const purchaseData = this.monthWiseData.map(item => item.PurchaseTotal);

    const options: Highcharts.Options = {
      chart: {
        type: 'column',
        backgroundColor: 'transparent'
      },
      title: {
        text: 'Monthly Invoice vs Purchase Summary',
        style: {
          color: '#2d3748',
          fontWeight: '600',
          fontSize: '18px'
        }
      },
      subtitle: {
        text: 'Compare invoice and purchase totals by month',
        style: {
          color: '#718096',
          fontSize: '14px'
        }
      },
      xAxis: {
        categories: categories,
        crosshair: true,
        labels: {
          style: {
            color: '#4a5568'
          }
        }
      },
      yAxis: {
        min: 0,
        title: {
          text: 'Amount (₹)',
          style: {
            color: '#4a5568'
          }
        },
        labels: {
          formatter: function() {
            return '₹' + Highcharts.numberFormat(this.value as number, 0, '.', ',');
          },
          style: {
            color: '#4a5568'
          }
        }
      },
      tooltip: {
        headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
        pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                    '<td style="padding:0"><b>₹{point.y:,.0f}</b></td></tr>',
        footerFormat: '</table>',
        shared: true,
        useHTML: true
      },
      plotOptions: {
        column: {
          pointPadding: 0.2,
          borderWidth: 0,
          borderRadius: 5
        }
      },
      series: [{
        type: 'column',
        name: 'Invoice Total',
        data: invoiceData,
        color: '#4facfe'
      }, {
        type: 'column',
        name: 'Purchase Total',
        data: purchaseData,
        color: '#f093fb'
      }],
      credits: {
        enabled: false
      },
      legend: {
        itemStyle: {
          color: '#4a5568'
        }
      }
    };

    this.barChart = Highcharts.chart(this.chartContainer.nativeElement, options);
  }

  createPieChart(): void {
    if (!this.pieChartContainer || !this.monthWiseData.length) {
      return;
    }

    // Destroy existing chart
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    // Calculate totals for pie chart
    const totalInvoice = this.monthWiseData.reduce((sum, item) => sum + item.InvoiceTotal, 0);
    const totalPurchase = this.monthWiseData.reduce((sum, item) => sum + item.PurchaseTotal, 0);

    const options: Highcharts.Options = {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent'
      },
      title: {
        text: 'Financial Distribution',
        style: {
          color: '#2d3748',
          fontWeight: '600',
          fontSize: '18px'
        }
      },
      subtitle: {
        text: 'Overall invoice vs purchase distribution',
        style: {
          color: '#718096',
          fontSize: '14px'
        }
      },
      tooltip: {
        pointFormat: '<b>₹{point.y:,.0f}</b> ({point.percentage:.1f}%)'
      },
      accessibility: {
        point: {
          valueSuffix: '%'
        }
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
            style: {
              color: '#4a5568'
            }
          },
          showInLegend: true
        }
      },
      series: [{
        type: 'pie',
        name: 'Amount',
        data: [
          {
            name: 'Invoice Total',
            y: totalInvoice,
            color: '#4facfe'
          },
          {
            name: 'Purchase Total',
            y: totalPurchase,
            color: '#f093fb'
          }
        ]
      }],
      credits: {
        enabled: false
      },
      legend: {
        itemStyle: {
          color: '#4a5568'
        }
      }
    };

    this.pieChart = Highcharts.chart(this.pieChartContainer.nativeElement, options);
  }

  // Method to handle window resize
  onWindowResize(): void {
    if (this.barChart) {
      this.barChart.reflow();
    }
    if (this.pieChart) {
      this.pieChart.reflow();
    }
  }

  // Legacy method - keeping for backward compatibility
  ProductGET() {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    if (this.barChart) {
      this.barChart.destroy();
    }
    if (this.pieChart) {
      this.pieChart.destroy();
    }
  }
}