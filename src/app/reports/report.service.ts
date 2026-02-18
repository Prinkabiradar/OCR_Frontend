import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, delay, map, tap } from 'rxjs/operators';
import { AuthService } from 'src/app/modules/auth/services/auth.service';

import { BehaviorSubject } from 'rxjs';
import { Dropdown } from 'bootstrap';
import { DateRange } from '@angular/material/datepicker';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  exportToExcel(arg0: any[], arg1: string) {
    throw new Error('Method not implemented.');
  }
  exportToPDF(arg0: any[], arg1: string) {
    throw new Error('Method not implemented.');
  }

  apiUrl: any;

  getEmployeeCTC: any;

  public isLoading = new BehaviorSubject(false);
  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  constructor(private http: HttpClient, private authService: AuthService) { }
  private dropdownDataSubject = new BehaviorSubject<
    Array<{ id: string; text: string }>
  >([]);
  dropdownData$ = this.dropdownDataSubject.asObservable();


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

  //need
  SideMenuGetReports(
    startIndex: number,
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
      .set('startIndex', startIndex.toString());

    return this.http.get<any[]>(
      environment.BaseUrl + 'api/Menu/SideMenuGetReports',
      {
        headers: headers,
        params: params,
      }
    );
  }
  GSTR1Get(
    CustomerVendorId: number,
    startIndex: number,
    pageSize: number,
    searchBy: string | null,
    searchCriteria: string | null,
    FromDate: string,
    ToDate: string
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

    let params = new HttpParams()
      .set('CustomerVendorId', CustomerVendorId)
      .set('startIndex', startIndex.toString())
      .set('pageSize', pageSize.toString())
      .set('searchBy', searchBy || '')
      .set('searchCriteria', searchCriteria || '');
    if (FromDate && FromDate.trim() !== '') {
      params = params.set('FromDate', FromDate);
    }

    if (ToDate && ToDate.trim() !== '') {
      params = params.set('ToDate', ToDate);
    }

    return this.http.get<any[]>(environment.BaseUrl + 'api/Gstr/GSTR1Get', {
      headers: headers,
      params: params,
    });
  }

  GSTR2BGet(CustomerVendorId: number,startIndex: number, pageSize: number, searchBy: string, searchCriteria: string | null, FromDate: string, ToDate: string  ): Observable<any[]> {
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

    let params = new HttpParams()
      .set('CustomerVendorId', CustomerVendorId)
      .set('startIndex', startIndex.toString())
      .set('pageSize', pageSize.toString())
      .set('searchBy', searchBy|| '')
      .set('searchCriteria', searchCriteria || '');
    if (FromDate && FromDate.trim() !== '') {
      params = params.set('FromDate', FromDate);
    }

    if (ToDate && ToDate.trim() !== '') {
      params = params.set('ToDate', ToDate);
    }

    return this.http.get<any[]>(environment.BaseUrl + 'api/Gstr/GSTR2BGet', {
      headers: headers,
      params: params,
    });
  }

  GSTR3BGet(
    startIndex: number,
    pageSize: number,
    searchBy: number,
    searchCriteria: string | null,
    FromDate: string,
    ToDate: string
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

    let params = new HttpParams()
      .set('startIndex', startIndex.toString())
      .set('pageSize', pageSize.toString())
      .set('searchBy', searchBy)
      .set('searchCriteria', searchCriteria || '');
    if (FromDate && FromDate.trim() !== '') {
      params = params.set('FromDate', FromDate);
    }

    if (ToDate && ToDate.trim() !== '') {
      params = params.set('ToDate', ToDate);
    }

    return this.http.get<any[]>(environment.BaseUrl + 'api/Gstr/GSTR3BGet', {
      headers: headers,
      params: params,
    });
  }

  PurchaseItemsReportGet(
    VendorId: number,
    startIndex: number,
    pageSize: number,
    searchBy: string,
    searchCriteria: string,
    fromDate: string,
    toDate: string
  ): Observable<any[]> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    const params = new HttpParams()
      .set('VendorId', VendorId)
      .set('startIndex', startIndex.toString())
      .set('pageSize', pageSize.toString())
      .set('searchBy', searchBy)
      .set('searchCriteria', searchCriteria)
      .set('fromDate', fromDate)
      .set('toDate', toDate);

    return this.http.get<any[]>(
      environment.BaseUrl + 'api/PurchaseItemsReport/PurchaseItemsReportGET',
      {
        headers: headers,
        params: params
      }
    ).pipe(
      map((response: any) => response || []),
      catchError(error => {
        console.error('Error in PurchaseItemsReportGet:', error);
        return throwError(() => error);
      })
    );
  }


  downloadPurchaseItemsPDF(
    vendorId: string,
    fromDate: string,
    toDate: string,
    searchBy: string,
    searchCriteria: string
  ): Observable<Blob> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    // Debug: Log the parameters being sent
    console.log('PDF Download Parameters:', {
      VendorId: vendorId,
      FromDate: fromDate,
      ToDate: toDate,
      startIndex: '1', // Changed from '0' to '1' to match your GET method
      pageSize: '1000',
      searchBy: searchBy,
      searchCriteria: searchCriteria
    });

    // Match the exact parameter names and order from your C# controller
    const params = new HttpParams()
      .set('VendorId', vendorId || '0')
      .set('FromDate', fromDate)
      .set('ToDate', toDate)
      .set('startIndex', '1') // Match your ReportsGET method
      .set('pageSize', '1000')
      .set('searchBy', searchBy || '0')
      .set('searchCriteria', searchCriteria || '0');

    return this.http.get(
      environment.BaseUrl + 'api/PurchaseItemsReport/downloadPurchaseItemsPDF',
      {
        headers: headers,
        params: params,
        responseType: 'blob'
      }
    ).pipe(
      catchError(error => {
        console.error('Error in downloadPurchaseItemsPDF:', error);
        return throwError(() => error);
      })
    );
  }
  downloadPurchaseItemsPDFAlternative(
    vendorId: string,
    fromDate: string,
    toDate: string,
    searchBy: string,
    searchCriteria: string,
    startIndex: string = '1',
    pageSize: string = '1000'
  ): Observable<Blob> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    const params = new HttpParams()
      .set('VendorId', vendorId)
      .set('FromDate', fromDate)
      .set('ToDate', toDate)
      .set('startIndex', startIndex)
      .set('pageSize', pageSize)
      .set('searchBy', searchBy)
      .set('searchCriteria', searchCriteria);

    console.log('PDF Download URL:', environment.BaseUrl + 'api/PurchaseItemsReport/downloadPurchaseItemsPDF');
    console.log('PDF Download Parameters:', params.toString());

    return this.http.get(
      environment.BaseUrl + 'api/PurchaseItemsReport/downloadPurchaseItemsPDF',
      {
        headers: headers,
        params: params,
        responseType: 'blob'
      }
    ).pipe(
      tap(() => console.log('PDF download request successful')),
      catchError(error => {
        // Log error details
        console.error('PDF download error:', error);

        // If error.error is a blob, optionally parse here—but do not return a Promise!
        // You can push details to a logging service, etc.

        // Always return Observable<Blob> error for type safety
        return throwError(() => error);
      })
    );
  }

  downloadGSTR1PDF(
    CustomerVendorId: number,
    fromDate: string,
    toDate: string,
    searchBy: number,
    searchCriteria: number
  ): Observable<Blob> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    // Debug: Log the parameters being sent
    console.log('PDF Download Parameters:', {
      CustomerVendorId: CustomerVendorId,
      FromDate: fromDate,
      ToDate: toDate,
      startIndex: 1, // Changed from '0' to '1' to match your GET method
      pageSize: 1000,
      searchBy: searchBy,
      searchCriteria: searchCriteria
    });

    // Match the exact parameter names and order from your C# controller
    const params = new HttpParams()
      .set('CustomerVendorId', CustomerVendorId || 0)
      .set('FromDate', fromDate)
      .set('ToDate', toDate)
      .set('startIndex', 1) // Match your ReportsGET method
      .set('pageSize', 1000)
      .set('searchBy', searchBy || 0)
      .set('searchCriteria', searchCriteria || '0');

    return this.http.get(
      environment.BaseUrl + 'api/Gstr/downloadGSTR1PDF',
      {
        headers: headers,
        params: params,
        responseType: 'blob'
      }
    ).pipe(
      catchError(error => {
        console.error('Error in downloadGSTR1PDF:', error);
        return throwError(() => error);
      })
    );
  }

  downloadGSTR1PDFAlternative(
    CustomerVendorId: string,
    fromDate: string,
    toDate: string,
    searchBy: string,
    searchCriteria: string,
    startIndex: string = '1',
    pageSize: string = '1000'
  ): Observable<Blob> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    const params = new HttpParams()
      .set('CustomerVendorId', CustomerVendorId)
      .set('FromDate', fromDate)
      .set('ToDate', toDate)
      .set('startIndex', startIndex)
      .set('pageSize', pageSize)
      .set('searchBy', searchBy)
      .set('searchCriteria', searchCriteria);

    console.log('PDF Download URL:', environment.BaseUrl + 'api/Gstr/downloadGSTR1PDF');
    console.log('PDF Download Parameters:', params.toString());

    return this.http.get(
      environment.BaseUrl + 'api/Gstr/downloadGSTR1PDF',
      {
        headers: headers,
        params: params,
        responseType: 'blob'
      }
    ).pipe(
      tap(() => console.log('PDF download request successful')),
      catchError(error => {
        // Log error details
        console.error('PDF download error:', error);

        // If error.error is a blob, optionally parse here—but do not return a Promise!
        // You can push details to a logging service, etc.

        // Always return Observable<Blob> error for type safety
        return throwError(() => error);
      })
    );
  }


  downloadGSTR2BPDF(
    CustomerVendorId: number,
    fromDate: string,
    toDate: string,
    searchBy: number,
    searchCriteria: number
  ): Observable<Blob> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    // Debug: Log the parameters being sent
    console.log('PDF Download Parameters:', {
      CustomerVendorId: CustomerVendorId,
      FromDate: fromDate,
      ToDate: toDate,
      startIndex: 1, // Changed from '0' to '1' to match your GET method
      pageSize: 1000,
      searchBy: searchBy,
      searchCriteria: searchCriteria
    });

    // Match the exact parameter names and order from your C# controller
    const params = new HttpParams()
      .set('CustomerVendorId', CustomerVendorId || 0)
      .set('FromDate', fromDate)
      .set('ToDate', toDate)
      .set('startIndex', 1) // Match your ReportsGET method
      .set('pageSize', 1000)
      .set('searchBy', searchBy || 0)
      .set('searchCriteria', searchCriteria || '0');

    return this.http.get(
      environment.BaseUrl + 'api/Gstr/downloadGSTR2PDF',
      {
        headers: headers,
        params: params,
        responseType: 'blob'
      }
    ).pipe(
      catchError(error => {
        console.error('Error in downloadGSTR2PDF:', error);
        return throwError(() => error);
      })
    );
  }

  downloadGSTR2BPDFAlternative(
    CustomerVendorId: string,
    fromDate: string,
    toDate: string,
    searchBy: string,
    searchCriteria: string,
    startIndex: string = '1',
    pageSize: string = '1000'
  ): Observable<Blob> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    const params = new HttpParams()
      .set('CustomerVendorId', CustomerVendorId)
      .set('FromDate', fromDate)
      .set('ToDate', toDate)
      .set('startIndex', startIndex)
      .set('pageSize', pageSize)
      .set('searchBy', searchBy)
      .set('searchCriteria', searchCriteria);

    console.log('PDF Download URL:', environment.BaseUrl + 'api/Gstr/downloadGSTR2PDF');
    console.log('PDF Download Parameters:', params.toString());

    return this.http.get(
      environment.BaseUrl + 'api/Gstr/downloadGSTR2PDF',
      {
        headers: headers,
        params: params,
        responseType: 'blob'
      }
    ).pipe(
      tap(() => console.log('PDF download request successful')),
      catchError(error => {
        // Log error details
        console.error('PDF download error:', error);

        // If error.error is a blob, optionally parse here—but do not return a Promise!
        // You can push details to a logging service, etc.

        // Always return Observable<Blob> error for type safety
        return throwError(() => error);
      })
    );
  }

  generateInvoicePDF(
  invoiceId: number 
): Observable<Blob> {
  const lsValue = localStorage.getItem(this.authLocalStorageToken);

  if (!lsValue) {
    return new Observable<Blob>((observer) => {
      observer.next(new Blob());
      observer.complete();
    });
  }

  const headers = new HttpHeaders({
    Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
  });

  const params = new HttpParams()
    .set('InvoiceId', invoiceId) ;

  return this.http.get<Blob>(
    environment.BaseUrl + 'api/Invoice/GenerateInvoicePdf',
    {
      headers,
      params,
      responseType: 'blob' as 'json',
    }
  );
}

}
