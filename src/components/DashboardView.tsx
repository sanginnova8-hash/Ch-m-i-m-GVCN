import React, { useState, useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  Award,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatVietnameseDate, formatVietnameseNumber, getRankBadgeClass } from '../lib/utils';
import { TabType } from './Navbar';

interface DashboardViewProps {
  onNavigateTab: (tab: TabType) => void;
  onSelectStudentForReport?: (studentId: string) => void;
  onOpenNewLogModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onSelectStudentForReport,
  onOpenNewLogModal,
}) => {
  const { classConfig, students, disciplineLogs, getWeeklySummary, getMonthlySummary } = useApp();

  // State for filters
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [viewScope, setViewScope] = useState<'week' | 'month'>('week');

  // Month & Week options
  const availableWeeksForMonth = useMemo(() => {
    return classConfig.weeks.filter((w) => w.month === selectedMonth);
  }, [classConfig.weeks, selectedMonth]);

  // If selected week is not in the month, default to first week of that month
  React.useEffect(() => {
    if (availableWeeksForMonth.length > 0 && !availableWeeksForMonth.some((w) => w.weekNumber === selectedWeek)) {
      setSelectedWeek(availableWeeksForMonth[0].weekNumber);
    }
  }, [selectedMonth, availableWeeksForMonth, selectedWeek]);

  // Active students
  const activeStudents = useMemo(() => students.filter((s) => s.status === 'active'), [students]);
  const totalStudentsCount = students.length;

  // Summaries based on scope
  const weeklyData = useMemo(() => {
    return getWeeklySummary(selectedWeek, selectedMonth);
  }, [getWeeklySummary, selectedWeek, selectedMonth]);

  const monthlyData = useMemo(() => {
    return getMonthlySummary(selectedMonth);
  }, [getMonthlySummary, selectedMonth]);

  const activeData = viewScope === 'week' ? weeklyData : monthlyData;

  // Calculations for cards
  const stats = useMemo(() => {
    const totalDeduct = activeData.reduce((acc, curr) => acc + curr.totalDeduct, 0);
    const totalBonus = activeData.reduce((acc, curr) => acc + curr.totalBonus, 0);
    const totalViolations = activeData.reduce((acc, curr) => acc + curr.violationCount, 0);
    const totalBonusCount = activeData.reduce((acc, curr) => acc + (curr.bonusCount || 0), 0);

    const scores = activeData.map((d) => d.finalScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 10;
    const above8Count = activeData.filter((d) => d.finalScore >= 8).length;
    const above8Rate = activeData.length > 0 ? (above8Count / activeData.length) * 100 : 0;

    // Ranks breakdown
    const ranks = {
      'Xuất sắc': activeData.filter((d) => d.rank === 'Xuất sắc').length,
      'Tốt': activeData.filter((d) => d.rank === 'Tốt').length,
      'Khá': activeData.filter((d) => d.rank === 'Khá').length,
      'Trung bình': activeData.filter((d) => d.rank === 'Trung bình').length,
      'Yếu': activeData.filter((d) => d.rank === 'Yếu').length,
    };

    return {
      totalDeduct: Math.round(totalDeduct * 100) / 100,
      totalBonus: Math.round(totalBonus * 100) / 100,
      totalViolations,
      totalBonusCount,
      avgScore: Math.round(avgScore * 100) / 100,
      above8Rate: Math.round(above8Rate),
      ranks,
    };
  }, [activeData]);

  // Students needing attention (score < 7.5 or violations >= 2)
  const studentsNeedingAttention = useMemo(() => {
    return activeData
      .filter((d) => d.finalScore < 7.5 || d.violationCount >= 2)
      .sort((a, b) => a.finalScore - b.finalScore);
  }, [activeData]);

  // Recent 6 logs in the system
  const recentLogs = useMemo(() => {
    return [...disciplineLogs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [disciplineLogs]);

  // Trend data across 4 weeks of selected month
  const trendData = useMemo(() => {
    return availableWeeksForMonth.map((w) => {
      const wData = getWeeklySummary(w.weekNumber, selectedMonth);
      const totalScore = wData.reduce((acc, curr) => acc + curr.finalScore, 0);
      const avg = wData.length > 0 ? Math.round((totalScore / wData.length) * 10) / 10 : 10;
      const vCount = wData.reduce((acc, curr) => acc + curr.violationCount, 0);
      const bCount = wData.reduce((acc, curr) => acc + curr.bonusCount, 0);
      return {
        weekNumber: w.weekNumber,
        title: `Tuần ${w.weekNumber}`,
        avgScore: avg,
        violations: vCount,
        bonuses: bCount,
      };
    });
  }, [availableWeeksForMonth, getWeeklySummary, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Row */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Bảng Điều Khiển Nề Nếp & Thi Đua
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lớp {classConfig.className} • Năm học {classConfig.schoolYear} • GVCN: {classConfig.homeroomTeacher}
                </p>
              </div>
            </div>
          </div>

          {/* Scope & Period Selectors */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Scope Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setViewScope('week')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewScope === 'week'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Theo tuần
              </button>
              <button
                onClick={() => setViewScope('month')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewScope === 'month'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Theo tháng
              </button>
            </div>

            {/* Select Month */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <label htmlFor="month-select" className="text-xs text-slate-500 font-medium">Tháng:</label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {classConfig.months.map((m) => (
                  <option key={m} value={m} className="dark:bg-slate-800">
                    Tháng {m} {m >= 9 ? '(Kỳ 1)' : '(Kỳ 2)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Week (if week scope) */}
            {viewScope === 'week' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <label htmlFor="week-select" className="text-xs text-slate-500 font-medium">Tuần:</label>
                <select
                  id="week-select"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  {availableWeeksForMonth.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber} className="dark:bg-slate-800">
                      Tuần {w.weekNumber} ({formatVietnameseDate(w.startDate).slice(0, 5)} - {formatVietnameseDate(w.endDate).slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Sĩ số */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sĩ số lớp</span>
            <span className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {activeStudents.length}
            </span>
            <span className="text-xs text-slate-500">/{totalStudentsCount} học sinh</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            100% học sinh được theo dõi
          </p>
        </div>

        {/* Vi phạm & Điểm trừ */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Vi phạm & Điểm trừ</span>
            <span className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">
              -{formatVietnameseNumber(stats.totalDeduct)}
            </span>
            <span className="text-xs text-slate-500">điểm</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats.totalViolations} lượt vi phạm ghi nhận
          </p>
        </div>

        {/* Khen thưởng & Điểm cộng */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Khen thưởng & Điểm cộng</span>
            <span className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              +{formatVietnameseNumber(stats.totalBonus)}
            </span>
            <span className="text-xs text-slate-500">điểm</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats.totalBonusCount} lượt việc tốt, thi đua
          </p>
        </div>

        {/* Điểm trung bình lớp */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Điểm TB Lớp</span>
            <span className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Award className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatVietnameseNumber(stats.avgScore)}
            </span>
            <span className="text-xs text-slate-500">/ 10</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Điểm nền: 10,0 điểm
          </p>
        </div>

        {/* Tỷ lệ >= 8.0 */}
        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Đạt từ 8,0đ (Tốt/XS)</span>
            <span className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.above8Rate}%
            </span>
            <span className="text-xs text-slate-500">tổng số</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {stats.ranks['Xuất sắc'] + stats.ranks['Tốt']} học sinh
          </p>
        </div>
      </div>

      {/* Middle Row: Rank Breakdown & Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phân bố xếp loại */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Phân Bố Xếp Loại ({viewScope === 'week' ? `Tuần ${selectedWeek}` : `Tháng ${selectedMonth}`})</span>
            <span className="text-xs font-normal text-slate-500 lowercase">{activeData.length} học sinh</span>
          </h3>

          <div className="space-y-3.5">
            {[
              { label: 'Xuất sắc (9.0 - 10)', key: 'Xuất sắc', color: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
              { label: 'Tốt (8.0 - 8.9)', key: 'Tốt', color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400' },
              { label: 'Khá (7.0 - 7.9)', key: 'Khá', color: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
              { label: 'Trung bình (5.0 - 6.9)', key: 'Trung bình', color: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400' },
              { label: 'Yếu (< 5.0)', key: 'Yếu', color: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400' },
            ].map((r) => {
              const count = stats.ranks[r.key as keyof typeof stats.ranks] || 0;
              const percent = activeData.length > 0 ? Math.round((count / activeData.length) * 100) : 0;
              return (
                <div key={r.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{r.label}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {count} HS <span className="font-normal text-slate-400">({percent}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${r.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
            <span className="text-slate-500">Quy tắc tính điểm:</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">10 - Điểm trừ + Điểm cộng (0..10)</span>
          </div>
        </div>

        {/* Biểu đồ xu hướng qua các tuần của tháng */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Xu Hướng Nề Nếp Tháng {selectedMonth}
              </h3>
              <p className="text-xs text-slate-500">Điểm trung bình và số lượt vi phạm qua các tuần</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />
                Điểm TB
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block" />
                Lượt vi phạm
              </span>
            </div>
          </div>

          {/* SVG Trend Graph */}
          <div className="relative h-52 w-full pt-4">
            <div className="grid grid-cols-4 h-36 border-b border-slate-200 dark:border-slate-700">
              {trendData.map((item, idx) => (
                <div key={item.weekNumber} className="flex flex-col items-center justify-end h-full relative group">
                  {/* Score bar */}
                  <div className="w-12 sm:w-16 bg-blue-50 dark:bg-blue-950/40 rounded-t-lg relative flex flex-col items-center justify-end transition-all group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40"
                       style={{ height: `${(item.avgScore / 10) * 100}%` }}>
                    <span className="absolute -top-6 text-xs font-bold text-blue-600 dark:text-blue-400">
                      {formatVietnameseNumber(item.avgScore)}
                    </span>
                    {/* Small violation bubble */}
                    {item.violations > 0 && (
                      <span className="mb-2 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                        {item.violations} lỗi
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* X-axis labels */}
            <div className="grid grid-cols-4 text-center mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              {trendData.map((item) => (
                <div key={item.weekNumber} className="cursor-pointer hover:text-blue-600" onClick={() => { setSelectedWeek(item.weekNumber); setViewScope('week'); }}>
                  {item.title}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end">
            <button
              onClick={() => onNavigateTab('weekly')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Xem bảng tổng kết tuần chi tiết</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Students needing attention & Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Học sinh cần lưu ý */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Học Sinh Cần Giáo Viên Lưu Ý
                </h3>
                <p className="text-xs text-slate-500">Điểm rèn luyện thấp hoặc vi phạm lặp lại</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-full">
              {studentsNeedingAttention.length} học sinh
            </span>
          </div>

          {studentsNeedingAttention.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-750/50 rounded-xl">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Lớp thực hiện nề nếp rất tốt!
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Không có học sinh nào bị cảnh báo trong thời gian này.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {studentsNeedingAttention.map((s) => {
                const rankBadge = getRankBadgeClass(s.rank);
                return (
                  <div
                    key={s.studentId}
                    className="p-3 bg-slate-50 dark:bg-slate-750/60 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 hover:bg-slate-100 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {s.fullName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {s.studentCode}
                        </span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${rankBadge.bg} ${rankBadge.text} ${rankBadge.border}`}>
                          {s.rank}
                        </span>
                      </div>
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5 font-medium">
                        {s.notes || `${s.violationCount} lượt vi phạm`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatVietnameseNumber(s.finalScore)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">điểm</span>
                      </div>
                      <button
                        onClick={() => {
                          if (onSelectStudentForReport) onSelectStudentForReport(s.studentId);
                          onNavigateTab('parent-report');
                        }}
                        className="p-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                        title="Tạo tin nhắn báo phụ huynh"
                      >
                        Báo PH
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nhật ký ghi nhận gần nhất */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Nhật Ký Ghi Nhận Mới Nhất
            </h3>
            <button
              onClick={() => onNavigateTab('daily-log')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recentLogs.map((log) => {
              const isDeduct = log.type === 'deduct';
              return (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 dark:bg-slate-750/50 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {log.studentName}
                      </span>
                      <span className="text-slate-400 font-mono">({log.studentCode})</span>
                      <span className="text-[10px] text-slate-400">
                        {formatVietnameseDate(log.date)} • Tuần {log.weekNumber}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 line-clamp-1">
                      <strong className="font-medium text-slate-900 dark:text-white">[{log.behaviorCode}]</strong>{' '}
                      {log.behaviorDescription}
                    </p>
                  </div>

                  <div className="text-right whitespace-nowrap">
                    <span
                      className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                        isDeduct
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      }`}
                    >
                      {isDeduct ? '-' : '+'}
                      {formatVietnameseNumber(log.totalScore)}đ
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {log.count > 1 ? `${log.count} lần` : (log.periodOrTime || 'Ghi nhận')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <span className="text-xs text-slate-400">Tổng cộng {disciplineLogs.length} bản ghi</span>
            <button
              onClick={onOpenNewLogModal}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              + Thêm ghi nhận mới
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
