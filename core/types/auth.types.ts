/**
 * core/types/auth.types.ts
 */

export interface LoginCredentials {
  email:    string;
  password: string;
}

export interface LoginFormState {
  isLoading: boolean;
  error:     string | null;
}

export interface AuthUser {
  id:        string;
  email:     string;
  /** Doit correspondre à l'enum SQL : admin | courier | client */
  role:      "admin" | "courier" | "client";
  fullName?: string;
}