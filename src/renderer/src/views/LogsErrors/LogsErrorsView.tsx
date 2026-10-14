import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { FileText, Trash2, Download, RefreshCw, Terminal, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ActivityLog } from '../../../shared/types';

export const LogsErrorsView: React.FC = () => {
  const { addToast } = useAppStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async () => {
    setIsRefreshing(true);
    if (window.api) {
      const list = await window.api.getLogs(100, levelFilter === 'all' ? undefined : levelFilter);
      setLogs(list);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [levelFilter]);

  const handleClearLogs = async () => {
    if (window.api && window.confirm('Clear all activity logs?')) {
      await window.api.clearLogs();
      addToast({ type: 'info', title: 'Logs cleared' });
      fetchLogs();
    }
  };

  const handleExportLogs = async () => {
    if (window.api) {
      const logPath = await window.api.exportLogs();
      await window.api.revealInFileExplorer(logPath);
      addToast({ type: 'success', title: 'Log File Located', message: logPath });
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 select-none overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-xl font-bold text-studio-100 flex items-center gap-2">
            <FileText className="text-brand-400" size={22} />
            Application & Activity Logs
          </h2>
          <p className="text-xs text-studio-400 mt-1">
            Structured audit log of local operations, database migrations, video renders, and errors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportLogs}
          >
            Export Log File
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={handleClearLogs}
          >
            Clear
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
            onClick={fetchLogs}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-studio-850 p-1 rounded-xl border border-studio-800 text-xs w-fit">
          {['all', 'info', 'warn', 'error', 'debug'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                levelFilter === lvl ? 'bg-brand-500 text-white' : 'text-studio-400 hover:text-studio-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-studio-400">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Sensitive API Keys & Passwords Redacted</span>
        </div>
      </div>

      {/* Logs Console Box */}
      <Card>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-xs text-studio-500 font-mono">
            No log entries recorded for this filter.
          </div>
        ) : (
          <div className="space-y-2 font-mono text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-studio-900 border border-studio-800 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        log.level === 'error'
                          ? 'danger'
                          : log.level === 'warn'
                          ? 'warning'
                          : 'brand'
                      }
                      size="sm"
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className="text-studio-400 font-semibold">[{log.category}]</span>
                    <span className="text-studio-200 font-sans">{log.message}</span>
                  </div>

                  <span className="text-[10px] text-studio-500 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>

                {log.details && (
                  <pre className="text-[11px] text-studio-400 bg-studio-950 p-2 rounded border border-studio-800/80 overflow-x-auto mt-1 whitespace-pre-wrap">
                    {log.details}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
