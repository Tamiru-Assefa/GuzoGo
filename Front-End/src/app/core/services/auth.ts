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
        // Assuming login response contains userId or user object
        // Adjust 'response.userId' or 'response.user.id' according to your API response schema
        if (response?.userId) {
          localStorage.setItem('userId', response.userId.toString());
        }
        if (response?.token) {
          localStorage.setItem('token', response.token);
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
  }
}