import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const http = inject(HttpClient);
  const router = inject(Router);

  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  // Skip refresh logic for auth endpoints themselves
  if (req.url.includes('/Auth/refresh') || req.url.includes('/Auth/login') || req.url.includes('/Auth/register')) {
    return next(req);
  }

  const addToken = (request: HttpRequest<unknown>, t: string) =>
    request.clone({ setHeaders: { Authorization: `Bearer ${t}` } });

  const handle401Error = (request: HttpRequest<unknown>, nextHandler: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshTokenSubject.next(null);

      return http.post(`${environment.apiUrl}/Auth/refresh`, { refreshToken }).pipe(
        switchMap((res: any) => {
          localStorage.setItem('token', res.token);
          localStorage.setItem('refreshToken', res.refreshToken);
          refreshTokenSubject.next(res.token);
          isRefreshing = false;
          return nextHandler(addToken(request, res.token));
        }),
        catchError((err) => {
          isRefreshing = false;
          localStorage.clear();
          router.navigate(['/login']);
          return throwError(() => err);
        })
      );
    } else {
      return refreshTokenSubject.pipe(
        filter(t => t !== null),
        take(1),
        switchMap(t => nextHandler(addToken(request, t!)))
      );
    }
  };

  const cloned = token ? addToken(req, token) : req;

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && refreshToken) {
        return handle401Error(req, next);
      }
      return throwError(() => error);
    })
  );
};