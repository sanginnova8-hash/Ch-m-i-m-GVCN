import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Download,
  Printer,
  Award,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Zap,
  CheckCircle2,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDown01,
  ArrowUp10,
  Edit3,
  Search,
  Trash2,
  Share2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DisciplineLog } from '../types';
import {
  formatVietnameseDate,
  formatVietnameseNumber,
  getRankBadgeClass,
  exportToExcel,
  compareVietnameseNames,
  compareStudentCodes,
} from '../lib/utils';
import { TabType } from './Navbar';
import { SummaryZaloExportModal } from './SummaryZaloExportModal';

interface MonthlySummaryViewProps {
  onNavigateTab: (tab: TabType) => void;
  onSelectStudentForReport?: (studentId: string) => void;
}

export const MonthlySummaryView: React.FC<MonthlySummaryViewProps> = ({
  onNavigateTab,
  onSelectStudentForReport,
}) => {
  const {
    classConfig,
    students,
    disciplineLogs,
    getMonthlySummary,
    awardAchievementBonus,
    batchAwardAchievementBonus,
    updateDisciplineLog,
    deleteDisciplineLog,
  } = useApp();

  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [isZaloModalOpen, setIsZaloModalOpen] = useState<boolean>(false);

  // Modals for monthly achievement awards
  const [isAutoMonthlyAwardModalOpen, setIsAutoMonthlyAwardModalOpen] = useState(false);
  const [isCustomMonthlyAwardModalOpen, setIsCustomMonthlyAwardModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [customScoreInput, setCustomScoreInput] = useState<number>(2.0);
  const [customNoteInput, setCustomNoteInput] = useState<string>('');
  const [awardingResult, setAwardingResult] = useState<string | null>(null);

  // Management modal for editing and deleting monthly bonus points
  const [isManageBonusesModalOpen, setIsManageBonusesModalOpen] = useState(false);
  const [manageBonusSearch, setManageBonusSearch] = useState('');
  const [manageBonusFilterType, setManageBonusFilterType] = useState<'all' | 'achievement' | 'regular'>('all');
  const [manageStudentFilter, setManageStudentFilter] = useState<string>('all');
  const [editingBonusLog, setEditingBonusLog] = useState<{
    id: string;
    studentName: string;
    studentCode: string;
    score: number;
    title: string;
    note: string;
    isAchievement: boolean;
  } | null>(null);
  const [deletingBonusLog, setDeletingBonusLog] = useState<{
    id: string;
    studentName: string;
    score: number;
    title: string;
  } | null>(null);

  // Weeks belonging to selected month
  const monthWeeks = useMemo(() => {
    return classConfig.weeks.filter((w) => w.month === selectedMonth);
  }, [classConfig.weeks, selectedMonth]);

  // Monthly achievement rules
  const monthlyRules = useMemo(() => {
    return (classConfig.achievementBonusRules || []).filter(
      (r) => r.period === 'monthly' && r.isActive
    );
  }, [classConfig.achievementBonusRules]);

  // Derived monthly summaries from source logs
  const monthlyData = useMemo(() => {
    return getMonthlySummary(selectedMonth);
  }, [getMonthlySummary, selectedMonth]);

  // Sorting state for monthly table
  const [sortField, setSortField] = useState<'score' | 'name' | 'code'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSortChange = (field: 'score' | 'name' | 'code') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'score' ? 'desc' : 'asc');
    }
  };

  // Filtered and sorted
  const filteredData = useMemo(() => {
    let list = monthlyData;
    if (rankFilter !== 'all') {
      list = monthlyData.filter((d) => d.rank === rankFilter);
    }

    return [...list].sort((a, b) => {
      if (sortField === 'name') {
        return compareVietnameseNames(a, b, sortDirection);
      }
      if (sortField === 'code') {
        return compareStudentCodes(a.studentCode, b.studentCode, sortDirection);
      }
      // sortField === 'score'
      const diff = b.finalScore - a.finalScore;
      if (diff !== 0) return sortDirection === 'desc' ? diff : -diff;
      return compareVietnameseNames(a, b, 'asc');
    });
  }, [monthlyData, rankFilter, sortField, sortDirection]);

  // Zero-violation rule for the month
  const zeroViolationMonthlyRule = useMemo(() => {
    return (
      monthlyRules.find((r) => r.code === 'TT_M01' || r.isAutoEligible) ||
      monthlyRules[0]
    );
  }, [monthlyRules]);

  // Students with 0 violations in the whole month who haven't received TT_M01 yet
  const eligibleZeroViolationStudents = useMemo(() => {
    if (!zeroViolationMonthlyRule) return [];
    return monthlyData.filter((s) => {
      if (s.violationCount > 0) return false;
      const hasReceived = disciplineLogs.some(
        (l) =>
          l.studentId === s.studentId &&
          l.month === selectedMonth &&
          l.behaviorCode === zeroViolationMonthlyRule.code
      );
      return !hasReceived;
    });
  }, [monthlyData, zeroViolationMonthlyRule, disciplineLogs, selectedMonth]);

  // Overall monthly stats
  const stats = useMemo(() => {
    const totalDeduct = monthlyData.reduce((acc, curr) => acc + curr.totalDeduct, 0);
    const totalBonus = monthlyData.reduce((acc, curr) => acc + curr.totalBonus, 0);
    const totalAchievementBonus = monthlyData.reduce(
      (acc, curr) => acc + (curr.achievementBonus || 0),
      0
    );
    const totalViolations = monthlyData.reduce((acc, curr) => acc + curr.violationCount, 0);
    const totalBonuses = monthlyData.reduce((acc, curr) => acc + curr.bonusCount, 0);
    const totalAwardedStudents = monthlyData.filter((s) => (s.achievementCount || 0) > 0).length;

    const scores = monthlyData.map((d) => d.finalScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 10;
    const above8Count = monthlyData.filter((d) => d.finalScore >= 8).length;
    const above8Rate = monthlyData.length > 0 ? (above8Count / monthlyData.length) * 100 : 0;

    const ranks = {
      'Xuất sắc': monthlyData.filter((d) => d.rank === 'Xuất sắc').length,
      'Tốt': monthlyData.filter((d) => d.rank === 'Tốt').length,
      'Khá': monthlyData.filter((d) => d.rank === 'Khá').length,
      'Trung bình': monthlyData.filter((d) => d.rank === 'Trung bình').length,
      'Yếu': monthlyData.filter((d) => d.rank === 'Yếu').length,
    };

    return {
      totalDeduct: Math.round(totalDeduct * 100) / 100,
      totalBonus: Math.round(totalBonus * 100) / 100,
      totalAchievementBonus: Math.round(totalAchievementBonus * 100) / 100,
      totalViolations,
      totalBonuses,
      totalAwardedStudents,
      avgScore: Math.round(avgScore * 100) / 100,
      above8Rate: Math.round(above8Rate),
      ranks,
    };
  }, [monthlyData]);

  // Confirm Auto Monthly Award
  const handleConfirmAutoMonthlyAward = async () => {
    if (!zeroViolationMonthlyRule || eligibleZeroViolationStudents.length === 0) return;
    const ids = eligibleZeroViolationStudents.map((s) => s.studentId);
    const res = await batchAwardAchievementBonus({
      studentIds: ids,
      rule: zeroViolationMonthlyRule,
      month: selectedMonth,
      customNote: `Tháng ${selectedMonth} nề nếp gương mẫu (0 lỗi vi phạm)`,
    });

    setIsAutoMonthlyAwardModalOpen(false);
    setAwardingResult(
      `Đã trao thưởng thành tích tháng cho ${res.awardedCount} học sinh gương mẫu (+${zeroViolationMonthlyRule.bonusScore}đ)!`
    );
    setTimeout(() => setAwardingResult(null), 4000);
  };

  // Confirm Custom Monthly Award
  const handleConfirmCustomMonthlyAward = async () => {
    if (!selectedStudentId) {
      alert('Vui lòng chọn học sinh được khen thưởng');
      return;
    }
    const rule = monthlyRules.find((r) => r.id === selectedRuleId);

    const res = await awardAchievementBonus({
      studentId: selectedStudentId,
      rule,
      month: selectedMonth,
      customScore: Number(customScoreInput) || 2.0,
      customNote: customNoteInput.trim() || undefined,
    });

    if (res.alreadyAwarded && rule) {
      alert(`Học sinh này đã được trao thưởng quy chế "${rule.title}" trong tháng ${selectedMonth}.`);
      return;
    }

    setIsCustomMonthlyAwardModalOpen(false);
    setSelectedStudentId('');
    setSelectedRuleId('');
    setCustomNoteInput('');
    const awardedTitle = rule ? rule.title : (customNoteInput.trim() || `Thành tích tháng ${selectedMonth}`);
    setAwardingResult(`Đã trao thưởng thành tích tháng "${awardedTitle}" (+${customScoreInput}đ) thành công!`);
    setTimeout(() => setAwardingResult(null), 4000);
  };

  // All bonus logs for the selected month
  const monthlyBonusLogs = useMemo(() => {
    return disciplineLogs.filter(
      (l) => l.month === selectedMonth && l.type === 'bonus'
    );
  }, [disciplineLogs, selectedMonth]);

  // Students with bonus in this month for filtering
  const studentsWithMonthlyBonus = useMemo(() => {
    const studentIds = new Set(monthlyBonusLogs.map((l) => l.studentId));
    return students.filter((s) => studentIds.has(s.id));
  }, [monthlyBonusLogs, students]);

  // Filtered monthly bonus logs for the management modal
  const filteredBonusLogs = useMemo(() => {
    return monthlyBonusLogs.filter((log) => {
      // Filter by student
      if (manageStudentFilter !== 'all' && log.studentId !== manageStudentFilter) {
        return false;
      }
      // Filter by type
      const isAch =
        log.behaviorCode.startsWith('TT_') ||
        log.behaviorDescription.includes('[Thành tích');
      if (manageBonusFilterType === 'achievement' && !isAch) return false;
      if (manageBonusFilterType === 'regular' && isAch) return false;

      // Filter by search keyword
      if (manageBonusSearch.trim()) {
        const query = manageBonusSearch.toLowerCase().trim();
        const matchesName = log.studentName.toLowerCase().includes(query);
        const matchesCode = log.studentCode.toLowerCase().includes(query);
        const matchesDesc = log.behaviorDescription.toLowerCase().includes(query);
        const matchesNote = (log.note || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesDesc && !matchesNote) {
          return false;
        }
      }
      return true;
    });
  }, [monthlyBonusLogs, manageStudentFilter, manageBonusFilterType, manageBonusSearch]);

  // Open modal and pre-filter for a specific student if provided
  const handleOpenManageBonuses = (studentId?: string) => {
    setManageStudentFilter(studentId || 'all');
    setManageBonusFilterType('all');
    setManageBonusSearch('');
    setEditingBonusLog(null);
    setDeletingBonusLog(null);
    setIsManageBonusesModalOpen(true);
  };

  // Start editing a bonus log
  const handleStartEditBonus = (log: DisciplineLog) => {
    const isAch =
      log.behaviorCode.startsWith('TT_') ||
      log.behaviorDescription.includes('[Thành tích');
    const cleanTitle = log.behaviorDescription
      .replace(/\[Thành tích (tuần|tháng)\]\s*/g, '')
      .trim();

    setEditingBonusLog({
      id: log.id,
      studentName: log.studentName,
      studentCode: log.studentCode,
      score: log.scorePerUnit ?? log.totalScore,
      title: cleanTitle,
      note: log.note || '',
      isAchievement: isAch,
    });
  };

  // Save edited monthly bonus log
  const handleSaveEditMonthlyBonus = async () => {
    if (!editingBonusLog) return;
    const originalLog = disciplineLogs.find((l) => l.id === editingBonusLog.id);
    if (!originalLog) return;

    const newScore = Number(editingBonusLog.score) || 2.0;
    const rawTitle = editingBonusLog.title.trim() || 'Khen thưởng thành tích tháng';
    const finalDescription = editingBonusLog.isAchievement
      ? (rawTitle.startsWith('[Thành tích tháng]') ? rawTitle : `[Thành tích tháng] ${rawTitle}`)
      : rawTitle;

    await updateDisciplineLog(
      editingBonusLog.id,
      {
        scorePerUnit: newScore,
        totalScore: newScore,
        behaviorDescription: finalDescription,
        note: editingBonusLog.note.trim() || undefined,
      },
      classConfig.homeroomTeacher || 'GVCN'
    );

    setEditingBonusLog(null);
    setAwardingResult(`Đã cập nhật điểm thưởng tháng của học sinh ${editingBonusLog.studentName} (+${newScore}đ)!`);
    setTimeout(() => setAwardingResult(null), 4000);
  };

  // Confirm delete monthly bonus log
  const handleConfirmDeleteMonthlyBonus = async () => {
    if (!deletingBonusLog) return;
    await deleteDisciplineLog(deletingBonusLog.id, classConfig.homeroomTeacher || 'GVCN');
    const msg = `Đã xóa điểm thưởng tháng (+${deletingBonusLog.score}đ) của học sinh ${deletingBonusLog.studentName}!`;
    setDeletingBonusLog(null);
    setAwardingResult(msg);
    setTimeout(() => setAwardingResult(null), 4000);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = monthlyData.map((s, idx) => {
      const row: Record<string, any> = {
        STT: idx + 1,
        'Mã học sinh': s.studentCode,
        'Họ và tên': s.fullName,
      };

      // Add week deduction columns
      monthWeeks.forEach((w) => {
        const deduct = s.weekDeductions[w.weekNumber] || 0;
        row[`Tuần ${w.weekNumber} (Trừ)`] = deduct > 0 ? `-${formatVietnameseNumber(deduct)}` : '0';
      });

      row['Tổng điểm trừ tháng'] = formatVietnameseNumber(s.totalDeduct);
      row['Thưởng thường tháng'] = formatVietnameseNumber(s.totalBonus - (s.achievementBonus || 0));
      row['Thưởng thành tích tháng 🏆'] = formatVietnameseNumber(s.achievementBonus || 0);
      row['Danh hiệu thành tích tháng'] = (s.achievements || []).join('; ');
      row['Điểm tổng kết tháng'] = formatVietnameseNumber(s.finalScore);
      row['Xếp loại'] = s.rank;
      row['Ghi chú'] = s.notes;

      return row;
    });

    exportToExcel(
      exportRows,
      `Tong_ket_thang_${selectedMonth}_Lop_${classConfig.className}_${classConfig.schoolYear}`,
      `Thang_${selectedMonth}`
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-xl">
              <CalendarRange className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Bảng Tổng Kết Điểm Rèn Luyện Tháng {selectedMonth}
              </h2>
              <p className="text-xs text-slate-500">
                Lớp {classConfig.className} • Năm học {classConfig.schoolYear} • GVCN: {classConfig.homeroomTeacher}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 font-medium">Chọn tháng:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {classConfig.months.map((m) => (
                <option key={m} value={m} className="dark:bg-slate-800">
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsZaloModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
            title="Sao chép hình ảnh Tổng kết Tháng để dán gửi nhóm Zalo phụ huynh"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Gửi ảnh Zalo</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
            title="Xuất bảng tổng kết tháng ra Excel"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
            title="In bảng tổng kết tháng"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>In</span>
          </button>
        </div>
      </div>

      {/* Success notification banner */}
      {awardingResult && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{awardingResult}</span>
          </div>
          <button onClick={() => setAwardingResult(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* FEATURE CARD: KHEN THƯỞNG THÀNH TÍCH THÁNG */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:via-amber-950/10 border border-amber-300/60 dark:border-amber-700/60 rounded-2xl p-4 sm:p-5 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs shadow-amber-500/30">
                <Award className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Khen Thưởng Thành Tích Tháng {selectedMonth}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                {stats.totalAwardedStudents} HS có thành tích (+{formatVietnameseNumber(stats.totalAchievementBonus)}đ)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {eligibleZeroViolationStudents.length > 0 ? (
                <span>
                  🌟 Phát hiện <strong>{eligibleZeroViolationStudents.length} học sinh</strong> duy trì nề nếp gương mẫu trọn vẹn cả tháng (đủ điều kiện nhận thưởng +{zeroViolationMonthlyRule?.bonusScore || 2}đ).
                </span>
              ) : (
                <span>
                  Đã xét duyệt hoặc chưa có thêm học sinh đủ điều kiện tự động. Bạn có thể trao thưởng thành tích xuất sắc cá nhân bên dưới.
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {eligibleZeroViolationStudents.length > 0 && zeroViolationMonthlyRule && (
              <button
                onClick={() => setIsAutoMonthlyAwardModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
              >
                <Zap className="h-4 w-4" />
                <span>Xét thưởng tháng 0 vi phạm ({eligibleZeroViolationStudents.length} HS)</span>
              </button>
            )}

            <button
              onClick={() => {
                setSelectedRuleId('');
                setCustomScoreInput(2.0);
                setCustomNoteInput('');
                setIsCustomMonthlyAwardModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
            >
              <Award className="h-4 w-4 text-amber-600" />
              <span>Trao thưởng thành tích tháng</span>
            </button>

            <button
              onClick={() => handleOpenManageBonuses('all')}
              className={`flex items-center gap-1.5 px-3.5 py-2 border text-xs font-bold rounded-xl shadow-xs transition active:scale-95 ${
                monthlyBonusLogs.length > 0
                  ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
              title="Xem danh sách, sửa mức điểm hoặc xóa điểm thưởng đã trao trong tháng"
            >
              <Edit3 className="h-4 w-4 text-amber-600" />
              <span>Sửa / Xóa điểm thưởng tháng ({monthlyBonusLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] text-slate-500 font-medium block">Sĩ số lớp</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white">{monthlyData.length} HS</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium block">Tổng điểm trừ tháng</span>
          <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
            -{formatVietnameseNumber(stats.totalDeduct)}đ
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{stats.totalViolations} lỗi vi phạm</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block">Thưởng thành tích 🏆</span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
            +{formatVietnameseNumber(stats.totalAchievementBonus)}đ
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{stats.totalAwardedStudents} HS có danh hiệu</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">Tổng điểm cộng tháng</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            +{formatVietnameseNumber(stats.totalBonus)}đ
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{stats.totalBonuses} lượt khen thưởng</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40">
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium block">Điểm trung bình tháng</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {formatVietnameseNumber(stats.avgScore)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Tỷ lệ Tốt/XS: {stats.above8Rate}%</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] text-slate-500 font-medium block">Xếp loại Xuất sắc</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.ranks['Xuất sắc']} HS
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Tốt: {stats.ranks['Tốt']} HS</span>
        </div>
      </div>

      {/* Filter by Rank and Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto font-semibold">
          <span className="text-slate-500 font-normal">Lọc theo xếp loại:</span>
          <button
            onClick={() => setRankFilter('all')}
            className={`px-3 py-1 rounded-lg transition ${
              rankFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Tất cả ({monthlyData.length})
          </button>
          {(['Xuất sắc', 'Tốt', 'Khá', 'Trung bình', 'Yếu'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRankFilter(r)}
              className={`px-3 py-1 rounded-lg transition ${
                rankFilter === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {r} ({stats.ranks[r]})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Xếp theo:</span>
          
          <button
            onClick={() => handleSortChange('score')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition ${
              sortField === 'score'
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Xếp theo Điểm tháng (Cao xuống thấp / Thấp lên cao)"
          >
            {sortField === 'score' && (sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-blue-600" /> : <ArrowUp className="h-3 w-3 text-blue-600" />)}
            <span>Điểm tháng</span>
          </button>

          <button
            onClick={() => handleSortChange('name')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition ${
              sortField === 'name'
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Xếp theo Họ và Tên (chuẩn danh sách Việt Nam A-Z)"
          >
            {sortField === 'name' ? (
              sortDirection === 'asc' ? <ArrowDownAZ className="h-3 w-3 text-blue-600" /> : <ArrowUpAZ className="h-3 w-3 text-blue-600" />
            ) : (
              <ArrowDownAZ className="h-3 w-3 text-slate-400" />
            )}
            <span>Họ và Tên</span>
          </button>

          <button
            onClick={() => handleSortChange('code')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition ${
              sortField === 'code'
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Xếp theo Mã học sinh"
          >
            {sortField === 'code' ? (
              sortDirection === 'asc' ? <ArrowDown01 className="h-3 w-3 text-blue-600" /> : <ArrowUp10 className="h-3 w-3 text-blue-600" />
            ) : (
              <ArrowDown01 className="h-3 w-3 text-slate-400" />
            )}
            <span>Mã HS</span>
          </button>
        </div>
      </div>

      {/* Main Monthly Matrix Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-10 text-center">STT</th>
                <th
                  onClick={() => handleSortChange('code')}
                  className="py-3 px-3 w-28 cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Nhấn để sắp xếp theo Mã học sinh"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={sortField === 'code' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>Mã HS</span>
                    {sortField === 'code' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortChange('name')}
                  className="py-3 px-3 min-w-[160px] cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Nhấn để sắp xếp theo Họ và Tên (chuẩn danh sách Việt Nam A-Z)"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={sortField === 'name' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>Họ và tên</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* Dynamic columns for each week in this month */}
                {monthWeeks.map((w) => (
                  <th key={w.weekNumber} className="py-3 px-2 text-center w-20">
                    Tuần {w.weekNumber}
                  </th>
                ))}

                <th className="py-3 px-3 text-right w-24">Tổng trừ</th>
                <th className="py-3 px-3 text-right w-24">Thưởng tháng 🏆</th>
                <th
                  onClick={() => handleSortChange('score')}
                  className="py-3 px-3 text-right w-24 font-bold cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Nhấn để sắp xếp theo Điểm tháng"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span className={sortField === 'score' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>Điểm tháng</span>
                    {sortField === 'score' ? (
                      sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-blue-600" /> : <ArrowUp className="h-3 w-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center w-28">Xếp loại</th>
                <th className="py-3 px-3 min-w-[200px]">Ghi chú & Đánh giá</th>
                <th className="py-3 px-3 text-center w-20 print:hidden">Báo PH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredData.map((s, idx) => {
                const rankBadge = getRankBadgeClass(s.rank);
                const hasAchievement = (s.achievementCount || 0) > 0;

                return (
                  <tr
                    key={s.studentId}
                    className={`hover:bg-blue-50/40 dark:hover:bg-slate-750/50 transition-colors ${
                      hasAchievement ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {s.studentCode}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {s.fullName}
                        </span>
                        {hasAchievement && (
                          <span
                            className="inline-flex items-center text-amber-500"
                            title={`Đạt ${s.achievementCount} danh hiệu tháng: ${(s.achievements || []).join(', ')}`}
                          >
                            <Award className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Weekly deduction cells */}
                    {monthWeeks.map((w) => {
                      const deduct = s.weekDeductions[w.weekNumber] || 0;
                      return (
                        <td key={w.weekNumber} className="py-2.5 px-2 text-center font-mono">
                          {deduct > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              -{formatVietnameseNumber(deduct)}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">0</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-600 dark:text-rose-400">
                      {s.totalDeduct > 0 ? `-${formatVietnameseNumber(s.totalDeduct)}đ` : '0'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {hasAchievement ? (
                        <button
                          type="button"
                          onClick={() => handleOpenManageBonuses(s.studentId)}
                          className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline group cursor-pointer"
                          title="Bấm để xem, sửa hoặc xóa điểm thưởng tháng của học sinh này"
                        >
                          <span>+{formatVietnameseNumber(s.achievementBonus || 0)}đ</span>
                          <Edit3 className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity print:hidden" />
                        </button>
                      ) : s.totalBonus > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenManageBonuses(s.studentId)}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline group cursor-pointer"
                          title="Bấm để xem, sửa hoặc xóa điểm cộng tháng của học sinh này"
                        >
                          <span>+{formatVietnameseNumber(s.totalBonus)}đ</span>
                          <Edit3 className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity print:hidden" />
                        </button>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatVietnameseNumber(s.finalScore)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${rankBadge.bg} ${rankBadge.text} ${rankBadge.border}`}
                      >
                        {s.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                      {s.notes}
                    </td>
                    <td className="py-2.5 px-3 text-center print:hidden">
                      <button
                        onClick={() => {
                          if (onSelectStudentForReport) onSelectStudentForReport(s.studentId);
                          onNavigateTab('parent-report');
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition"
                        title="Tạo báo cáo gửi phụ huynh"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: XÉT THƯỞNG TỰ ĐỘNG THÁNG */}
      {isAutoMonthlyAwardModalOpen && zeroViolationMonthlyRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <span>Xét Thưởng Tháng: {zeroViolationMonthlyRule.title}</span>
              </h3>
              <button
                onClick={() => setIsAutoMonthlyAwardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Tìm thấy <strong>{eligibleZeroViolationStudents.length} học sinh</strong> trong tháng {selectedMonth} duy trì nề nếp gương mẫu (0 lỗi vi phạm trong toàn bộ các tuần của tháng).
              </p>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Quy chế: [{zeroViolationMonthlyRule.code}] {zeroViolationMonthlyRule.title}
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  Mức điểm thưởng cộng: <strong>+{zeroViolationMonthlyRule.bonusScore} điểm</strong> vào tổng kết tháng {selectedMonth}.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Danh sách {eligibleZeroViolationStudents.length} học sinh được khen thưởng:
                </label>
                <div className="max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-750 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 grid grid-cols-2 gap-1.5 scrollbar-thin">
                  {eligibleZeroViolationStudents.map((s, idx) => (
                    <div key={s.studentId} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        {idx + 1}. {s.fullName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setIsAutoMonthlyAwardModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmAutoMonthlyAward}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                Xác nhận trao thưởng ({eligibleZeroViolationStudents.length} HS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TRAO THƯỞNG THÀNH TÍCH THÁNG CÁ NHÂN */}
      {isCustomMonthlyAwardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                <span>Trao Điểm Thưởng Thành Tích Tháng {selectedMonth}</span>
              </h3>
              <button
                onClick={() => setIsCustomMonthlyAwardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Chọn học sinh được khen thưởng *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="">-- Chọn học sinh trong danh sách lớp --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.studentCode} - {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Quy chế / Danh hiệu thành tích tháng{' '}
                  <span className="text-slate-400 font-normal text-xs">(Không bắt buộc)</span>
                </label>
                <select
                  value={selectedRuleId}
                  onChange={(e) => {
                    const ruleId = e.target.value;
                    setSelectedRuleId(ruleId);
                    const r = monthlyRules.find((x) => x.id === ruleId);
                    if (r) {
                      setCustomScoreInput(r.bonusScore);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="">-- Không chọn quy chế (Không bắt buộc / Nhập tự do) --</option>
                  {monthlyRules.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.code}] {r.title} (+{r.bonusScore}đ)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mục này không bắt buộc. Thầy/cô có thể chọn quy chế mẫu hoặc để trống và nhập nội dung khen thưởng tự do ở phần ghi chú bên dưới.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Mức điểm thưởng cộng</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={customScoreInput}
                    onChange={(e) => setCustomScoreInput(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Kỳ khen thưởng</label>
                  <input
                    type="text"
                    disabled
                    value={`Tổng kết Tháng ${selectedMonth}`}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Ghi chú thành tích cụ thể (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="vd: Ngôi sao sáng tháng 9, giải nhất cờ vua trường, tiến bộ môn Văn..."
                  value={customNoteInput}
                  onChange={(e) => setCustomNoteInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setIsCustomMonthlyAwardModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmCustomMonthlyAward}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                Trao thưởng tháng ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUẢN LÝ & SỬA / XÓA ĐIỂM THƯỞNG THÁNG */}
      {isManageBonusesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  <span>Quản Lý & Sửa / Xóa Điểm Thưởng Tháng {selectedMonth}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Điều chỉnh số điểm, nội dung danh hiệu hoặc xóa/thu hồi điểm thưởng tháng đã ghi nhận
                </p>
              </div>
              <button
                onClick={() => {
                  setIsManageBonusesModalOpen(false);
                  setEditingBonusLog(null);
                  setDeletingBonusLog(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-Panel: Chỉnh Sửa Điểm Thưởng Tháng */}
            {editingBonusLog && (
              <div className="my-3 p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-xl space-y-3 shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800">
                  <span className="font-bold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Edit3 className="h-4 w-4 text-amber-600" />
                    Chỉnh sửa điểm thưởng tháng: <strong>{editingBonusLog.studentName}</strong> ({editingBonusLog.studentCode})
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-semibold">
                    {editingBonusLog.isAchievement ? 'Thành tích tháng' : 'Điểm cộng nề nếp'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Tên danh hiệu / Nội dung thành tích tháng *
                    </label>
                    <input
                      type="text"
                      value={editingBonusLog.title}
                      onChange={(e) =>
                        setEditingBonusLog({ ...editingBonusLog, title: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 font-medium"
                      placeholder="vd: Ngôi sao sáng tháng 9, giải nhất vẽ tranh..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Mức điểm thưởng (+đ) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="10"
                      value={editingBonusLog.score}
                      onChange={(e) =>
                        setEditingBonusLog({
                          ...editingBonusLog,
                          score: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-emerald-600 font-bold font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Ghi chú cụ thể
                    </label>
                    <input
                      type="text"
                      value={editingBonusLog.note}
                      onChange={(e) =>
                        setEditingBonusLog({ ...editingBonusLog, note: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100"
                      placeholder="Ghi chú thêm về thành tích hoặc biểu dương..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200/70 dark:border-amber-800/80">
                  <button
                    type="button"
                    onClick={() => setEditingBonusLog(null)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                  >
                    Hủy chỉnh sửa
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditMonthlyBonus}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            )}

            {/* Sub-Panel: Xác Nhận Xóa Điểm Thưởng Tháng */}
            {deletingBonusLog && (
              <div className="my-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2 shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Xác nhận xóa / thu hồi điểm thưởng tháng</span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Bạn có chắc chắn muốn xóa điểm thưởng <strong>+{deletingBonusLog.score}đ</strong> ({deletingBonusLog.title}) của học sinh <strong>{deletingBonusLog.studentName}</strong>?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Lưu ý: Sau khi xóa, tổng điểm và xếp loại tháng {selectedMonth} của học sinh sẽ tự động được tính toán lại ngay lập tức.
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDeletingBonusLog(null)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteMonthlyBonus}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    Xác nhận xóa vĩnh viễn
                  </button>
                </div>
              </div>
            )}

            {/* Search and Filters Bar */}
            <div className="space-y-2 shrink-0 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Search */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên học sinh, mã HS, nội dung..."
                    value={manageBonusSearch}
                    onChange={(e) => setManageBonusSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                {/* Filter by Student */}
                <div>
                  <select
                    value={manageStudentFilter}
                    onChange={(e) => setManageStudentFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="all">-- Xem tất cả học sinh được thưởng ({monthlyBonusLogs.length} bản ghi) --</option>
                    {studentsWithMonthlyBonus.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.studentCode} - {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold">
                <span className="text-slate-400 font-normal shrink-0">Loại:</span>
                <button
                  type="button"
                  onClick={() => setManageBonusFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                    manageBonusFilterType === 'all'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Tất cả ({monthlyBonusLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManageBonusFilterType('achievement')}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                    manageBonusFilterType === 'achievement'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Thành tích tháng 🏆 ({monthlyBonusLogs.filter((l) => l.behaviorCode.startsWith('TT_') || l.behaviorDescription.includes('[Thành tích')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setManageBonusFilterType('regular')}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                    manageBonusFilterType === 'regular'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Điểm cộng nề nếp ({monthlyBonusLogs.filter((l) => !l.behaviorCode.startsWith('TT_') && !l.behaviorDescription.includes('[Thành tích')).length})
                </button>
              </div>
            </div>

            {/* List of Monthly Bonus Logs */}
            <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[420px] pr-1 space-y-2 scrollbar-thin mt-2">
              {filteredBonusLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Award className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs">
                    {monthlyBonusLogs.length === 0
                      ? `Chưa có điểm thưởng nào được ghi nhận trong tháng ${selectedMonth}.`
                      : 'Không tìm thấy bản ghi điểm thưởng nào khớp với bộ lọc hiện tại.'}
                  </p>
                </div>
              ) : (
                filteredBonusLogs.map((log) => {
                  const isAch =
                    log.behaviorCode.startsWith('TT_') ||
                    log.behaviorDescription.includes('[Thành tích');
                  const cleanTitle = log.behaviorDescription
                    .replace(/\[Thành tích (tuần|tháng)\]\s*/g, '')
                    .trim();

                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 dark:bg-slate-750/70 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 border border-slate-200 dark:border-slate-700 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {log.studentName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 font-medium">
                            ({log.studentCode})
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isAch
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            }`}
                          >
                            {isAch ? '🏆 Thành tích tháng' : '⭐ Điểm cộng nề nếp'}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {cleanTitle}
                        </p>

                        {log.note && (
                          <p className="text-[11px] text-slate-500 italic">
                            Ghi chú: {log.note}
                          </p>
                        )}

                        <div className="text-[10px] text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>Ngày: {formatVietnameseDate(log.date)}</span>
                          <span>•</span>
                          <span>{log.periodOrTime || `Tháng ${selectedMonth}`}</span>
                          <span>•</span>
                          <span>Người ghi: {log.reporter || 'GVCN'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                          +{formatVietnameseNumber(log.totalScore)}đ
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditBonus(log)}
                            className="p-1.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50 rounded-lg transition"
                            title="Sửa số điểm hoặc nội dung khen thưởng tháng"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeletingBonusLog({
                                id: log.id,
                                studentName: log.studentName,
                                score: log.totalScore,
                                title: cleanTitle,
                              })
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/60 rounded-lg transition"
                            title="Xóa điểm thưởng tháng này"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 text-xs">
              <span className="text-slate-500 font-medium">
                Tổng cộng: <strong>{filteredBonusLogs.length}</strong> bản ghi (
                <span className="text-emerald-600 font-bold font-mono">
                  +{formatVietnameseNumber(
                    filteredBonusLogs.reduce((acc, curr) => acc + curr.totalScore, 0)
                  )}đ
                </span>
                )
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsManageBonusesModalOpen(false);
                  setEditingBonusLog(null);
                  setDeletingBonusLog(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zalo Image Export Modal */}
      <SummaryZaloExportModal
        isOpen={isZaloModalOpen}
        onClose={() => setIsZaloModalOpen(false)}
        periodType="monthly"
        periodTitle={`Tháng ${selectedMonth}`}
        periodTimeInfo={`Năm học ${classConfig.schoolYear} • Gồm ${monthWeeks.length} tuần học (Tuần ${monthWeeks.map((w) => w.weekNumber).join(', ')})`}
        className={classConfig.className}
        schoolYear={classConfig.schoolYear}
        homeroomTeacher={classConfig.homeroomTeacher}
        stats={{
          totalStudents: monthlyData.length,
          avgScore: stats.avgScore,
          excellentCount: stats.ranks['Xuất sắc'] || 0,
          goodCount: stats.ranks['Tốt'] || 0,
          fairCount: stats.ranks['Khá'] || 0,
          mediumCount: stats.ranks['Trung bình'] || 0,
          weakCount: stats.ranks['Yếu'] || 0,
          totalViolations: stats.totalViolations,
          totalDeduct: stats.totalDeduct,
          totalBonus: stats.totalBonus,
          totalAchievementBonus: stats.totalAchievementBonus,
        }}
        students={[...monthlyData]
          .sort((a, b) => b.finalScore - a.finalScore || a.studentCode.localeCompare(b.studentCode))
          .map((d, idx) => ({
            stt: idx + 1,
            studentCode: d.studentCode,
            fullName: d.fullName,
            violationCount: d.violationCount,
            totalDeduct: d.totalDeduct,
            totalBonus: d.totalBonus,
            achievementBonus: d.achievementBonus,
            achievements: d.achievements,
            finalScore: d.finalScore,
            rank: d.rank,
            notes: d.notes,
          }))}
      />
    </div>
  );
};
