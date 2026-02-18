import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SharedDataService {
  private gstrateMasterListSubject = new BehaviorSubject<any>(null);
gstrateMaster$ = this.gstrateMasterListSubject.asObservable();

  
  private departmentSubject = new BehaviorSubject<any>(null);
  department$ = this.departmentSubject.asObservable();

  //For Designation
  private designationSubject = new BehaviorSubject<any>(null);
  designation$ = this.designationSubject.asObservable();
  customerDataSubject: any;
  vendorDataSubject: any;
  GstRateMaster$: any;
  //For WorkLocation
  private workLocationSubject = new BehaviorSubject<any>(null);
  workLocation$ = this.workLocationSubject.asObservable();
  

  //Dispatch Plan for WorkLocation
  setworkLocationData(workLocationData: any) {
    this.workLocationSubject.next(workLocationData);
  }
  clearworkLocationData() {
    this.workLocationSubject.next(null);
  }
  
  // Role related
  private roleSubject = new BehaviorSubject<any>(null);
  role$ = this.roleSubject.asObservable();

  setRoleData(roleData: any) {
    this.roleSubject.next(roleData);
  }

  clearRoleData() {
    this.roleSubject.next(null);
  }

  //For LinkSetting
  private LinkSettingSubject = new BehaviorSubject<any>(null);
  LinkSetting$ = this.LinkSettingSubject.asObservable();

  setLinkSettingData(roleData: any) {
    this.LinkSettingSubject.next(roleData);
  }

  clearLinkSettingData() {
    this.LinkSettingSubject.next(null);
  }
  
  //Mastertable
  private mastertableSubject = new BehaviorSubject<any>(null);
  mastertable$ = this.mastertableSubject.asObservable();

  setmastertableData(mastertableData: any) {
    this.mastertableSubject.next(mastertableData);
  }

  clearmastertableData() {
    this.mastertableSubject.next(null);
  }

  //SubMasterTable
  private submastertableSubject = new BehaviorSubject<any>(null);
  submastertable$ = this.submastertableSubject.asObservable();

  setsubmastertableData(submastertableData: any) {
    this.submastertableSubject.next(submastertableData);
  }

  clearsubmastertableData() {
    this.submastertableSubject.next(null);
  }

     
}
