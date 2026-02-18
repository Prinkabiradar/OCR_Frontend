import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from 'src/app/modules/auth/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class TransactionsService {
  public isLoading = new BehaviorSubject(false);

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  constructor(private http: HttpClient, private authService: AuthService) {}
  // need
  dropdownAll(
    searchTerm: string,
    page: string,
    type: string,
    parentId: string
  ): Observable<any[]> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);
    if (!lsValue) {
      return new Observable<any[]>((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    const params = new HttpParams()
      .set('searchTerm', searchTerm.toString())
      .set('page', page.toString())
      .set('type', type.toString())
      .set('parentId', parentId.toString());

    return this.http.get<any[]>(
      environment.BaseUrl + 'api/Utility/allDropdown',
      {
        headers: headers,
        params: params,
      }
    );
  }
 
  linkSettingsGET(
    employeeId: number,

    type: string
  ): Observable<any[]> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return new Observable<any[]>((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    const params = new HttpParams()
      .set('EmployeeId', employeeId)
      .set('Type', type);

    return this.http.get<any[]>(
      environment.BaseUrl + 'api/ITDeclarationEmployee/LinkSettingsCheck',
      {
        headers: headers,
        params: params,
      }
    );
  }
 
// need
  GetFinancialYearDate(
    startIndex: number,
    pageSize: number,
    searchBy: string,
    searchCriteria: string
  ): Observable<any[]> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return new Observable<any[]>((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    const params = new HttpParams()
      .set('startIndex', startIndex.toString())
      .set('pageSize', pageSize.toString())
      .set('searchBy', searchBy)
      .set('searchCriteria', searchCriteria);

    return this.http.get<any[]>(
      environment.BaseUrl + 'api/ActualITDeclaration/GetFinancialYearDate',
      {
        headers: headers,
        params: params,
      }
    );
  }
  
  linkSettingAdd(links: any): Observable<any[]> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);
    if (!lsValue) {
      return new Observable<any[]>((observer) => {
        observer.next([]);
        observer.complete();
      });
    }
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    return this.http.post<any[]>(
      environment.BaseUrl + 'api/LinkSetting/LinkSettingInsertUpdate',
      links,
      { headers }
    );
  }
  // need
  LinkSettingGET(
    startIndex: number,
    pageSize: number,
    searchBy: string,
    searchCriteria: string
  ): Observable<any[]> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return new Observable<any[]>((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    const params = new HttpParams()
      .set('startIndex', startIndex.toString())
      .set('pageSize', pageSize.toString())
      .set('searchBy', searchBy)
      .set('searchCriteria', searchCriteria);

    return this.http.get<any[]>(environment.BaseUrl + 'api/LinkSetting/LinkSettingGET', {
      headers: headers,
      params: params,
    });
  }

 

 
  
}


