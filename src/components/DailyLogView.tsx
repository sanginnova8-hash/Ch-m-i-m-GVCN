import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  Edit2,
  Trash2,
  History,
  AlertCircle,
  FileSpreadsheet,
  X,
  Check,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Upload,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DisciplineLog, BehaviorCategory, Student, BehaviorType } from '../types';
import { ImportDisciplineLogsModal } from './ImportDisciplineLogsModal';
import {
  formatVietnameseDate,
  formatVietnameseNumber,
  removeVietnameseAccents,
  exportToExcel,
  exportToCsv,
  compareVietnameseNames,
  compareStudentCodes,
} from '../lib/utils';

interface DailyLogViewProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  isModalOpen,
  onCloseModal,
  onOpenModal,
}) => {
  const {
    students,
    behaviorCategories,
    disciplineLogs,
    classConfig,
    addDisciplineLog,
    updateDisciplineLog,
    deleteDisciplineLog,
  } = useApp();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterWeek, setFilterWeek] = useState<number | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | BehaviorType>('all');
  const [filterStudentId, setFilterStudentId] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'studentName' | 'totalScore'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DisciplineLog | null>(null);
  const [historyLog, setHistoryLog] = useState<DisciplineLog | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // New log form state
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newWeek, setNewWeek] = useState<number>(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BehaviorCategory | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [newType, setNewType] = useState<BehaviorType>('deduct');
  const [scorePerUnit, setScorePerUnit] = useState<number>(1);
  const [count, setCount] = useState<number>(1);
  const [periodOrTime, setPeriodOrTime] = useState('Tiết 1');
  const [reporter, setReporter] = useState(classConfig.homeroomTeacher);
  const [note, setNote] = useState('');
  const [basisOrRegulation, setBasisOrRegulation] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showDuplicateWarning, setShowDuplicateWarning] = useState<boolean>(false);
  const [pendingLogToSave, setPendingLogToSave] = useState<any>(null);

  // Auto-detect week from date
  const suggestWeekFromDate = (dateString: string): number => {
    const target = new Date(dateString).getTime();
    for (const w of classConfig.weeks) {
      const s = new Date(w.startDate).getTime();
      const e = new Date(w.endDate).getTime() + 86400000;
      if (target >= s && target <= e) {
        return w.weekNumber;
      }
    }
    return 1;
  };

  // When date changes in new modal, auto-suggest week
  const handleDateChange = (val: string) => {
    setNewDate(val);
    const suggested = suggestWeekFromDate(val);
    setNewWeek(suggested);
  };

  // Keyword suggestions when typing custom description
  const keywordSuggestions = useMemo(() => {
    if (!customDescription || customDescription.length < 2) return [];
    const normalizedInput = removeVietnameseAccents(customDescription);

    return behaviorCategories.filter((cat) => {
      if (!cat.isActive) return false;
      // Check code
      if (cat.code.toLowerCase().includes(normalizedInput)) return true;
      // Check keywords
      if (cat.keywords && cat.keywords.some((k) => normalizedInput.includes(removeVietnameseAccents(k)) || removeVietnameseAccents(k).includes(normalizedInput))) {
        return true;
      }
      // Check name
      if (removeVietnameseAccents(cat.name).includes(normalizedInput)) return true;
      return false;
    });
  }, [customDescription, behaviorCategories]);

  // Apply a keyword suggestion to the form
  const handleApplySuggestion = (cat: BehaviorCategory) => {
    setSelectedCategory(cat);
    setNewType(cat.type);
    setScorePerUnit(cat.defaultScore);
    setCustomDescription(cat.name);
    setBasisOrRegulation(cat.basisOrRegulation || '');
  };

  // Filtered students for quick search in modal (sorted by student code)
  const filteredStudentsForSelect = useMemo(() => {
    let list = students;
    if (studentSearchQuery) {
      const q = removeVietnameseAccents(studentSearchQuery);
      list = students.filter(
        (s) =>
          removeVietnameseAccents(s.fullName).includes(q) ||
          s.studentCode.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => compareStudentCodes(a.studentCode, b.studentCode, 'asc'));
  }, [students, studentSearchQuery]);

  // Filtered & Sorted logs for the main table
  const filteredLogs = useMemo(() => {
    return disciplineLogs.filter((log) => {
      // Month filter
      if (filterMonth !== 'all' && log.month !== filterMonth) return false;
      // Week filter
      if (filterWeek !== 'all' && log.weekNumber !== filterWeek) return false;
      // Type filter
      if (filterType !== 'all' && log.type !== filterType) return false;
      // Student filter
      if (filterStudentId !== 'all' && log.studentId !== filterStudentId) return false;

      // Text search
      if (searchTerm) {
        const q = removeVietnameseAccents(searchTerm);
        const matchName = removeVietnameseAccents(log.studentName).includes(q);
        const matchCode = log.studentCode.toLowerCase().includes(q);
        const matchBehavior = removeVietnameseAccents(log.behaviorDescription).includes(q);
        const matchCatCode = log.behaviorCode.toLowerCase().includes(q);
        const matchReporter = log.reporter ? removeVietnameseAccents(log.reporter).includes(q) : false;
        if (!matchName && !matchCode && !matchBehavior && !matchCatCode && !matchReporter) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortAsc ? -diff : diff;
      }
      if (sortField === 'studentName') {
        return sortAsc ? a.studentName.localeCompare(b.studentName) : b.studentName.localeCompare(a.studentName);
      }
      if (sortField === 'totalScore') {
        return sortAsc ? a.totalScore - b.totalScore : b.totalScore - a.totalScore;
      }
      return 0;
    });
  }, [disciplineLogs, filterMonth, filterWeek, filterType, filterStudentId, searchTerm, sortField, sortAsc]);

  // Validate and submit new log
  const handleValidateAndSave = async (overrideDuplicate: boolean = false) => {
    const errors: Record<string, string> = {};
    if (!newDate) errors.date = 'Vui lòng chọn ngày ghi nhận';
    if (!selectedStudent) errors.student = 'Vui lòng chọn học sinh';
    if (!selectedCategory && !customDescription.trim()) {
      errors.behavior = 'Vui lòng chọn danh mục hành vi hoặc nhập mô tả';
    }
    if (!count || count <= 0) errors.count = 'Số lần phải lớn hơn 0';
    if (scorePerUnit < 0) errors.score = 'Điểm mỗi lần không được âm';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    const d = new Date(newDate);
    const month = d.getMonth() + 1;
    const behCode = selectedCategory ? selectedCategory.code : 'KHT';
    const behDesc = customDescription.trim() || (selectedCategory ? selectedCategory.name : '');

    const logPayload = {
      date: newDate,
      month,
      weekNumber: Number(newWeek),
      studentId: selectedStudent!.id,
      studentCode: selectedStudent!.studentCode,
      studentName: selectedStudent!.fullName,
      behaviorCode: behCode,
      behaviorDescription: behDesc,
      type: newType,
      scorePerUnit: Number(scorePerUnit),
      count: Number(count),
      periodOrTime: periodOrTime.trim(),
      reporter: reporter.trim() || classConfig.homeroomTeacher,
      basisOrRegulation: basisOrRegulation.trim() || (selectedCategory?.basisOrRegulation || ''),
      note: note.trim(),
    };

    if (!overrideDuplicate) {
      // Check duplicate
      const duplicateExists = disciplineLogs.some(
        (l) =>
          l.studentId === logPayload.studentId &&
          l.date === logPayload.date &&
          l.behaviorCode.toUpperCase() === logPayload.behaviorCode.toUpperCase() &&
          l.periodOrTime === logPayload.periodOrTime
      );

      if (duplicateExists) {
        setPendingLogToSave(logPayload);
        setShowDuplicateWarning(true);
        return;
      }
    }

    await addDisciplineLog(logPayload);
    handleResetModal();
    onCloseModal();
  };

  const handleResetModal = () => {
    setSelectedStudent(null);
    setStudentSearchQuery('');
    setSelectedCategory(null);
    setCustomDescription('');
    setNewType('deduct');
    setScorePerUnit(1);
    setCount(1);
    setNote('');
    setBasisOrRegulation('');
    setFormErrors({});
    setShowDuplicateWarning(false);
    setPendingLogToSave(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredLogs.map((l, idx) => ({
      STT: idx + 1,
      'Ngày ghi nhận': formatVietnameseDate(l.date),
      Tuần: l.weekNumber,
      Tháng: l.month,
      'Mã học sinh': l.studentCode,
      'Họ và tên': l.studentName,
      'Mã hành vi': l.behaviorCode,
      'Mô tả hành vi': l.behaviorDescription,
      Loại: l.type === 'deduct' ? 'Trừ điểm' : 'Điểm cộng',
      'Điểm mỗi lần': formatVietnameseNumber(l.scorePerUnit),
      'Số lần': l.count,
      'Tổng điểm': (l.type === 'deduct' ? '-' : '+') + formatVietnameseNumber(l.totalScore),
      'Tiết / Thời gian': l.periodOrTime || '',
      'Người ghi nhận': l.reporter || '',
      'Căn cứ quy định': l.basisOrRegulation || '',
      'Ghi chú': l.note || '',
    }));
    exportToExcel(exportData, `Nhat_ky_ne_nep_10A8_${new Date().toISOString().slice(0, 10)}`, 'NhatKy');
  };

  // Export to CSV
  const handleExportCsv = () => {
    const exportData = filteredLogs.map((l, idx) => ({
      STT: idx + 1,
      'Ngày ghi nhận': formatVietnameseDate(l.date),
      Tuần: l.weekNumber,
      Tháng: l.month,
      'Mã học sinh': l.studentCode,
      'Họ và tên': l.studentName,
      'Mã hành vi': l.behaviorCode,
      'Mô tả hành vi': l.behaviorDescription,
      Loại: l.type === 'deduct' ? 'Trừ điểm' : 'Điểm cộng',
      'Điểm mỗi lần': formatVietnameseNumber(l.scorePerUnit),
      'Số lần': l.count,
      'Tổng điểm': (l.type === 'deduct' ? '-' : '+') + formatVietnameseNumber(l.totalScore),
      'Tiết / Thời gian': l.periodOrTime || '',
      'Người ghi nhận': l.reporter || '',
      'Căn cứ quy định': l.basisOrRegulation || '',
      'Ghi chú': l.note || '',
    }));
    exportToCsv(exportData, `Nhat_ky_ne_nep_10A8_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <span>Nhật Ký Chấm Điểm Hằng Ngày</span>
          </h2>
          <p className="text-xs text-slate-500">
            Nguồn dữ liệu gốc duy nhất • Hiển thị {filteredLogs.length}/{disciplineLogs.length} bản ghi
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Thêm ghi nhận mới</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
            title="Tải lên nhật ký vi phạm/lỗi nề nếp từ file Excel hoặc CSV"
          >
            <Upload className="h-4 w-4" />
            <span>Tải lên nhật ký lỗi</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium rounded-xl shadow-sm transition"
            title="Xuất bảng hiện tại sang Microsoft Excel"
          >
            <Download className="h-4 w-4" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition"
            title="Xuất CSV"
          >
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, mã HS, lỗi vi phạm, người ghi nhận..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Month Filter */}
          <div>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả các tháng</option>
              {classConfig.months.map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          {/* Week Filter */}
          <div>
            <select
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả các tuần</option>
              {classConfig.weeks.map((w) => (
                <option key={w.weekNumber} value={w.weekNumber}>
                  Tuần {w.weekNumber} (T{w.month})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả loại hành vi</option>
              <option value="deduct">Chỉ vi phạm (Điểm trừ)</option>
              <option value="bonus">Chỉ khen thưởng (Điểm cộng)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-12 text-center">STT</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    setSortField('date');
                    setSortAsc(!sortAsc);
                  }}
                >
                  Ngày & Tuần
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    setSortField('studentName');
                    setSortAsc(!sortAsc);
                  }}
                >
                  Học sinh
                </th>
                <th className="py-3 px-3">Mã & Hành vi</th>
                <th className="py-3 px-3 text-center">Loại</th>
                <th className="py-3 px-3 text-right">Điểm x Lần</th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    setSortField('totalScore');
                    setSortAsc(!sortAsc);
                  }}
                >
                  Tổng điểm
                </th>
                <th className="py-3 px-3">Tiết / Thời gian</th>
                <th className="py-3 px-3">Người ghi & Căn cứ</th>
                <th className="py-3 px-3">Ghi chú</th>
                <th className="py-3 px-3 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="h-8 w-8 text-slate-300 dark:text-slate-650" />
                      <p className="text-xs sm:text-sm font-medium">Không có bản ghi nào phù hợp với bộ lọc hiện tại.</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={onOpenModal}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg text-xs font-semibold transition"
                        >
                          + Thêm ghi nhận thủ công
                        </button>
                        <button
                          onClick={() => setIsImportModalOpen(true)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg text-xs font-semibold transition"
                        >
                          Tải lên nhật ký từ Excel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const isDeduct = log.type === 'deduct';
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-750/50 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {formatVietnameseDate(log.date)}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Tuần {log.weekNumber} (T{log.month})
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {log.studentName}
                        </span>
                        <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                          {log.studentCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <span className="inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 mr-1.5">
                          {log.behaviorCode}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {log.behaviorDescription}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDeduct
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          }`}
                        >
                          {isDeduct ? 'Điểm trừ' : 'Điểm cộng'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                        {formatVietnameseNumber(log.scorePerUnit)}đ × {log.count}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-bold font-mono text-sm ${
                            isDeduct ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isDeduct ? '-' : '+'}
                          {formatVietnameseNumber(log.totalScore)}đ
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {log.periodOrTime || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-[180px]">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                          {log.reporter || classConfig.homeroomTeacher}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate" title={log.basisOrRegulation}>
                          {log.basisOrRegulation || 'Nội quy lớp'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-[150px] truncate" title={log.note}>
                        {log.note || '—'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingLog(log)}
                            className="p-1 hover:bg-blue-50 text-blue-600 dark:hover:bg-slate-700 rounded transition"
                            title="Chỉnh sửa bản ghi"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {log.history && log.history.length > 0 && (
                            <button
                              onClick={() => setHistoryLog(log)}
                              className="p-1 hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-700 rounded transition"
                              title="Xem lịch sử thay đổi"
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingLogId(log.id)}
                            className="p-1 hover:bg-rose-50 text-rose-600 dark:hover:bg-slate-700 rounded transition"
                            title="Xóa bản ghi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Thêm ghi nhận mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-blue-600" />
                  <span>Thêm Ghi Nhận Nề Nếp Mới</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Lớp {classConfig.className} • Năm học {classConfig.schoolYear}
                </p>
              </div>
              <button
                onClick={() => {
                  handleResetModal();
                  onCloseModal();
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Row 1: Ngày & Tuần học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày vi phạm/khen thưởng *
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {formErrors.date && <p className="text-xs text-rose-500 mt-1">{formErrors.date}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tuần học (Tự đề xuất theo lịch) *
                  </label>
                  <select
                    value={newWeek}
                    onChange={(e) => setNewWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {classConfig.weeks.map((w) => (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        Tuần {w.weekNumber} ({formatVietnameseDate(w.startDate).slice(0, 5)} - {formatVietnameseDate(w.endDate).slice(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Chọn Học sinh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn học sinh *
                </label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-blue-900 dark:text-blue-200">
                        {selectedStudent.fullName}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md">
                        {selectedStudent.studentCode}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Đổi học sinh
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Gõ tên hoặc mã học sinh (vd: An, HS10A801)..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                      {filteredStudentsForSelect.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedStudent(s);
                            setStudentSearchQuery('');
                          }}
                          className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between text-xs transition"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">
                            {s.fullName}
                          </span>
                          <span className="font-mono text-slate-500">{s.studentCode}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {formErrors.student && <p className="text-xs text-rose-500 mt-1">{formErrors.student}</p>}
              </div>

              {/* Row 3: Chọn Danh mục hành vi hoặc Nhập mô tả */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn hành vi từ danh mục quy định
                </label>
                <select
                  value={selectedCategory ? selectedCategory.id : ''}
                  onChange={(e) => {
                    const found = behaviorCategories.find((c) => c.id === e.target.value);
                    if (found) {
                      handleApplySuggestion(found);
                    } else {
                      setSelectedCategory(null);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Chọn trong danh mục chuẩn (hoặc nhập mô tả tự do bên dưới) --</option>
                  <optgroup label="Danh mục Vi phạm (Điểm trừ)">
                    {behaviorCategories
                      .filter((c) => c.type === 'deduct')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] -{formatVietnameseNumber(c.defaultScore)}đ: {c.name.slice(0, 70)}...
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Danh mục Khen thưởng (Điểm cộng)">
                    {behaviorCategories
                      .filter((c) => c.type === 'bonus')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] +{formatVietnameseNumber(c.defaultScore)}đ: {c.name.slice(0, 70)}...
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Mô tả tự do & Gợi ý từ khóa tiếng Việt */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chi tiết hành vi
                </label>
                <input
                  type="text"
                  placeholder="Nhập mô tả cụ thể (vd: đi muộn 15p, sử dụng điện thoại trong giờ Toán, nhặt được của rơi...)"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                {/* Keyword match suggestions banner */}
                {keywordSuggestions.length > 0 && (
                  <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200 font-semibold">
                      <Lightbulb className="h-4 w-4 text-amber-600" />
                      <span>Gợi ý danh mục phù hợp từ khóa (Giáo viên nhấn để xác nhận):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {keywordSuggestions.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleApplySuggestion(cat)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-200 hover:bg-amber-100 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                        >
                          <span className="font-bold text-amber-700 dark:text-amber-400">[{cat.code}]</span>
                          <span>{cat.type === 'deduct' ? '-' : '+'}{formatVietnameseNumber(cat.defaultScore)}đ</span>
                          <span className="text-slate-500 max-w-[120px] truncate">({cat.name.slice(0, 25)}...)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {formErrors.behavior && <p className="text-xs text-rose-500 mt-1">{formErrors.behavior}</p>}
              </div>

              {/* Loại, Điểm mỗi lần & Số lần */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Loại hành vi
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as BehaviorType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="deduct">Vi phạm (Điểm trừ)</option>
                    <option value="bonus">Khen thưởng (Điểm cộng)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Điểm mỗi lần
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={scorePerUnit}
                    onChange={(e) => setScorePerUnit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {formErrors.score && <p className="text-xs text-rose-500 mt-1">{formErrors.score}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số lần
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={count}
                    onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tiết học & Người ghi nhận */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tiết / Thời gian
                  </label>
                  <input
                    type="text"
                    placeholder="vd: Tiết 1, Tiết 4, Ra chơi, Giờ sinh hoạt..."
                    value={periodOrTime}
                    onChange={(e) => setPeriodOrTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Người ghi nhận
                  </label>
                  <input
                    type="text"
                    value={reporter}
                    onChange={(e) => setReporter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú sư phạm (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="vd: Đã nhắc nhở, phụ huynh có đơn xin phép, hứa khắc phục..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* LIVE SCORE PREVIEW BANNER */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  newType === 'deduct'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider block">
                    Bản xem trước tính điểm:
                  </span>
                  <span className="text-xs font-mono">
                    {formatVietnameseNumber(scorePerUnit)}đ × {count} lần ={' '}
                    <strong>
                      {newType === 'deduct' ? 'Điểm trừ' : 'Điểm cộng'} {formatVietnameseNumber(scorePerUnit * count)}đ
                    </strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono">
                    {newType === 'deduct' ? '-' : '+'}
                    {formatVietnameseNumber(scorePerUnit * count)}đ
                  </span>
                </div>
              </div>

              {/* Duplicate Warning Dialog */}
              {showDuplicateWarning && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Cảnh báo: Có khả năng trùng bản ghi!</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Học sinh <strong>{selectedStudent?.fullName}</strong> đã có một bản ghi cùng ngày{' '}
                    {formatVietnameseDate(newDate)}, mã hành vi và tiết học này. Bạn có chắc chắn muốn ghi nhận thêm lần nữa không?
                  </p>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDuplicateWarning(false)}
                      className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleValidateAndSave(true)}
                      className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-500"
                    >
                      Xác nhận vẫn lưu
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  handleResetModal();
                  onCloseModal();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleValidateAndSave(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition active:scale-95"
              >
                Lưu vào nhật ký
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Chỉnh sửa bản ghi */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-600" />
              <span>Chỉnh Sửa Ghi Nhận Nhật Ký</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Học sinh: <strong className="text-slate-800 dark:text-slate-200">{editingLog.studentName}</strong> (
              {editingLog.studentCode}) • Ngày: {formatVietnameseDate(editingLog.date)}
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mô tả hành vi</label>
                <input
                  type="text"
                  value={editingLog.behaviorDescription}
                  onChange={(e) => setEditingLog({ ...editingLog, behaviorDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Điểm mỗi lần</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingLog.scorePerUnit}
                    onChange={(e) => setEditingLog({ ...editingLog, scorePerUnit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Số lần</label>
                  <input
                    type="number"
                    min="1"
                    value={editingLog.count}
                    onChange={(e) => setEditingLog({ ...editingLog, count: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={editingLog.note || ''}
                  onChange={(e) => setEditingLog({ ...editingLog, note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-xl border flex justify-between items-center font-mono">
                <span>Tổng điểm sau chỉnh sửa:</span>
                <span className="font-bold text-base">
                  {editingLog.type === 'deduct' ? '-' : '+'}
                  {formatVietnameseNumber(editingLog.scorePerUnit * editingLog.count)}đ
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setEditingLog(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await updateDisciplineLog(
                    editingLog.id,
                    {
                      behaviorDescription: editingLog.behaviorDescription,
                      scorePerUnit: editingLog.scorePerUnit,
                      count: editingLog.count,
                      note: editingLog.note,
                    },
                    classConfig.homeroomTeacher
                  );
                  setEditingLog(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500"
              >
                Cập nhật bản ghi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Lịch sử chỉnh sửa */}
      {historyLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600" />
                <span>Lịch Sử Thao Tác Bản Ghi</span>
              </h3>
              <button onClick={() => setHistoryLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
              {historyLog.history?.map((entry, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-750 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                    <span>{formatVietnameseDate(entry.timestamp)} {entry.timestamp.slice(11, 16)}</span>
                    <span className="font-bold text-blue-600">{entry.editorName}</span>
                  </div>
                  {entry.previousValue && (
                    <p className="text-slate-500 line-through">Cũ: {entry.previousValue}</p>
                  )}
                  <p className="text-slate-800 dark:text-slate-200 font-medium">Mới: {entry.newValue}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setHistoryLog(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận xóa bản ghi */}
      {deletingLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 text-center">
            <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Xóa bản ghi nhật ký?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Điểm rèn luyện của học sinh và tổng kết tuần/tháng sẽ tự động được tính toán lại ngay sau khi xóa.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setDeletingLogId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await deleteDisciplineLog(deletingLogId, classConfig.homeroomTeacher);
                  setDeletingLogId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tải lên nhật ký lỗi từ Excel/CSV */}
      <ImportDisciplineLogsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
