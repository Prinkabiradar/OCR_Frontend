import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
//import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserModel } from '../../../models/user.model';
import { environment } from '../../../../../../environments/environment';
import { AuthModel } from '../../../models/auth.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
const API_USERS_URL = `${environment.BaseUrl}api/Auth`;

@Injectable({
  providedIn: 'root',
})
export class AuthHTTPService {
  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post<AuthModel>(`${API_USERS_URL}/login`, {
      username,
      password,
    });
  }

  createUser(user: UserModel): Observable<UserModel> {
    return this.http.post<UserModel>(API_USERS_URL, user);
  }

  forgotPassword(email: string): Observable<boolean> {
    return this.http.post<boolean>(`${API_USERS_URL}/forgot-password`, { email });
  }

  getUserByToken(token: string): Observable<UserModel | undefined> {
    // ✅ Use HttpParams to safely encode the JWT in the URL
    const params = new HttpParams().set('AccessToken', token);
    
    return this.http
      .get<any>(`${API_USERS_URL}/getUserByAccessToken`, { params })
      .pipe(
        map((response: any) => {
          if (response?.userId) {
            return response as UserModel;
          }
          if (response?.success && response?.data) {
            return response.data as UserModel;
          }
          return undefined;
        }),
        catchError(() => of(undefined))
      );
  }
}