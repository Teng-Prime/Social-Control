import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  ListTodo,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { TaskQueueItem, TaskStatus } from '../../../shared/types';

export const AutomationQueueView: React.FC = () => {
  const { addToast } = useAppStore();
  const [tasks, setTasks] = useState<TaskQueueItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchQueue = async () => {
    setIsRefreshing(true);
    if (window.api) {
      const list = await window.api.getQueueItems({
        status: filterStatus === 'all' ? undefined : (filterStatus as TaskStatus),
      });
      setTasks(list);
      const paused = await window.api.isQueuePaused();
      setIsPaused(paused);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  const handleTogglePause = async () => {
    if (window.api) {
      if (isPaused) {
        await window.api.resumeQueue();
        setIsPaused(false);
        addToast({ type: 'info', title: 'Queue Resumed' });
      } else {
        await window.api.pauseQueue();
        setIsPaused(true);
        addToast({ type: 'warn', title: 'Queue Paused' });
      }
    }
  };

  const handleRetry = async (id: string) => {
    if (window.api) {
      await window.api.retryQueueItem(id);
      addToast({ type: 'success', title: 'Task Reset to Pending' });
      fetchQueue();
    }
  };

  const handleCancel = async (id: string) => {
    if (window.api) {
      await window.api.cancelQueueItem(id);
      addToast({ type: 'info', title: 'Task Cancelled' });
      fetchQueue();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 select-none overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-xl font-bold text-studio-100 flex items-center gap-2">
            <ListTodo className="text-brand-400" size={22} />
            Background Automation Queue
          </h2>
          <p className="text-xs text-studio-400 mt-1">
            Persistent async task processing across video rendering, file transfers, and publishing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={isPaused ? 'primary' : 'secondary'}
            size="sm"
            icon={isPaused ? <Play size={14} /> : <Pause size={14} />}
            onClick={handleTogglePause}
          >
            {isPaused ? 'Resume Queue' : 'Pause Queue'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
            onClick={fetchQueue}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-studio-850 p-1 rounded-xl border border-studio-800 text-xs w-fit">
        {['all', 'running', 'pending', 'completed', 'failed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
              filterStatus === st ? 'bg-brand-500 text-white' : 'text-studio-400 hover:text-studio-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <Card>
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-xs text-studio-500">
            No tasks in queue matching this status.
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-studio-900 border border-studio-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-studio-100">{task.title}</span>
                    <Badge
                      variant={
                        task.status === 'completed'
                          ? 'success'
                          : task.status === 'failed'
                          ? 'danger'
                          : task.status === 'running'
                          ? 'brand'
                          : 'neutral'
                      }
                      size="sm"
                      dot
                    >
                      {task.status}
                    </Badge>
                    <span className="text-[10px] font-mono text-studio-500 uppercase">{task.type}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {task.status === 'failed' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<RotateCcw size={12} />}
                        onClick={() => handleRetry(task.id)}
                      >
                        Retry
                      </Button>
                    )}
                    {task.status === 'pending' && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<XCircle size={12} />}
                        onClick={() => handleCancel(task.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress bar for running */}
                {task.status === 'running' && (
                  <div className="w-full h-1.5 bg-studio-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}

                {task.error && (
                  <p className="text-[11px] text-rose-400 font-mono bg-rose-950/20 p-2 rounded border border-rose-900/40">
                    {task.error}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] font-mono text-studio-500 pt-1 border-t border-studio-800/60">
                  <span>Created: {new Date(task.createdAt).toLocaleTimeString()}</span>
                  <span>
                    Retries: {task.retryCount} / {task.maxRetries}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
