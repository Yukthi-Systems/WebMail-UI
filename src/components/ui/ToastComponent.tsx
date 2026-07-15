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

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  FaCircleExclamation,
  FaRegCircleCheck,
  FaRegCircleXmark,
  FaRotateLeft,
} from 'react-icons/fa6';
import { useAtomValue } from 'jotai';
import { userSettingsAtom } from '../../state/settings';

type ToastStatus = 'default' | 'success' | 'error' | 'loading';
type ToastPosition = 'bottom-right' | 'top-center';

interface ToastUndo {
  label?: string;
  onClick: () => void;
  duration?: number;
}

interface ToastConfig {
  description: string;
  status?: ToastStatus;
  duration?: number;
  position?: ToastPosition;
  undo?: ToastUndo;
  id?: string;
}

interface ToastItem extends ToastConfig {
  id: string;
  leaving: boolean;
}

interface ToastContextValue {
  (payload: ToastConfig): void;
  success: (payload: ToastConfig) => void;
  error: (payload: ToastConfig) => void;
  loading: (payload: ToastConfig) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <Toasts>');
  return ctx;
};

// ─── Provider ────────────────────────────────────────────────────────────────

export const Toasts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 320);
  }, []);

  const add = React.useCallback(
    (config: ToastConfig) => {
      // ✅ Respect a pre-generated id so dismiss() can target it correctly
      const id = config.id ?? `${Date.now()}-${Math.random()}`;

      setToasts((prev) => [...prev, { ...config, id, leaving: false }]);

      // Loading toasts are dismissed programmatically via toast.dismiss() — never auto-remove them
      if (config.status === 'loading') return;

      const duration = config.undo
        ? (config.undo.duration ?? 5000)
        : Math.min(config.duration ?? 3000, 3000);

      setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const api = React.useMemo(() => {
    const fn = (payload: ToastConfig) => add(payload);
    fn.success = (payload: ToastConfig) => add({ ...payload, status: 'success' });
    fn.error = (payload: ToastConfig) => add({ ...payload, status: 'error' });
    fn.loading = (payload: ToastConfig) => {
      const id = `${Date.now()}-${Math.random()}`;
      // ✅ Use 'loading' status, pass the id so dismiss() works, long duration as safety net
      add({ ...payload, status: 'loading', id, duration: 30000 });
      return id;
    };
    fn.dismiss = (id: string) => remove(id);
    return fn as unknown as ToastContextValue;
  }, [add, remove]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <>
          <ToastList
            toasts={toasts.filter((t) => t.position !== 'top-center')}
            position="top-center"
            onRemove={remove}
          />
          <ToastList
            toasts={toasts.filter((t) => t.position === 'top-center')}
            position="top-center"
            onRemove={remove}
          />
        </>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

// ─── List ─────────────────────────────────────────────────────────────────────

const ToastList: React.FC<{
  toasts: ToastItem[];
  position: ToastPosition;
  onRemove: (id: string) => void;
}> = ({ toasts, position, onRemove }) => {
  if (toasts.length === 0) return null;

  const style: React.CSSProperties =
    position === 'top-center'
      ? {
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
        }
      : {
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
        };

  return (
    <div style={style}>
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────

const COLORS: Record<ToastStatus, { accent: string; icon: string; bg: string }> = {
  success: { accent: '#16a34a', icon: '#16a34a', bg: '#f0fdf4' },
  error: { accent: '#dc2626', icon: '#dc2626', bg: '#fef2f2' },
  default: { accent: '#3b82f6', icon: '#6b7280', bg: '#ffffff' },
  loading: { accent: '#3b82f6', icon: '#3b82f6', bg: '#eff6ff' },
};

const STYLES = `
  @keyframes toast-in   { from { opacity:0; transform:translateX(20px) scale(0.97); } to { opacity:1; transform:none; } }
  @keyframes toast-out  { from { opacity:1; transform:none; } to { opacity:0; transform:scale(0.95) translateY(4px); } }
  @keyframes toast-bar  { from { transform:scaleX(1); } to { transform:scaleX(0); } }
  @keyframes toast-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
`;

const ToastCard: React.FC<{ toast: ToastItem; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => {
  const userSettings = useAtomValue(userSettingsAtom);
  const status = toast.status ?? 'default';
  const c = COLORS[status];

  const duration = toast.undo
    ? (toast.undo.duration ??
      (userSettings?.email?.undo_send && userSettings.email.undo_send * 1000) ??
      5000)
    : Math.min(toast.duration ?? 3000, 3000);

  const [timeLeft, setTimeLeft] = React.useState(duration);
  const [undoVisible, setUndoVisible] = React.useState(!!toast.undo);

  React.useEffect(() => {
    if (!toast.undo) return;
    const iv = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1000) {
          clearInterval(iv);
          setUndoVisible(false);
          return 0;
        }
        return p - 1000;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [toast.undo]);

  const handleUndo = () => {
    toast.undo?.onClick();
    onRemove(toast.id);
  };

  return (
    <>
      <style>{STYLES}</style>
      <div
        style={{
          animation: toast.leaving
            ? 'toast-out 0.3s ease forwards'
            : 'toast-in 0.28s cubic-bezier(0.16,1,0.3,1)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: c.bg,
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 10,
          padding: '11px 12px 11px 0',
          boxShadow: '0 2px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxSizing: 'border-box',
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            flexShrink: 0,
            width: 3,
            alignSelf: 'stretch',
            borderRadius: '0 2px 2px 0',
            background: c.accent,
            marginRight: 2,
          }}
        />

        {/* Icon — spinner for loading, check for success, exclamation for error */}
        {status !== 'default' && (
          <div style={{ flexShrink: 0, color: c.icon, display: 'flex', alignItems: 'center' }}>
            {status === 'loading' ? (
              <div
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: '50%',
                  border: '2px solid #bfdbfe',
                  borderTopColor: '#3b82f6',
                  animation: 'toast-spin 0.7s linear infinite',
                  flexShrink: 0,
                }}
              />
            ) : status === 'success' ? (
              <FaRegCircleCheck size={15} />
            ) : (
              <FaCircleExclamation size={15} />
            )}
          </div>
        )}

        {/* Text */}
        <span
          style={{
            flex: 1,
            fontSize: 13.5,
            fontWeight: 450,
            lineHeight: 1.45,
            color: '#111',
            letterSpacing: '-0.01em',
            wordBreak: 'break-word',
          }}
        >
          {toast.description}
        </span>

        {/* Undo */}
        {toast.undo && undoVisible && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleUndo}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 6,
                padding: '4px 9px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              <FaRotateLeft size={11} />
              {toast.undo.label ?? 'Undo'}
            </button>

            <div style={{ position: 'relative', width: 26, height: 26, flexShrink: 0 }}>
              <svg
                width="26"
                height="26"
                viewBox="0 0 28 28"
                style={{ transform: 'rotate(-90deg)' }}
              >
                <circle cx="14" cy="14" r="11" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                <circle
                  cx="14"
                  cy="14"
                  r="11"
                  fill="none"
                  stroke={c.accent}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="69.1"
                  strokeDashoffset={69.1 - 69.1 * (timeLeft / duration)}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#374151',
                }}
              >
                {Math.ceil(timeLeft / 1000)}
              </span>
            </div>
          </div>
        )}

        {/* Close — hidden for loading toasts since they're dismissed programmatically */}
        {status !== 'loading' && (
          <button
            onClick={() => onRemove(toast.id)}
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              padding: 4,
              marginRight: 2,
              color: '#9ca3af',
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#374151';
              (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#9ca3af';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <FaRegCircleXmark size={15} />
          </button>
        )}

        {/* Progress bar — hidden for loading and undo toasts */}
        {!toast.undo && status !== 'loading' && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2.5,
              background: 'rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                height: '100%',
                background: c.accent,
                opacity: 0.6,
                transformOrigin: 'left',
                animation: `toast-bar ${duration}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
    </>
  );
};
