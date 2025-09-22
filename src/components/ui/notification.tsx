"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const notificationStyles = {
  success: {
    container: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
    title: "text-green-900 dark:text-green-100",
    message: "text-green-700 dark:text-green-300",
    IconComponent: CheckCircle,
  },
  error: {
    container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    title: "text-red-900 dark:text-red-100",
    message: "text-red-700 dark:text-red-300",
    IconComponent: AlertCircle,
  },
  warning: {
    container: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-100",
    message: "text-amber-700 dark:text-amber-300",
    IconComponent: AlertTriangle,
  },
  info: {
    container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    title: "text-blue-900 dark:text-blue-100",
    message: "text-blue-700 dark:text-blue-300",
    IconComponent: Info,
  },
};

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const styles = notificationStyles[notification.type];
  const Icon = styles.IconComponent;

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  }, [onDismiss, notification.id]);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, handleDismiss]);

  return (
    <div
      className={cn(
        "transform transition-all duration-300 ease-in-out",
        isVisible
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-full opacity-0 scale-95"
      )}
    >
      <div
        className={cn(
          "relative p-4 rounded-lg border shadow-lg backdrop-blur-sm",
          styles.container
        )}
      >
        <div className="flex items-start gap-3">
          <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", styles.icon)} />
          <div className="flex-1 min-w-0">
            <h4 className={cn("font-medium text-sm", styles.title)}>
              {notification.title}
            </h4>
            {notification.message && (
              <p className={cn("text-sm mt-1", styles.message)}>
                {notification.message}
              </p>
            )}
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className={cn(
                  "text-sm font-medium underline mt-2 hover:no-underline",
                  styles.title
                )}
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className={cn(
              "p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
              styles.icon
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface NotificationContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationContainer({ notifications, onDismiss }: NotificationContainerProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

// Notification Manager Hook
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification,
    };

    setNotifications((prev) => [...prev, newNotification]);
    return id;
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Convenience methods
  const showSuccess = (title: string, message?: string) =>
    addNotification({ type: "success", title, message });

  const showError = (title: string, message?: string) =>
    addNotification({ type: "error", title, message, duration: 8000 });

  const showWarning = (title: string, message?: string) =>
    addNotification({ type: "warning", title, message });

  const showInfo = (title: string, message?: string) =>
    addNotification({ type: "info", title, message });

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}