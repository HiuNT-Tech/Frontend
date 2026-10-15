'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import authorizedAxiosInstance from '@/utils/authorizeAxios';
import type {
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';

/**
 * Global Loading Bar — thin animated progress bar at the top of the viewport.
 *
 * It hooks into the shared Axios instance's interceptors so that
 * every in-flight API request is automatically tracked.
 * No manual wiring needed in individual components.
 */
export const LoadingBarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeRequests, setActiveRequests] = useState(0);
  const requestInterceptorId = useRef<number | null>(null);
  const responseInterceptorId = useRef<number | null>(null);

  const increment = useCallback(() => setActiveRequests(c => c + 1), []);
  const decrement = useCallback(
    () => setActiveRequests(c => Math.max(0, c - 1)),
    []
  );

  useEffect(() => {
    requestInterceptorId.current =
      authorizedAxiosInstance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
          increment();
          return config;
        },
        (error: AxiosError) => {
          decrement();
          return Promise.reject(error);
        }
      );

    responseInterceptorId.current =
      authorizedAxiosInstance.interceptors.response.use(
        (response: AxiosResponse) => {
          decrement();
          return response;
        },
        (error: AxiosError) => {
          decrement();
          return Promise.reject(error);
        }
      );

    return () => {
      if (requestInterceptorId.current !== null) {
        authorizedAxiosInstance.interceptors.request.eject(
          requestInterceptorId.current
        );
      }
      if (responseInterceptorId.current !== null) {
        authorizedAxiosInstance.interceptors.response.eject(
          responseInterceptorId.current
        );
      }
    };
  }, [increment, decrement]);

  const isLoading = activeRequests > 0;

  return (
    <>
      {isLoading && (
        <div aria-hidden="true" className="loading-bar-container">
          <div className="loading-bar-progress" />
        </div>
      )}
      {children}

      {/* Scoped styles — keeps the animation self-contained */}
      <style jsx global>{`
        .loading-bar-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          z-index: 99999;
          overflow: hidden;
          background: transparent;
          pointer-events: none;
        }

        .loading-bar-progress {
          height: 100%;
          width: 40%;
          border-radius: 0 2px 2px 0;
          background: linear-gradient(
            90deg,
            transparent,
            var(--accent),
            var(--accent-hover)
          );
          animation: loading-bar-slide 1.2s ease-in-out infinite;
        }

        @keyframes loading-bar-slide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(150%);
          }
          100% {
            transform: translateX(350%);
          }
        }
      `}</style>
    </>
  );
};
