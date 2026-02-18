import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from 'src/app/modules/auth/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  public isLoading = new BehaviorSubject(false);

  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  constructor(private http: HttpClient, private authService: AuthService) {}

 
  getMenu(
    roleId: number
  ): Observable<any[]> {
    const lsValue = localStorage.getItem(this.authLocalStorageToken);

    if (!lsValue) {
      return new Observable<any[]>((observer) => {
        observer.next([]);
        observer.complete();
      });
    }
    console.log(JSON.parse(lsValue).authToken);
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + JSON.parse(lsValue).authToken,
    });

    const params = new HttpParams()
      .set('roleId', roleId)
   
    return this.http.get<any[]>(environment.BaseUrl + 'api/Menu/getmenu', {
      headers: headers,
      params: params,
    });
  }
}
