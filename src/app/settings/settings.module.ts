import { NgModule } from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { SettingsRoutingModule } from './settings-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WorkLocationAddComponent } from './WorkLocation/work-location-add/work-location-add.component';
import { RolesAddComponent } from './roles/roles-add/roles-add.component';
import { PaginationDataComponent } from '../components/pagination/pagination.component';
import { MasterTableAddComponent } from './MasterTable/master-table-add/master-table-add.component';
import { SubmastertableAddComponent } from './submastertable/submastertable-add/submastertable-add.component';
import { MastertableDataComponent } from './MasterTable/mastertable-data/mastertable-data.component';
import { SubmastertableDataComponent } from './submastertable/submastertable-data/submastertable-data.component';
import { WorkLocationDataComponent } from './WorkLocation/work-location-data/work-location-data.component';
import { MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { NgSelect2Module } from 'ng-select2';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatStepperModule } from '@angular/material/stepper';
import {
  MAT_DIALOG_DEFAULT_OPTIONS,
  MatDialogModule,
} from '@angular/material/dialog';
import { SharedModule } from '../_metronic/shared/shared.module';
import { RolesDataComponent } from './roles/roles-data/roles-data.component';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

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

import { MatCardModule } from '@angular/material/card';
import { EngagesModule } from '../_metronic/partials/layout/engages/engages.module';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HighchartsChartModule } from 'highcharts-angular';

import { AdmindashboardComponent } from './admindashboard/admindashboard.component';
import { AddImageComponent } from './uploads/add-image/add-image.component';



@NgModule({
  declarations: [

    WorkLocationAddComponent,
    RolesAddComponent,

    PaginationDataComponent,

    WorkLocationDataComponent,




    SubmastertableDataComponent,
    SubmastertableAddComponent,
    MasterTableAddComponent,
    MastertableDataComponent,


    RolesDataComponent,


    SubmastertableDataComponent,


    AdmindashboardComponent,
        AddImageComponent,

  ],

  imports: [
    SettingsRoutingModule,
    MatDialogModule,
    CommonModule,
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
  ],

  exports: [
    PaginationDataComponent,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,

  ],

  providers: [
    DatePipe,
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { hasBackdrop: false } },
  ],
})
export class SettingsModule { }
