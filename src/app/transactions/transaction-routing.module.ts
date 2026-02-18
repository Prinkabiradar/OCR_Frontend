import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
 import { LinksettingAddComponent } from './linksetting/linksetting-add/linksetting-add.component';
import { LinksettingDataComponent } from './linksetting/linksetting-data/linksetting-data.component';
 
const routes: Routes = [
  {
    path: 'parent',
    component: LinksettingDataComponent,
    children: [
      // {
      //   path: 'actual-decleration',
      //   component: ActualDeclerationComponent,
      // },
    ],
  },

 
  
 
  
  {
    path: 'linksetting-add',
    component: LinksettingAddComponent,
  },
  {
    path: 'linksetting-data',
    component: LinksettingDataComponent,
  },
  

  

  { path: '', redirectTo: 'add-order', pathMatch: 'full' },
  { path: '**', redirectTo: 'add-order', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TransactionRoutingModule {}
