import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Video,
  Clock,
} from 'lucide-react';
import { PublishJob } from '../../../shared/types';

export const ContentCalendarView: React.FC = () => {
  const { setCurrentSection } = useAppStore();
  const [publishJobs, setPublishJobs] = useState<PublishJob[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (window.api) {
      window.api.getPublishJobs().then(setPublishJobs);
    }
  }, []);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate days in month grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 select-none overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-studio-800">
        <div>
          <h2 className="text-xl font-bold text-studio-100 flex items-center gap-2">
            <CalendarIcon className="text-brand-400" size={22} />
            Content Calendar & Schedule
          </h2>
          <p className="text-xs text-studio-400 mt-1">
            Visual schedule of upcoming posts, published stories, and planned releases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-studio-850 p-1 rounded-xl border border-studio-800 text-xs">
            {['all', 'youtube', 'tiktok', 'facebook'].map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                  platformFilter === p ? 'bg-brand-500 text-white' : 'text-studio-400 hover:text-studio-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setCurrentSection('publish-center')}
          >
            Schedule Post
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between p-4 bg-studio-850 rounded-xl border border-studio-800">
        <h3 className="font-bold text-base text-studio-100">
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg bg-studio-800 hover:bg-studio-750 text-studio-300"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 rounded-lg bg-studio-800 hover:bg-studio-750 text-xs text-studio-300 font-medium"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg bg-studio-800 hover:bg-studio-750 text-studio-300"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-studio-850 rounded-2xl border border-studio-800 overflow-hidden shadow-subtle">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-studio-800 bg-studio-900 text-center text-xs font-semibold text-studio-400 py-3">
          {daysOfWeek.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-studio-800/80">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] bg-studio-950/40 p-2" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isToday =
              dayNum === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            // Find jobs for this day
            const dayJobs = publishJobs.filter((j) => {
              const d = new Date(j.scheduledFor || j.createdAt);
              return (
                d.getDate() === dayNum &&
                d.getMonth() === month &&
                d.getFullYear() === year &&
                (platformFilter === 'all' || j.platform === platformFilter)
              );
            });

            return (
              <div
                key={`day-${dayNum}`}
                className={`min-h-[105px] p-2 flex flex-col justify-between hover:bg-studio-800/40 transition-colors ${
                  isToday ? 'bg-brand-500/10' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center'
                        : 'text-studio-400'
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>

                <div className="space-y-1 mt-1">
                  {dayJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setCurrentSection('publish-center')}
                      className="p-1 rounded bg-studio-800/90 border border-studio-700/80 text-[10px] truncate cursor-pointer hover:border-brand-400"
                    >
                      <span className="font-semibold text-studio-200 capitalize">[{job.platform}]</span>{' '}
                      <span className="text-studio-300">{job.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
