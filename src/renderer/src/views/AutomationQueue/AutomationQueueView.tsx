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
  RefreshCw,
} from 'lucide-react';
import { TaskQueueItem, TaskStatus } from '../../../../shared/types';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[rgba(91,145,255,0.18)]">
        <div>
          <h2 className="text-xl font-bold text-studio-100 flex items-center gap-2 tracking-tight">
            <ListTodo className="text-cyan-400 drop-shadow-[0_0_10px_#00C8FF]" size={22} />
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
            icon={isPaused ? <Play size={14} /> : <Pause size={14} className="text-cyan-400" />}
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
      <div className="flex bg-[#081633]/90 p-1 rounded-xl border border-[rgba(91,145,255,0.2)] text-xs w-fit shadow-subtle">
        {['all', 'running', 'pending', 'completed', 'failed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
              filterStatus === st
                ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white font-semibold shadow-[0_0_12px_rgba(8,123,255,0.4)]'
                : 'text-studio-400 hover:text-studio-100 hover:bg-[#102A50]/60'
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
                className="p-4 rounded-xl bg-[#081633]/80 border border-[rgba(91,145,255,0.18)] space-y-3 shadow-subtle"
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
