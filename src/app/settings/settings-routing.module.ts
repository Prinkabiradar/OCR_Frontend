import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
 import { WorkLocationAddComponent } from './WorkLocation/work-location-add/work-location-add.component';
 import { RolesAddComponent } from './roles/roles-add/roles-add.component';
 import { WorkLocationDataComponent } from './WorkLocation/work-location-data/work-location-data.component';
 import { MasterTableAddComponent } from './MasterTable/master-table-add/master-table-add.component';
 import { MastertableDataComponent } from './MasterTable/mastertable-data/mastertable-data.component';
 
import { RolesDataComponent } from './roles/roles-data/roles-data.component';
 import { AdmindashboardComponent } from './admindashboard/admindashboard.component';


import { SubmastertableDataComponent } from './submastertable/submastertable-data/submastertable-data.component';
import { AddImageComponent } from './uploads/add-image/add-image.component';
import { AddDocumentTypeComponent } from './documentType/add-document-type/add-document-type.component';
import { AddDocumentComponent } from './document/add-document/add-document.component';
import { OcrDataComponent } from './uploads/ocr-data/ocr-data.component';
import { AgentAddComponent } from './Agent/agent-add/agent-add.component';
import { DataDocumentComponent } from './document/data-document/data-document.component';
import { DataDocumentTypeComponent } from './documentType/data-document-type/data-document-type.component';
import { PdfViewerModalComponent } from './PDF/pdf-viewer-modal/pdf-viewer-modal.component';
import { DataSummaryComponent } from './Agent/data-summary/data-summary.component';
import { SummaryAddComponent } from './Agent/summary-add/summary-add.component';
import { SuggestionListComponent } from './suggestion/suggestion-list/suggestion-list.component';



 

const routes: Routes = [
  // Parent route for statutory components
  {
    path: 'statutorycomponent-add',
    component: MasterTableAddComponent,
    children: [
      
      
      { path: '', redirectTo: 'epf-data', pathMatch: 'full' },
    ],
  },
  {
    path: 'mastertable-add',
    component: MasterTableAddComponent,
  },
 
  {
    path: 'mastertable-data',
    component: MastertableDataComponent,
  },
  {
    path: 'worklocation-add',
    component: WorkLocationAddComponent,
  },
  {
    path: 'roles-add',
    component: RolesAddComponent,
  },
  
  {
    path: 'worklocation-data',
    component: WorkLocationDataComponent,
  },
  {
    path: 'workdurationpolicy-add',
    component: WorkLocationAddComponent,
  },


   {
    path: 'Submastertable-data',
    component: SubmastertableDataComponent,
  },

  {
    path: 'roles-data',
    component: RolesDataComponent,
  },
  {
    path: 'admindashboard',
    component: AdmindashboardComponent,
  },
  {
    path: 'add-image',
    component: AddImageComponent,
  },
  {
    path: 'add-documentType',
    component: AddDocumentTypeComponent,
  },
  {
    path: 'add-document',
    component: AddDocumentComponent,
  },
  {
    path: 'ocr-data',
    component: OcrDataComponent,
  },
  {
    path: 'agent-add',
    component: AgentAddComponent,
  },
  {
    path: 'data-document',
    component: DataDocumentComponent,
  },

  {
    path: 'data-documentType',
    component: DataDocumentTypeComponent,
  },
  {
    path: 'pdf-viewer',
    component: PdfViewerModalComponent,
  },
  {
    path: 'summary-add',
    component: SummaryAddComponent,
  },

  {
    path: 'data-summary',
    component: DataSummaryComponent,
  },
  {
    path: 'suggestion-list',
    component: SuggestionListComponent,
  },

  { path: '', redirectTo: 'add-order', pathMatch: 'full' },
  { path: '**', redirectTo: 'add-order', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
