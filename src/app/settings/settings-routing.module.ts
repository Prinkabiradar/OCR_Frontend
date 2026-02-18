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

  { path: '', redirectTo: 'add-order', pathMatch: 'full' },
  { path: '**', redirectTo: 'add-order', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
