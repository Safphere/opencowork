/**
 * React Hook for Background Task Management
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '../services/logger';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'aborted';

export interface BackgroundTask {
  id: string;
  sessionId: string;
  title: string;
  status: TaskStatus;
  messages: any[];
  result?: string;
  error?: string;
  progress?: number; // 0-100
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface BackgroundTaskStats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  aborted: number;
}

export function useBackgroundTasks() {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [stats, setStats] = useState<BackgroundTaskStats>({
    total: 0,
    running: 0,
    completed: 0,
    failed: 0,
    aborted: 0,
  });

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      const result = await window.ipcRenderer.invoke('background-task:list') as BackgroundTask[];
      setTasks(result || []);
    } catch (error) {
      logger.error('Failed to load background tasks:', error);
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const result = await window.ipcRenderer.invoke('background-task:stats') as BackgroundTaskStats;
      setStats(result || { total: 0, running: 0, completed: 0, failed: 0, aborted: 0 });
    } catch (error) {
      logger.error('Failed to load background task stats:', error);
    }
  }, []);

  // Start a new background task
  const startBackgroundTask = useCallback(async (taskTitle: string, messages: any[]) => {
    try {
      const currentSession = await window.ipcRenderer.invoke('session:current') as { id: string } | null;
      const sessionId = currentSession?.id;

      const result = await window.ipcRenderer.invoke('background-task:start', {
        sessionId,
        taskTitle,
        messages,
      }) as { success: boolean; taskId?: string; error?: string };

      if (result.success && result.taskId) {
        // Reload tasks to get the new task
        await loadTasks();
        return result.taskId;
      } else {
        throw new Error(result.error || 'Failed to start background task');
      }
    } catch (error: any) {
      logger.error('Failed to start background task:', error);
      throw error;
    }
  }, [loadTasks]);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await window.ipcRenderer.invoke('background-task:delete', taskId);
      await loadTasks();
    } catch (error) {
      logger.error('Failed to delete task:', error);
    }
  }, [loadTasks]);

  // Abort a running task
  const abortTask = useCallback(async (taskId: string) => {
    try {
      const result = await window.ipcRenderer.invoke('background-task:abort', taskId) as { success: boolean; error?: string };
      if (result.success) {
        await loadTasks();
      } else {
        throw new Error(result.error || 'Failed to abort task');
      }
    } catch (error: any) {
      logger.error('Failed to abort task:', error);
      throw error;
    }
  }, [loadTasks]);

  // Cleanup old tasks
  const cleanupTasks = useCallback(async (keepCount: number = 50) => {
    try {
      await window.ipcRenderer.invoke('background-task:cleanup', keepCount);
      await loadTasks();
    } catch (error) {
      logger.error('Failed to cleanup tasks:', error);
    }
  }, [loadTasks]);

  // Get task by ID
  const getTask = useCallback(async (taskId: string) => {
    try {
      const result = await window.ipcRenderer.invoke('background-task:get', taskId) as BackgroundTask | null;
      return result;
    } catch (error) {
      logger.error('Failed to get task:', error);
      return null;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTasks();
    loadStats();
  }, [loadTasks, loadStats]);

  // Listen for task updates
  useEffect(() => {
    const unsubscribe = window.ipcRenderer.on('background-task:update', (_event: any, ...args: unknown[]) => {
      const task = args[0] as BackgroundTask;
      setTasks((prevTasks) => {
        const index = prevTasks.findIndex((t) => t.id === task.id);
        if (index >= 0) {
          const newTasks = [...prevTasks];
          newTasks[index] = task;
          return newTasks;
        } else {
          return [task, ...prevTasks];
        }
      });
      loadStats();
    });

    const unsubscribeComplete = window.ipcRenderer.on('background-task:complete', (_event: any, ...args: unknown[]) => {
      const task = args[0] as BackgroundTask;
      setTasks((prevTasks) => {
        const index = prevTasks.findIndex((t) => t.id === task.id);
        if (index >= 0) {
          const newTasks = [...prevTasks];
          newTasks[index] = task;
          return newTasks;
        } else {
          return [task, ...prevTasks];
        }
      });
      loadStats();

      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('后台任务完成', {
          body: `任务 "${task.title}" 已完成`,
          icon: '/icon.png',
        });
      }
    });

    const unsubscribeFailed = window.ipcRenderer.on('background-task:failed', (_event: any, ...args: unknown[]) => {
      const task = args[0] as BackgroundTask;
      setTasks((prevTasks) => {
        const index = prevTasks.findIndex((t) => t.id === task.id);
        if (index >= 0) {
          const newTasks = [...prevTasks];
          newTasks[index] = task;
          return newTasks;
        } else {
          return [task, ...prevTasks];
        }
      });
      loadStats();

      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('后台任务失败', {
          body: `任务 "${task.title}" 失败: ${task.error}`,
          icon: '/icon.png',
        });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeComplete();
      unsubscribeFailed();
    };
  }, [loadStats]);

  return {
    tasks,
    stats,
    loadTasks,
    loadStats,
    startBackgroundTask,
    deleteTask,
    abortTask,
    cleanupTasks,
    getTask,
  };
}
