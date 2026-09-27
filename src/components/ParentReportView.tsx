import React, { useState, useMemo, useRef } from 'react';
import {
  MessageSquareShare,
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HeartHandshake,
  Send,
  Calendar,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { toBlob } from 'html-to-image';
import { useApp } from '../context/AppContext';
import {
  formatVietnameseDate,
  formatVietnameseNumber,
  removeVietnameseAccents,
  getRankBadgeClass,
  compareVietnameseNames,
  compareStudentCodes,
} from '../lib/utils';
import { Student } from '../types';

interface ParentReportViewProps {
  initialSelectedStudentId?: string | null;
}

export const ParentReportView: React.FC<ParentReportViewProps> = ({
  initialSelectedStudentId,
}) => {
  const { students, classConfig, disciplineLogs, getWeeklySummary, getMonthlySummary } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialSelectedStudentId || (students[0]?.id ?? '')
  );
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month'>('week');
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSortBy, setStudentSortBy] = useState<'name' | 'code'>('name');
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [teacherPersonalNote, setTeacherPersonalNote] = useState('');
  const reportCardRef = useRef<HTMLDivElement>(null);

  // Selected student object
  const currentStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  // Weeks for this month
  const availableWeeks = useMemo(() => {
    return classConfig.weeks.filter((w) => w.month === selectedMonth);
  }, [classConfig.weeks, selectedMonth]);

  React.useEffect(() => {
    if (availableWeeks.length > 0 && !availableWeeks.some((w) => w.weekNumber === selectedWeek)) {
      setSelectedWeek(availableWeeks[0].weekNumber);
    }
  }, [selectedMonth, availableWeeks, selectedWeek]);

  // Current student index and quick previous/next
  const studentIndex = useMemo(() => {
    return students.findIndex((s) => s.id === currentStudent?.id);
  }, [students, currentStudent]);

  const handlePrevStudent = () => {
    if (studentIndex > 0) {
      setSelectedStudentId(students[studentIndex - 1].id);
      setCopied(false);
    }
  };

  const handleNextStudent = () => {
    if (studentIndex < students.length - 1) {
      setSelectedStudentId(students[studentIndex + 1].id);
      setCopied(false);
    }
  };

  // Student list search & sort
  const filteredStudents = useMemo(() => {
    let list = students;
    if (studentSearch) {
      const q = removeVietnameseAccents(studentSearch);
      list = students.filter(
        (s) =>
          removeVietnameseAccents(s.fullName).includes(q) ||
          s.studentCode.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (studentSortBy === 'code') {
        return compareStudentCodes(a.studentCode, b.studentCode, 'asc');
      }
      return compareVietnameseNames(a, b, 'asc');
    });
  }, [students, studentSearch, studentSortBy]);

  // Get specific logs for the period
  const periodLogs = useMemo(() => {
    if (!currentStudent) return [];
    return disciplineLogs.filter((l) => {
      if (l.studentId !== currentStudent.id) return false;
      if (reportPeriod === 'week') {
        return l.weekNumber === selectedWeek;
      } else {
        return l.month === selectedMonth;
      }
    });
  }, [disciplineLogs, currentStudent, reportPeriod, selectedWeek, selectedMonth]);

  // Calculated score for the period
  const periodSummary = useMemo(() => {
    if (!currentStudent) return null;
    if (reportPeriod === 'week') {
      const summaryList = getWeeklySummary(selectedWeek, selectedMonth);
      return summaryList.find((s) => s.studentId === currentStudent.id);
    } else {
      const summaryList = getMonthlySummary(selectedMonth);
      return summaryList.find((s) => s.studentId === currentStudent.id);
    }
  }, [currentStudent, reportPeriod, selectedWeek, selectedMonth, getWeeklySummary, getMonthlySummary]);

  // Compose Polite & Constructive Message
  const generatedMessage = useMemo(() => {
    if (!currentStudent || !periodSummary) return '';

    const periodText =
      reportPeriod === 'week'
        ? `tuần ${selectedWeek} (tháng ${selectedMonth})`
        : `tháng ${selectedMonth}`;

    const score = formatVietnameseNumber(periodSummary.finalScore);
    const deduct = formatVietnameseNumber(periodSummary.totalDeduct);
    const bonus = formatVietnameseNumber(periodSummary.totalBonus);
    const rank = periodSummary.rank;

    const violations = periodLogs.filter((l) => l.type === 'deduct');
    const bonuses = periodLogs.filter((l) => l.type === 'bonus');

    let contentLines: string[] = [];

    contentLines.push(`Kính gửi Quý phụ huynh học sinh ${currentStudent.fullName},`);
    contentLines.push('');
    contentLines.push(
      `Thầy Nguyễn Văn Sang - Giáo viên chủ nhiệm lớp ${classConfig.className}, Trường THPT xin gửi tới Quý gia đình thông tin rèn luyện nề nếp của em ${currentStudent.fullName} (Mã HS: ${currentStudent.studentCode}) trong ${periodText}:`
    );
    contentLines.push('');
    contentLines.push(`• Điểm rèn luyện đạt được: ${score} / 10,0 điểm`);
    contentLines.push(`• Xếp loại thi đua: ${rank}`);

    if (periodSummary.totalDeduct > 0) {
      contentLines.push(`• Điểm trừ nề nếp: -${deduct} điểm (${periodSummary.violationCount} lượt)`);
      contentLines.push('  Các nội dung cần lưu ý:');
      violations.forEach((v) => {
        contentLines.push(`  - ${formatVietnameseDate(v.date)}: ${v.behaviorDescription} (-${formatVietnameseNumber(v.totalScore)}đ)`);
      });
    }

    if (periodSummary.totalBonus > 0) {
      contentLines.push(`• Điểm cộng thi đua: +${bonus} điểm`);
      contentLines.push('  Biểu dương việc tốt / thành tích:');
      bonuses.forEach((b) => {
        contentLines.push(`  + ${formatVietnameseDate(b.date)}: ${b.behaviorDescription} (+${formatVietnameseNumber(b.totalScore)}đ)`);
      });
    }

    // Positive and cooperative closing statement
    contentLines.push('');
    if (periodSummary.totalDeduct === 0 && periodSummary.totalBonus > 0) {
      contentLines.push(
        `Lời nhắn từ GVCN: Trong ${periodText}, em ${currentStudent.firstName} đã có ý thức rèn luyện rất xuất sắc, tích cực tham gia các phong trào và hoàn thành tốt nhiệm vụ. Thầy biểu dương tinh thần của em và mong gia đình tiếp tục khích lệ em phát huy!`
      );
    } else if (periodSummary.totalDeduct === 0) {
      contentLines.push(
        `Lời nhắn từ GVCN: Trong ${periodText}, em ${currentStudent.firstName} chấp hành nghiêm túc mọi nội quy trường lớp, giữ vững nền nếp học tập tốt. Thầy rất yên tâm và cảm ơn sự phối hợp từ Quý phụ huynh!`
      );
    } else if (periodSummary.finalScore >= 8) {
      contentLines.push(
        `Lời nhắn từ GVCN: Về cơ bản em ${currentStudent.firstName} có tinh thần tự giác tốt. Nhờ gia đình nhắc nhở thêm em chú ý một vài lỗi nhỏ nêu trên để tuần tới đạt kết quả hoàn hảo hơn.`
      );
    } else {
      contentLines.push(
        `Lời nhắn từ GVCN: Thầy mong Quý phụ huynh cùng đồng hành, nhắc nhở và động viên em ${currentStudent.firstName} khắc phục kịp thời các vi phạm nề nếp nêu trên để kết quả rèn luyện tiến bộ hơn trong thời gian tới.`
      );
    }

    if (teacherPersonalNote.trim()) {
      contentLines.push('');
      contentLines.push(`Ghi chú thêm: ${teacherPersonalNote.trim()}`);
    }

    contentLines.push('');
    contentLines.push(`Trân trọng cảm ơn sự phối hợp chặt chẽ của Quý gia đình!`);
    contentLines.push(`GVCN: Nguyễn Văn Sang • Lớp ${classConfig.className}`);

    return contentLines.join('\n');
  }, [currentStudent, periodSummary, periodLogs, reportPeriod, selectedWeek, selectedMonth, classConfig, teacherPersonalNote]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyImageCard = async () => {
    if (!reportCardRef.current || isCapturingImage) return;
    try {
      setIsCapturingImage(true);
      const blob = await toBlob(reportCardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      if (blob && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setImageCopied(true);
        setTimeout(() => setImageCopied(false), 4000);
      } else if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `Phieu_ren_luyen_${currentStudent?.fullName || 'HS'}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setImageCopied(true);
        setTimeout(() => setImageCopied(false), 4000);
      }
    } catch (err) {
      console.error('Failed to copy image card:', err);
    } finally {
      setIsCapturingImage(false);
    }
  };

  const rankBadge = periodSummary ? getRankBadgeClass(periodSummary.rank) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquareShare className="h-5 w-5 text-blue-600" />
            <span>Tạo Báo Cáo & Tin Nhắn Gửi Phụ Huynh</span>
          </h2>
          <p className="text-xs text-slate-500">
            Tin nhắn tiếng Việt lịch sự, xây dựng, chính xác theo nhật ký rèn luyện • Nhấn Sao chép để gửi qua Zalo/SMS
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Mode */}
          <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setReportPeriod('week')}
              className={`px-3 py-1.5 rounded-lg transition ${
                reportPeriod === 'week'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Báo cáo tuần
            </button>
            <button
              onClick={() => setReportPeriod('month')}
              className={`px-3 py-1.5 rounded-lg transition ${
                reportPeriod === 'month'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Báo cáo tháng
            </button>
          </div>

          {/* Month selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 font-medium">Tháng:</span>
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

          {/* Week selector */}
          {reportPeriod === 'week' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 font-medium">Tuần:</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {availableWeeks.map((w) => (
                  <option key={w.weekNumber} value={w.weekNumber} className="dark:bg-slate-800">
                    Tuần {w.weekNumber}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout: Student selector on left, Message Preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student Selector List */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Chọn Học Sinh ({students.length})
            </span>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setStudentSortBy('name')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  studentSortBy === 'name'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
                }`}
                title="Xếp theo Tên A-Z"
              >
                Tên A-Z
              </button>
              <button
                type="button"
                onClick={() => setStudentSortBy('code')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  studentSortBy === 'code'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
                }`}
                title="Xếp theo Mã HS"
              >
                Mã HS
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã HS..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {filteredStudents.map((s, idx) => {
              const isSelected = s.id === currentStudent?.id;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedStudentId(s.id);
                    setCopied(false);
                  }}
                  className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs transition ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] opacity-70 w-5 font-mono">{idx + 1}</span>
                    <span>{s.fullName}</span>
                  </div>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    {s.studentCode}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Message Preview & Quick Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Browse Bar */}
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevStudent}
                disabled={studentIndex <= 0}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-30 rounded-lg"
                title="Học sinh trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-bold text-slate-900 dark:text-white">
                {studentIndex + 1} / {students.length}: {currentStudent?.fullName} ({currentStudent?.studentCode})
              </span>
              <button
                onClick={handleNextStudent}
                disabled={studentIndex >= students.length - 1}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-30 rounded-lg"
                title="Học sinh kế tiếp"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Rank Badge */}
            {periodSummary && rankBadge && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 hidden sm:inline">Điểm:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatVietnameseNumber(periodSummary.finalScore)}đ
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rankBadge.bg} ${rankBadge.text} ${rankBadge.border}`}>
                  {periodSummary.rank}
                </span>
              </div>
            )}
          </div>

          {/* Editable Additional Note */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Thêm lời nhắn riêng của giáo viên cho phụ huynh học sinh này (Tùy chọn):
            </label>
            <input
              type="text"
              placeholder="vd: Nhờ gia đình theo dõi giờ giấc đi ngủ của con; Tuần này con có nhiều tiến bộ..."
              value={teacherPersonalNote}
              onChange={(e) => setTeacherPersonalNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Message Preview Box */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nội Dung Tin Nhắn Sẵn Sàng Gửi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyImageCard}
                  disabled={isCapturingImage}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                    imageCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                  }`}
                  title="Sao chép ảnh phiếu để gửi Zalo cho phụ huynh học sinh này"
                >
                  {imageCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  <span>{imageCopied ? 'Đã sao chép ảnh!' : 'Sao chép ảnh phiếu'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Đã sao chép tin nhắn!' : 'Sao chép tin nhắn'}</span>
                </button>
              </div>
            </div>

            {/* Formatted Textarea with export ref */}
            <div
              ref={reportCardRef}
              className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-xl border border-slate-200 dark:border-slate-750 font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto font-mono"
            >
              {generatedMessage}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="flex items-center gap-1">
                <HeartHandshake className="h-4 w-4 text-emerald-500" />
                <span>Nội dung khuyến khích sự đồng hành tích cực giữa gia đình và nhà trường</span>
              </span>
              <span>SĐT Phụ huynh: <strong>{currentStudent?.parentPhone || 'Chưa cập nhật'}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
