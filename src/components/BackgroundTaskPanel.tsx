/**
 * Background Task Panel Component
 * 显示和管理后台任务的面板
 */

import React, { useState } from 'react';
import { useBackgroundTasks, BackgroundTask, TaskStatus } from '../hooks/useBackgroundTasks';
import { useI18n } from '../i18n/useI18n';

interface BackgroundTaskPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusColors: Record<TaskStatus, string> = {
  pending: 'text-yellow-600',
  running: 'text-blue-600',
  completed: 'text-green-600',
  failed: 'text-red-600',
  aborted: 'text-gray-600',
};

const formatDate = (timestamp: number, locale: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US');
};

export const BackgroundTaskPanel: React.FC<BackgroundTaskPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const { tasks, stats, deleteTask, abortTask, cleanupTasks } = useBackgroundTasks();
  const [selectedTask, setSelectedTask] = useState<BackgroundTask | null>(null);

  if (!isOpen) return null;

  const handleAbort = async (taskId: string) => {
    if (window.confirm(t('confirmAbortTask'))) {
      try {
        await abortTask(taskId);
      } catch (error: any) {
        alert(`${t('abortTaskFailed')}: ${error.message}`);
      }
    }
  };

  const handleDelete = async (taskId: string) => {
    if (window.confirm(t('confirmDeleteTask'))) {
      await deleteTask(taskId);
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    }
  };

  const handleCleanup = async () => {
    if (window.confirm(t('confirmCleanupTasks'))) {
      await cleanupTasks(50);
    }
  };

  const getStatusLabel = (status: TaskStatus): string => {
    switch (status) {
      case 'pending': return t('pending');
      case 'running': return t('running');
      case 'completed': return t('completed');
      case 'failed': return t('failed');
      case 'aborted': return t('aborted');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[600px] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{t('backgroundTaskManagement')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 border-b">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
            <div className="text-sm text-gray-500">{t('totalTasks')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
            <div className="text-sm text-gray-500">{t('running')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">{t('completed')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-500">{t('failed')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.aborted}</div>
            <div className="text-sm text-gray-500">{t('aborted')}</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Task List */}
          <div className="w-1/2 border-r overflow-y-auto">
            <div className="p-4 space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center text-gray-500 py-8">{t('noTasks')}</div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTask?.id === task.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 flex-1">{task.title}</h3>
                      <span className={`text-sm font-medium ${statusColors[task.status]}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      {t('createdAt')}: {formatDate(task.createdAt, t('memory'))}
                    </div>
                    {task.status === 'running' && task.progress !== undefined && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Task Detail */}
          <div className="w-1/2 overflow-y-auto">
            {selectedTask ? (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">{selectedTask.title}</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('status')}
                    </label>
                    <span className={`inline-flex px-2 py-1 rounded text-sm font-medium ${
                      selectedTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedTask.status === 'failed' ? 'bg-red-100 text-red-800' :
                      selectedTask.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusLabel(selectedTask.status)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('createdAt')}
                    </label>
                    <div className="text-sm text-gray-600">
                      {formatDate(selectedTask.createdAt, t('memory'))}
                    </div>
                  </div>

                  {selectedTask.updatedAt !== selectedTask.createdAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('updatedAt')}
                      </label>
                      <div className="text-sm text-gray-600">
                        {formatDate(selectedTask.updatedAt, t('memory'))}
                      </div>
                    </div>
                  )}

                  {selectedTask.completedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('completedAt')}
                      </label>
                      <div className="text-sm text-gray-600">
                        {formatDate(selectedTask.completedAt, t('memory'))}
                      </div>
                    </div>
                  )}

                  {selectedTask.status === 'running' && selectedTask.progress !== undefined && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('progress')}
                      </label>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${selectedTask.progress}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{selectedTask.progress}%</div>
                    </div>
                  )}

                  {selectedTask.error && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('errorMessage')}
                      </label>
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {selectedTask.error}
                      </div>
                    </div>
                  )}

                  {selectedTask.result && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('result')}
                      </label>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 max-h-60 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{selectedTask.result}</pre>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    {selectedTask.status === 'running' && (
                      <button
                        onClick={() => handleAbort(selectedTask.id)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                      >
                        {t('abortTask')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selectedTask.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      {t('deleteTask')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {t('selectTask')}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center">
          <button
            onClick={handleCleanup}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm"
          >
            {t('cleanupOldTasks')}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
