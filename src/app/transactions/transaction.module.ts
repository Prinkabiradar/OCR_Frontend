import { NgModule } from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TransactionRoutingModule } from './transaction-routing.module';
import { MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core'; 
import { NgSelect2Module } from 'ng-select2';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatStepperModule } from '@angular/material/stepper';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogModule } from '@angular/material/dialog';
import {MatTabsModule} from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../_metronic/shared/shared.module';
 import {CdkAccordionModule} from '@angular/cdk/accordion';
 import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { EngagesModule } from '../_metronic/partials';
import { HighchartsChartModule } from 'highcharts-angular';
 import { LinksettingAddComponent } from './linksetting/linksetting-add/linksetting-add.component';
import { LinksettingDataComponent } from './linksetting/linksetting-data/linksetting-data.component';
import { SettingsModule } from '../settings/settings.module';
 
 
 


export const MY_DATE_FORMATS = {
  display: {
    // This is the format for the displayed date
    dateInput: 'dd-MMM-yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM yyyy',
  },
  parse: {
    // This is the format for parsing the input date string
    dateInput: 'dd-MMM-yyyy',
  },
};
@NgModule({
  declarations: [
     
     
    LinksettingAddComponent,
    LinksettingDataComponent,
     
 
 
 
   
  ],
  imports: [
 
    CommonModule,
    TransactionRoutingModule,
    MatDialogModule,
    FormsModule,
    MatNativeDateModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatStepperModule,
    NgSelect2Module,
    SharedModule,
    MatTabsModule,
    MatTooltipModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    RouterModule,
    EngagesModule,
    HighchartsChartModule,
    SettingsModule
   
  ],
   providers: [
      DatePipe,
      { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
      { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { hasBackdrop: false } },
    ],
})
export class TransactionModule { }
