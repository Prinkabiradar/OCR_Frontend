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
// ── OCR Job interfaces
export interface OcrJobStatus {
  job_id: string;
  status: 'Queued' | 'Processing' | 'Completed' | 'Failed';
  total_files: number;
  processed_files: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface OcrFileResult {
  result_id: string;
  job_id: string;
  file_name: string;
  ocr_text: string;   // raw Gemini JSON string
  success: boolean;
  error: any;
  suggested_document_type?: string;
  suggested_document_name?: string;
}
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
      `${environment.BaseUrl}api/Utility/DeleteForAll?typeId=${typeId}&primaryId=${primaryId}&userId=${userId}`,
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
getDocumentPagesByDocument(documentId: number): Observable<any[]> {
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
    .set('documentId', documentId.toString());

  return this.http.get<any[]>(
    environment.BaseUrl + 'api/DocumentPage/GetDocumentPages',
    {
      headers: headers,
      params: params,
    }
  );
}
getDocumentByDocumentName(documentId: number, startIndex: number = 0, pageSize: number = 2): Observable<any[]> {
  const lsValue = localStorage.getItem(this.authLocalStorageToken);
  if (!lsValue) {
    return new Observable<any[]>((observer) => { observer.next([]); observer.complete(); });
  }
  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
  });
  const params = new HttpParams()
    .set('DocumentId', documentId.toString())
    .set('StartIndex', startIndex.toString())   // 0-based: page1=0, page2=10, page3=20
    .set('PageSize', pageSize.toString());
 
  return this.http.get<any[]>(
    environment.BaseUrl + 'api/DocumentPage/GetDocumentPages',
    { headers, params }
  );
}

getDocumentsByTypeId(documentTypeId: number, startIndex: number = 1, pageSize: number = 10, roleId: number = 0, searchBy: string,
  searchCriteria: string): Observable<any[]> {
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
    .set('StartIndex', startIndex.toString())  
    .set('PageSize', pageSize.toString())
    .set('DocumentTypeId', documentTypeId.toString())
    .set('RoleId', roleId.toString())
    .set('SearchBy', searchBy)
    .set('SearchCriteria', searchCriteria);
 
  return this.http.get<any[]>(
    environment.BaseUrl + 'api/DocumentPage/GetDocumentById',
    { headers, params }
  );
}

// askAgent(question: string): Observable<any> {
//   const lsValue = localStorage.getItem(this.authLocalStorageToken);

//   const headers = new HttpHeaders({
//     Authorization: 'Bearer ' + JSON.parse(lsValue!).authToken
//   });

//   return this.http.post<any>(
//     environment.BaseUrl + 'api/Agent/ask',
//     { question },
//     { headers }
//   );
// }

askAgent(
  question: string,
  startIndex: number,
  pageSize: number,
  searchBy: string,
  searchCriteria: string
): Observable<any> {
  const lsValue = localStorage.getItem(this.authLocalStorageToken);

  if (!lsValue) {
    return new Observable<any>((observer) => {
      observer.next(null);
      observer.complete();
    });
  }

  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue).authToken
  });

  const params = new HttpParams()
    .set('startIndex',      startIndex.toString())
    .set('pageSize',        pageSize.toString())
    .set('searchBy',        searchBy)
    .set('searchCriteria',  searchCriteria);

  return this.http.get<any>(
    environment.BaseUrl + 'api/Agent/AgentGET',
    { headers, params }
  );
}

summarizeDocument(documentName: string): Observable<any> {
  const lsValue = localStorage.getItem(this.authLocalStorageToken);
  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue!).authToken
  });

  return this.http.post<any>(
    environment.BaseUrl + 'api/Agent/summarize',
    { question: documentName },
    { headers }
  );
}
// In settings.service.ts — add alongside summarizeDocument()
saveSummary(documentName: string, summaryText: string, summaryId: number, userId: number,roleId:number): Observable<any> {
  return this.http.post(environment.BaseUrl + 'api/Agent/save-summary', {
    summaryId:    summaryId,
    documentName: documentName,
    summaryText:  summaryText,
    userId:       userId ,
    roleId:roleId        
  });
}

getDocumentType(
  startIndex: number,
  pageSize: number,
  searchBy: string,
  searchCriteria: string,
  roleId: number
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
    .set('StartIndex', startIndex.toString())
    .set('PageSize', pageSize.toString())
    .set('SearchBy', searchBy || '')
    .set('SearchCriteria', searchCriteria || '')
    .set('RoleId', roleId.toString());

  return this.http.get<any[]>(
    environment.BaseUrl + 'api/DocumentType/GetDocumentType',
    {
      headers: headers,
      params: params,
    }
  );
}

getDocuments(
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
    .set('StartIndex', startIndex.toString())
    .set('PageSize', pageSize.toString())
    .set('SearchBy', searchBy || '')
    .set('SearchCriteria', searchCriteria || '');

  return this.http.get<any[]>(
    environment.BaseUrl + 'api/Document/GetDocuments',
    {
      headers: headers,
      params: params,
    }
  );
}

// In settings.service.ts
getPdf(documentId: number, roleId: number): Observable<Blob> {
  const lsValue = localStorage.getItem(this.authLocalStorageToken);
  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue!).authToken
  });

  return this.http.get(
    `${environment.BaseUrl}api/DocumentPdf/GeneratePdf?DocumentId=${documentId}&StartIndex=1&PageSize=1000&RoleId=${roleId}`,
    { headers, responseType: 'blob' }
  );
}
SummaryDataGet(
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

  return this.http.get<any[]>(environment.BaseUrl + 'api/Agent/GetSummaryData', {
    headers: headers,
    params: params,
  });
}

GetFullDashboard(): Observable<any> {
  const lsValue = localStorage.getItem(this.authLocalStorageToken);
 
  if (!lsValue) {
    return new Observable<any>((observer) => {
      observer.next(null);
      observer.complete();
    });
  }
 
  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
  });
 
  return this.http.get<any>(
    environment.BaseUrl + 'api/Dashboard/GetFullDashboard',
    { headers: headers }
  );
}


// ── Upload and get jobId back immediately
uploadOcrImages(formData: FormData) {
  const headers = this.getAuthHeaders();
  return this.http.post<{ jobId: string; message: string; statusUrl: string }>(
    environment.BaseUrl + 'api/OcrJob/UploadImages',
    formData,
    { headers }
  );
}

// ── Poll job status
getOcrJobById(jobId: string) {
  const headers = this.getAuthHeaders();
  return this.http.get<OcrJobStatus>(
    environment.BaseUrl + 'api/OcrJob/GetOcrJobById?jobId=' + jobId,
    { headers }
  );
}

readonly activeJobKey = 'ocr_active_job'; // localStorage key

// Save job to localStorage when upload starts
saveActiveJob(jobId: string, totalFiles: number) {
  localStorage.setItem(this.activeJobKey, JSON.stringify({
    jobId,
    totalFiles,
    startedAt: new Date().toISOString()
  }));
}

// Get saved job from localStorage
getActiveJob(): { jobId: string; totalFiles: number; startedAt: string } | null {
  const raw = localStorage.getItem(this.activeJobKey);
  return raw ? JSON.parse(raw) : null;
}

// Clear job from localStorage when done
clearActiveJob() {
  localStorage.removeItem(this.activeJobKey);
}

// ── Get all results after job completes
getOcrJobResults(jobId: string) {
  const headers = this.getAuthHeaders();
  return this.http.get<OcrFileResult[]>(
    environment.BaseUrl + 'api/OcrJob/GetOcrJobResults?jobId=' + jobId,
    { headers }
  );
}

// ── Get all jobs list
getOcrJobs(startIndex = 0, pageSize = 10) {
  const headers = this.getAuthHeaders();
  return this.http.get<OcrJobStatus[]>(
    `${environment.BaseUrl}api/OcrJob/GetOcrJobs?startIndex=${startIndex}&pageSize=${pageSize}`,
    { headers }
  );
}

// ── Helper to avoid repeating auth header logic
private getAuthHeaders(): HttpHeaders {
  const lsValue = localStorage.getItem(this.authLocalStorageToken);
  return new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue!).authToken
  });
}

saveSuggestion(
  suggestionId: number,
  documentId: number,
  pageNumber: number,
  documentPageId: number,
  suggestionText: string,
  createdBy: number
): Observable<any> {
  const lsValue = localStorage.getItem(this.authLocalStorageToken);
  const userData = lsValue ? JSON.parse(lsValue) : null;

  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + (userData?.authToken ?? ''),
    'Content-Type': 'application/json'
  });

  const body = {
    suggestionId,
    documentId,
    pageNumber,
    documentPageId,
    suggestionText,
    isActive: true,
    createdBy,
    creatorName: userData?.fullName ?? '',
    createdDate: new Date().toISOString()
  };

  return this.http.post<any>(
    environment.BaseUrl + 'api/Suggestion/insert',
    body,
    { headers }
  );
}
getActiveSuggestions(documentPageId: number,startIndex: number,
  pageSize: number,
  searchBy: string,
  searchCriteria: string,
  roleId: number): Observable<any[]> {
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
    .set('DocumentPageId', documentPageId.toString())
    .set('StartIndex', startIndex.toString())
    .set('PageSize', pageSize.toString())
    .set('SearchBy', searchBy || '')
    .set('SearchCriteria', searchCriteria || '');
 
  return this.http.get<any[]>(
  `${environment.BaseUrl}api/Suggestion/GetActiveSuggestion`,
  { headers, params }  
);
}

//All suggestions for a document page
getSuggestionPages(documentId: number, documentPageId: number, startIndex: number = 1, pageSize: number = 10): Observable<any[]> {
  const lsValue = localStorage.getItem(this.authLocalStorageToken);
  if (!lsValue) {
    return new Observable<any[]>((observer) => { observer.next([]); observer.complete(); });
  }
  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
  });
  const params = new HttpParams()
    .set('DocumentId', documentId.toString())
    .set('DocumentPageId', documentPageId.toString())
    .set('StartIndex', startIndex.toString())   // 0-based: page1=0, page2=10, page3=20
    .set('PageSize', pageSize.toString());
 
  return this.http.get<any[]>(
    environment.BaseUrl + 'api/DocumentPage/GetSuggestionPages',
    { headers, params }
  );
}

manageLock(documentId: number, userId: number, action: 'LOCK' | 'UNLOCK') {
  return this.http.post<any>(
    environment.BaseUrl + 'api/Document/ManageLock',
    {
      documentId: documentId,
      userId: userId,
      action: action
    }
  );
}
reviewSuggestion(model: any) {

  const lsValue = localStorage.getItem(this.authLocalStorageToken);

  const headers = {
    Authorization: 'Bearer ' + JSON.parse(lsValue!).authToken
  };

  return this.http.post(
    environment.BaseUrl + 'api/Suggestion/review',
    model,
    { headers }
  );
}
userAdd(users: any): Observable<any[]> {
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
    environment.BaseUrl + 'api/UserAdd/insert-update',
    users,
    { headers },
  );
}

UsersGET(
  userId:number,
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
    .set('userId', userId.toString())
    .set('startIndex', startIndex.toString())
    .set('pageSize', pageSize.toString())
    .set('searchBy', searchBy)
    .set('searchCriteria', searchCriteria);

  return this.http.get<any[]>(environment.BaseUrl + 'api/UserAdd/UsersGET', {
    headers: headers,
    params: params,
  });
}
}
