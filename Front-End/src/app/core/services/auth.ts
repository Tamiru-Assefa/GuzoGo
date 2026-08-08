import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { RegisterRequest } from '../models/auth/register-request';
import { environment } from '../../../environments/environment';
import { LoginRequest } from '../models/auth/login-request';
import { RegisterResponse } from '../models/auth/register-response';
import { LoginResponse } from '../models/auth/login-response';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // REGISTER METHOD
 register(registerData: RegisterRequest) {
  return this.http.post<RegisterResponse>(
    `${this.apiUrl}/Auth/register`,
    registerData
  );
}

  // LOGIN METHOD
  login(loginData: LoginRequest) {
  return this.http.post<LoginResponse>(
    `${this.apiUrl}/Auth/login`,
    loginData
  ).pipe(
    tap((response: any) => {
      if (response?.userId) {
        localStorage.setItem('userId', response.userId.toString());
      }
      const token = response?.token || response?.accessToken || response?.access_token || response?.jwt;
      if (token) {
        localStorage.setItem('token', token);
      }
      // *** ADD THIS: save refresh token ***
      const refreshToken = response?.refreshToken || response?.refresh_token;
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    })
  );
}

  // GET USER ID METHOD
  getUserId(): number | null {
    const userId = localStorage.getItem('userId');
    return userId ? Number(userId) : null;
  }

  // LOGOUT METHOD
  logout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }
}