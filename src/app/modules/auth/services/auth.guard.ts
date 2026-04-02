import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  constructor(private authService: AuthService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.authService.isLoading$.pipe(
      filter(isLoading => isLoading === false), // ✅ wait for token check to finish
      take(1),
      map(() => {
        const currentUser = this.authService.currentUserValue;
        if (currentUser) {
          return true;
        }
        this.authService.logout();
        return false;
      })
    );
  }
}