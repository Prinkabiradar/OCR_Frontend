import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaveApproveComponent } from './leave-approve/leave-approve.component';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';



@NgModule({
  declarations: [
    // LeaveApproveComponent
  ],
  imports: [
    CommonModule,FormsModule 
     
  ]
})
export class ModalModule { }
