import axios, { AxiosError } from 'axios';
import { toastHelpers } from '@/hooks/use-toast';
import { API_ROOT } from '@/utils/constants';
import {
  authorizationHeader,
  clearAccessToken,
  setAccessToken,
} from '@/lib/auth-token';
import type { RefreshTokenResponse } from '@/config/interface';

const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

// Không đặt baseURL: mọi lời gọi đã truyền URL đầy đủ `${API_ROOT}/v1/...`.
// Nếu đặt baseURL trùng API_ROOT thì với API_ROOT tương đối ('/api' qua rewrite)
// axios sẽ nối thành '/api/api/v1/...'.
const authorizedAxiosInstance = axios.create({
  headers: defaultHeaders,
  withCredentials: true,
  timeout: 10 * 60 * 1000,
});

const unwrapItem = (data: any) => {
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'item' in data
  ) {
    return (data as { item: unknown }).item;
  }
  return data;
};

// Tránh gọi refresh-token nhiều lần song song (axios 410 và socket TOKEN_EXPIRED dùng chung)
let refreshTokenPromise: Promise<RefreshTokenResponse> | null = null;

/**
 * Gọi GET /v1/auth/refresh_token bằng axios gốc (không qua interceptor); cookie
 * refreshToken httpOnly đi kèm, BE xoay cookie và trả access token mới trong
 * body → lưu vào bộ nhớ (lib/auth-token). Thất bại → xoá token, toast, chuyển
 * /login, reject. Dùng cho interceptor 410, socket, AI SSE và AuthGuard bootstrap.
 */
export const refreshAccessToken = (): Promise<RefreshTokenResponse> => {
  if (!refreshTokenPromise) {
    refreshTokenPromise = axios
      .get(`${API_ROOT}/v1/auth/refresh_token`, {
        withCredentials: true,
      })
      // BE trả { item: { accessToken } } (ResponseInterceptor bọc object đơn)
      .then(res => {
        const tokens = unwrapItem(res.data) as RefreshTokenResponse;
        setAccessToken(tokens.accessToken);
        return tokens;
      })
      .catch((refreshError: AxiosError) => {
        // Refresh thất bại → buộc logout
        clearAccessToken();
        let refreshMessage = refreshError.message;
        if (
          refreshError.response?.data &&
          typeof refreshError.response.data === 'object' &&
          'message' in refreshError.response.data
        ) {
          refreshMessage = (refreshError.response.data as { message: string })
            .message;
        }

        toastHelpers.error({ description: refreshMessage });

        if (typeof window !== 'undefined') {
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }

        throw refreshError;
      })
      .finally(() => {
        refreshTokenPromise = null;
      });
  }
  return refreshTokenPromise;
};

// Cấu hình Interceptors
// Interceptor request: gắn access token trong bộ nhớ vào Authorization. BE chỉ
// nhận Bearer (không còn cookie accessToken) nên request thiếu header này → 401.
authorizedAxiosInstance.interceptors.request.use(
  config => {
    const auth = authorizationHeader();
    if (auth.Authorization && !config.headers.Authorization) {
      config.headers.Authorization = auth.Authorization;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Interceptor response: Can thiệp vào giữa những cái response API
authorizedAxiosInstance.interceptors.response.use(
  response => {
    return response;
  },
  (error: AxiosError) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    // Mọi những mã http status code ngoài khoang 200 - 299 sẽ là error và rơi vào đây
    const { response, config } = error;

    // Trường hợp cần refresh token (BE trả về 410)
    if (response?.status === 410 && config) {
      const originalRequest: any = config;

      // Tránh loop vô hạn: chỉ retry 1 lần / request
      if (originalRequest._retry) {
        // Nếu đã retry mà vẫn 410 thì coi như hết hạn hoàn toàn → về màn login
        if (typeof window !== 'undefined') {
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // Sau khi refresh thành công thì gọi lại request cũ
      return refreshAccessToken().then(() =>
        authorizedAxiosInstance(originalRequest)
      );
    }

    let errorMessage = error?.message;
    if (
      response?.data &&
      typeof response.data === 'object' &&
      'message' in response.data
    ) {
      errorMessage = (response.data as { message: string }).message;
    }
    // Dùng toastify để hiển thị bất kể mọi mã lỗi lên trên màn hình - Ngoại trừ mã 410 - phục vụ việc tự động refresh lại token
    if (response?.status !== 410) {
      toastHelpers.error({ description: errorMessage });
    }

    // Chỉ redirect về login khi 401 (chưa/​hết xác thực).
    // 403 = đã đăng nhập nhưng không đủ quyền → giữ nguyên trang, chỉ hiện toast
    // lỗi (đã xử lý ở trên), KHÔNG đá user ra màn login.
    if (response?.status === 401) {
      clearAccessToken();
      // Only redirect if we're in the browser
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        // Don't redirect if already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }

    return Promise.reject(errorMessage);
  }
);

export const sendGet = async (path: string, params: any = {}) => {
  const res = await authorizedAxiosInstance.get(path, { params });
  return unwrapItem(res.data);
};

export const sendPost = async (path: string, params?: any) => {
  const res = await authorizedAxiosInstance.post(path, params);
  return unwrapItem(res.data);
};

export const sendPatch = async (path: string, params?: any) => {
  const res = await authorizedAxiosInstance.patch(path, params);
  return unwrapItem(res.data);
};

export const sendPut = async (path: string, params?: any) => {
  const res = await authorizedAxiosInstance.put(path, params);
  return unwrapItem(res.data);
};

export const sendDelete = async (path: string, params?: any) => {
  const res = await authorizedAxiosInstance.delete(path, { params });
  return unwrapItem(res.data);
};

export const sendPostFormData = async (path: string, formData: FormData) => {
  const res = await authorizedAxiosInstance.post(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapItem(res.data);
};

export const sendPatchFormData = async (path: string, formData: FormData) => {
  const res = await authorizedAxiosInstance.patch(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapItem(res.data);
};

export const sendPutFormData = async (path: string, formData: FormData) => {
  const res = await authorizedAxiosInstance.put(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrapItem(res.data);
};

export const sendGetBlob = async (path: string, params: any = {}) => {
  const res = await authorizedAxiosInstance.get(path, {
    params,
    responseType: 'blob',
  });
  return res.data;
};

export const sendGetBlobWithHeaders = async (
  path: string,
  params: any = {}
) => {
  const res = await authorizedAxiosInstance.get(path, {
    params,
    responseType: 'blob',
  });
  return {
    data: res.data,
    headers: res.headers,
  };
};

export const sendFormData = async (
  path: string,
  data: Record<string, any>,
  files?: File[]
) => {
  const formData = new FormData();

  // Add regular data fields
  Object.keys(data).forEach(key => {
    // Skip attachments if files are provided separately
    if (key === 'attachments' && files !== undefined) {
      return;
    }

    const value = data[key];
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value, value.name);
      } else if (Array.isArray(value)) {
        const hasFiles = value.some(item => item instanceof File);
        if (hasFiles) {
          value.forEach(file => {
            if (file instanceof File) {
              formData.append(key, file, file.name);
            }
          });
        } else {
          formData.append(key, JSON.stringify(value));
        }
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });

  // Add files if provided separately
  if (files && files.length > 0) {
    files.forEach(file => {
      if (file instanceof File) {
        formData.append('attachments', file, file.name);
      }
    });
  }
  // Reuse sendPostFormData
  return sendPostFormData(path, formData);
};

export const parseFilenameFromContentDisposition = (
  contentDisposition: string
): string => {
  if (!contentDisposition) return '';

  // Try to match filename*=UTF-8''encoded_filename first
  const filenameStarMatch = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/
  );
  if (filenameStarMatch) {
    // Decode percent-encoded UTF-8 filename
    try {
      return decodeURIComponent(filenameStarMatch[1]);
    } catch (error) {
      console.warn('Failed to decode filename:', error);
    }
  }

  // Fallback to regular filename="filename"
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
  if (filenameMatch) {
    return filenameMatch[1];
  }

  // Fallback to filename=filename (without quotes)
  const filenameFallbackMatch = contentDisposition.match(/filename=([^;]+)/);
  if (filenameFallbackMatch) {
    return filenameFallbackMatch[1].replace(/^\s*"(.*)"\s*$/, '$1'); // Remove quotes if present
  }

  return '';
};

export default authorizedAxiosInstance;
