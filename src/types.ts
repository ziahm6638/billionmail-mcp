export interface BillionMailResponse<T = any> {
  success: boolean;
  code: number;
  msg: string;
  data: T;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  ttl: number;
  accountInfo: {
    id: number;
    username: string;
    email: string;
    status: number;
    lang: string;
  };
}

export interface PaginatedData<T> {
  total: number;
  list: T[];
}
