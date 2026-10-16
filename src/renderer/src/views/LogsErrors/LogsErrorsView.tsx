import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { FileText, Trash2, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { ActivityLog } from '../../../../shared/types';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-studio-700/50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Application & Activity Logs
            </h2>
            <p className="text-xs text-studio-300 mt-0.5">
              Structured audit log of local operations, database migrations, video renders, and errors.
            </p>
          </div>
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

      {/* Filter Tabs & Security Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-studio-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-studio-700/60 text-xs w-fit shadow-md shadow-studio-950/30">
          {['all', 'info', 'warn', 'error', 'debug'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3.5 py-1.5 rounded-xl font-medium capitalize transition-all cursor-pointer ${
                levelFilter === lvl
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/25 font-semibold'
                  : 'text-studio-300 hover:text-white hover:bg-studio-800/50'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-studio-300 bg-studio-850/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-studio-700/60 shadow-sm">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Sensitive API Keys & Passwords Redacted</span>
        </div>
      </div>

      {/* Logs Console Box */}
      <Card className="glass-card rounded-2xl border-studio-700/60 shadow-xl overflow-hidden p-5">
        {logs.length === 0 ? (
          <div className="text-center py-16 text-xs text-studio-400 font-mono">
            No log entries recorded for this filter.
          </div>
        ) : (
          <div className="space-y-2.5 font-mono text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-studio-900/60 hover:bg-studio-900/90 border border-studio-700/40 backdrop-blur-sm transition-all flex flex-col gap-1.5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
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
                    <span className="text-cyan-400 font-semibold font-mono text-[11px]">[{log.category}]</span>
                    <span className="text-studio-100 font-sans text-xs">{log.message}</span>
                  </div>

                  <span className="text-[10px] text-studio-400 shrink-0 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>

                {log.details && (
                  <pre className="text-[11px] text-studio-300 bg-[#050B1F]/90 p-3 rounded-xl border border-studio-750/70 overflow-x-auto mt-1 whitespace-pre-wrap leading-relaxed shadow-inner">
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

