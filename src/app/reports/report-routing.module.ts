import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
 import { ReportMenuComponent } from './report-menu/report-menu.component';
 

const routes: Routes = [
  {
    path: 'parent',
    component: ReportMenuComponent,
    children:[
    
  
    ]
  },

   
  {
    path: 'reportmenu-rpt',
    component: ReportMenuComponent,
  },


 
  { path: '', redirectTo: 'add-order', pathMatch: 'full' },
  { path: '**', redirectTo: 'add-order', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportRoutingModule { }
