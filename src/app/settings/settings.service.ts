import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpHeaders,
  HttpEvent,
  HttpEventType,
} from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of, Subject, throwError } from 'rxjs';
import { catchError, delay, filter, map } from 'rxjs/operators';
import { AuthService } from 'src/app/modules/auth/services/auth.service';

import { BehaviorSubject } from 'rxjs';
import { Dropdown } from 'bootstrap';

@Injectable({
  providedIn: 'root',
})
export class ServiceService {
  baseUrl: any;

  apiUrl: any;

  getEmployeeCTC: any;

  public isLoading = new BehaviorSubject(false);
  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}
  private dropdownDataSubject = new BehaviorSubject<
    Array<{ id: string; text: string }>
  >([]);
  dropdownData$ = this.dropdownDataSubject.asObservable();
 

  workLocationAdd(workLocation: any): Observable<any[]> {
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
      environment.BaseUrl + 'api/WorkLocation/WorkLocationInsertUpdate',
      workLocation,
      { headers },
    );
  }

  submasterTableAdd(submasterTableAddComponent: any): Observable<any[]> {
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
      environment.BaseUrl + 'api/SubMasterTable/SubMasterTableInsert',
      submasterTableAddComponent,
      { headers },
    );
  }

  masterTableAdd(masterTableAddComponent: any): Observable<any[]> {
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
      environment.BaseUrl + 'api/MasterTable/MasterTableInsert',
      masterTableAddComponent,
      { headers },
    );
  }

  rolesAdd(roles: any): Observable<any[]> {
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
      environment.BaseUrl + 'api/Roles/RolesInsertUpdate',
      roles,
      { headers },
    );
  }

  WorkLocationGet(
    startIndex: number,
    pageSize: number,
    searchBy: string,
    searchCriteria: string,
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
      environment.BaseUrl + 'api/WorkLocation/WorkLocationGET',
      {
        headers: headers,
        params: params,
      },
    );
  }

  dropdownAll(
    searchTerm: string,
    page: string,
    type: string,
    parentId: string,
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
      },
    );
  }
  inactivateRecordForAll(
    typeId: number,
    primaryId: number,
    userId: number,
  ): Observable<any> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return new Observable<any>((observer) => {
        observer.next({ message: 'User not authenticated' });
        observer.complete();
      });
    }

    const authToken = JSON.parse(lsValue).authToken;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    });

    return this.http.post<any>(
      `${environment.BaseUrl}api/Utility/InactivateRecordForAll?typeId=${typeId}&primaryId=${primaryId}&userId=${userId}`,
      {}, // Empty body
      { headers: headers },
    );
  }

  DeleteForAll(
    typeId: number,
    primaryId: number,
    userId: number,
  ): Observable<any> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return new Observable<any>((observer) => {
        observer.next({ message: 'User not authenticated' });
        observer.complete();
      });
    }

    const authToken = JSON.parse(lsValue).authToken;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    });

    return this.http.post<any>(
      `${environment.BaseUrl}api/Utility/DeleteForAll?typeId=${typeId}&primaryId=${primaryId}&userId=${userId}`,
      {}, // Empty body
      { headers: headers },
    );
  }

  setDropdownData(data: Array<{ id: string; text: string }>) {
    this.dropdownDataSubject.next(data);
  }

  //RolesGET
  RolesGET(
    startIndex: number,
    pageSize: number,
    searchBy: string,
    searchCriteria: string,
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

    return this.http.get<any[]>(environment.BaseUrl + 'api/Roles/RolesGET', {
      headers: headers,
      params: params,
    });
  }

  masterTableGet(
    startIndex: number,
    pageSize: number,
    searchBy: string,
    searchCriteria: string,
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
      environment.BaseUrl + 'api/MasterTable/MasterTableGet',
      {
        headers: headers,
        params: params,
      },
    );
  }

  subMasterTableGet(
    startIndex: number,
    pageSize: number,
    searchBy: string,
    searchCriteria: string,
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
      environment.BaseUrl + 'api/SubMasterTable/SubMasterTableGet',
      {
        headers: headers,
        params: params,
      },
    );
  }

  WorkLocationInActive(dataRequest: any): Observable<any[]> {
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
      environment.BaseUrl + 'api/Designation/WorkLocationInActive',
      dataRequest,
      { headers },
    );
  }

  AdminDashboardDataGet(
    LocationId: number,
    WorkDate: string,
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
      .set('LocationId', LocationId.toString())
      .set('WorkDate', WorkDate.toString());

    return this.http.get<any[]>(
      environment.BaseUrl + 'api/EmployeeChart/DashboardDataGet',
      {
        headers: headers,
        params: params,
      },
    );
  }

  dashboardDataGet(LocationId: number): Observable<any[]> {
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

    const params = new HttpParams().set('LocationId', LocationId.toString());

    return this.http.get<any[]>(
      environment.BaseUrl + 'api/Dashboard/DashboardDataGet',
      {
        headers: headers,
        params: params,
      },
    );
  }
  uploadOcrFiles(formData: FormData) {

  const lsValue = localStorage.getItem(this.authLocalStorageToken);

  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue!).authToken
  });

  return this.http.post<any[]>(
    environment.BaseUrl + 'api/Ocr/image',
    formData,
    { headers }
  );
}

saveDocumentType(formData: FormData) {

  const lsValue = localStorage.getItem(this.authLocalStorageToken);

  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue!).authToken
  });

  return this.http.post<any[]>(
    environment.BaseUrl + 'api/DocumentType/InsertUpdateDocumentType',
    formData,
    { headers }
  );
}
saveDocumentTypeJson(model: any) {

  const lsValue = localStorage.getItem(this.authLocalStorageToken);

  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue!).authToken,
    'Content-Type': 'application/json'
  });

  return this.http.post<any>(
    environment.BaseUrl + 'api/DocumentType/InsertUpdateDocumentType',
    model,
    { headers }
  );
}
saveDocument(model: any) {

  const lsValue = localStorage.getItem(this.authLocalStorageToken);

  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue!).authToken
  });

  return this.http.post<any>(
    environment.BaseUrl + 'api/Document/InsertUpdateDocument',
    model,
    { headers }
  );
}
saveDocumentPage(model: any) {

  const lsValue = localStorage.getItem(this.authLocalStorageToken);

  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue!).authToken
  });

  return this.http.post<any>(
    environment.BaseUrl + 'api/DocumentPage/InsertUpdateDocumentPage',
    model,
    { headers }
  );
}
}
