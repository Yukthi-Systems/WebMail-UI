/*
 * Copyright (C) 2026 Yukthi Systems Private Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import { useRouter } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useState } from 'react';
import {
  FiAlertTriangle,
  FiRefreshCw,
  FiLogOut,
  FiChevronDown,
  FiChevronUp,
  FiHome,
} from 'react-icons/fi';
import './css/ErrorBoundary.css';
import { resetLayoutCache } from '../../routes/_baselayout';

export function ErrorBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // Simulate logout function
  const handleLogout = () => {
    localStorage.clear();
    resetLayoutCache();
    router.navigate({ to: '/login' });
  };

  const reset = () => {
    router.invalidate().finally(() => {
      router.navigate({ to: '/' });
    });
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <div className="error-container">
      <div className="error-content">
        <div className="error-icon">
          <FiAlertTriangle size={64} />
        </div>

        <h1>Oops! Something went wrong</h1>
        <p>
          We encountered an unexpected error. Please try again or contact support if the problem
          persists.
        </p>

        <div className="error-actions">
          <button className="btn btn-primary" onClick={reset}>
            <FiRefreshCw className="btn-icon" />
            Try Again
          </button>

          <button className="btn btn-secondary" onClick={toggleDetails}>
            {showDetails ? (
              <>
                <FiChevronUp className="btn-icon" />
                Hide Error
              </>
            ) : (
              <>
                <FiChevronDown className="btn-icon" />
                Show Error
              </>
            )}
          </button>

          <button className="btn btn-logout" onClick={handleLogout}>
            <FiLogOut className="btn-icon" />
            Logout
          </button>

          <button className="btn btn-home" onClick={() => router.navigate({ to: '/' })}>
            <FiHome className="btn-icon" />
            Go Home
          </button>
        </div>

        {/* {showDetails && ( */}
        <div className="error-details">
          <h3>Error Details:</h3>
          <pre>{error.message}</pre>
          {error.stack && (
            <>
              <h4>Stack Trace:</h4>
              <pre>{error.stack}</pre>
            </>
          )}
        </div>
        {/* )} */}
      </div>
    </div>
  );
}
