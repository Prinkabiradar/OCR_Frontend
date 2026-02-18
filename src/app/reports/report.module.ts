import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
 import { TransactionRoutingModule } from '../transactions/transaction-routing.module';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { NgSelect2Module } from 'ng-select2';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { SharedModule } from '../_metronic/shared/shared.module';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { CdkAccordionModule } from '@angular/cdk/accordion';
import { ReportRoutingModule } from './report-routing.module';
import { SettingsModule } from '../settings/settings.module'
import { ReportMenuComponent } from './report-menu/report-menu.component';
  
// import { LeaveSummaryRptComponent } from './leave-summary-rpt/leave-summary-rpt.component';
// import { AbsentRptComponent } from './absent-rpt/absent-rpt.component';



@NgModule({
  declarations: [
    
    
  
    ReportMenuComponent,
 
   
 
  ],
  imports: [
    CommonModule,
    ReportRoutingModule,
    MatDialogModule,
    CommonModule,
    FormsModule,
    MatNativeDateModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatFormFieldModule,
    MatStepperModule,
    NgSelect2Module,
    MatDatepickerModule,
    SharedModule,
    MatTabsModule,
    RouterModule,
    CdkAccordionModule,
    SettingsModule
  ],
})
export class ReportModule {}
