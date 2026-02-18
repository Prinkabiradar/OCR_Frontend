import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private PayrollMonthData = new BehaviorSubject<any>({});
  private monthIdSubject = new BehaviorSubject<number | null>(null);
  currentData = this.PayrollMonthData.asObservable();

  currentMonthId = this.monthIdSubject.asObservable();

  constructor() {}

  updateData(data: string) {
    console.log("[MonthMasterGetById]",data);
    this.PayrollMonthData.next(data); // Securely update data
  }

  updateMonthId(monthId: number) {
    this.monthIdSubject.next(monthId); // Securely update monthId
    console.log('Month ID updated to : ', monthId);
  }
}
