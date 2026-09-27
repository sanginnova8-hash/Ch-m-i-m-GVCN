import React, { useRef, useState } from 'react';
import {
  X,
  Copy,
  Download,
  Check,
  Share2,
  Sparkles,
  Award,
  Users,
  Eye,
  EyeOff,
  MessageSquare,
  FileText,
  Calendar,
  AlertCircle,
  HelpCircle,
  Trophy,
} from 'lucide-react';
import { toBlob, toPng } from 'html-to-image';
import { formatVietnameseDate, formatVietnameseNumber, getRankBadgeClass } from '../lib/utils';
import { RankLevel } from '../types';

export interface ZaloExportStudentRow {
  stt: number;
  studentCode: string;
  fullName: string;
  dateOfBirth?: string;
  violationCount?: number;
  totalDeduct?: number;
  totalBonus?: number;
  achievementBonus?: number;
  achievements?: string[];
  finalScore: number;
  rank: RankLevel;
  notes?: string;
  monthlyScores?: Record<number, number | null>;
}

export interface SummaryZaloExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodType: 'weekly' | 'monthly' | 'semester';
  periodTitle: string; // e.g., "Tuần 1", "Tháng 9", "Học kỳ 1"
  periodTimeInfo?: string; // e.g., "Từ 05/09/2025 đến 11/09/2025"
  className: string;
  schoolYear: string;
  homeroomTeacher: string;
  stats: {
    totalStudents: number;
    avgScore: number;
    excellentCount: number;
    goodCount: number;
    fairCount: number;
    mediumCount: number;
    weakCount: number;
    totalViolations?: number;
    totalDeduct?: number;
    totalBonus?: number;
    totalAchievementBonus?: number;
  };
  students: ZaloExportStudentRow[];
  semesterMonths?: number[];
}

export const SummaryZaloExportModal: React.FC<SummaryZaloExportModalProps> = ({
  isOpen,
  onClose,
  periodType,
  periodTitle,
  periodTimeInfo,
  className,
  schoolYear,
  homeroomTeacher,
  stats,
  students,
  semesterMonths,
}) => {
  const exportCardRef = useRef<HTMLDivElement>(null);

  // Modal customization options
  const [showScoreDetails, setShowScoreDetails] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'honors'>('all');
  const [showStatsCard, setShowStatsCard] = useState<boolean>(true);
  const [includeTeacherNote, setIncludeTeacherNote] = useState<boolean>(true);

  const defaultTeacherNote =
    periodType === 'weekly'
      ? `Kính gửi Quý Phụ huynh lớp ${className}! Đây là bảng tổng kết điểm nề nếp rèn luyện tuần vừa qua của các em học sinh. Kính mong Quý Phụ huynh luôn phối hợp, đồng hành nhắc nhở và động viên các con giữ vững nề nếp, tích cực phát huy các ưu điểm trong tuần tới!`
      : periodType === 'monthly'
      ? `Kính gửi Quý Phụ huynh lớp ${className}! Giáo viên chủ nhiệm trân trọng gửi tới Quý Phụ huynh kết quả rèn luyện trong ${periodTitle}. Chúc mừng các em học sinh có thành tích xuất sắc và mong các con tiếp tục nỗ lực rèn luyện tốt trong tháng tiếp theo!`
      : `Kính gửi Quý Phụ huynh lớp ${className}! Giáo viên chủ nhiệm trân trọng gửi tới Quý Phụ huynh bảng tổng kết đánh giá điểm rèn luyện ${periodTitle} - Năm học ${schoolYear}. Chân thành cảm ơn sự tin tưởng, đồng hành của Quý Phụ huynh suốt kỳ học qua!`;

  const [teacherNote, setTeacherNote] = useState<string>(defaultTeacherNote);
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  // Copy & download status state
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [textCopied, setTextCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter students based on filterMode
  const displayedStudents =
    filterMode === 'honors'
      ? students.filter((s) => s.rank === 'Xuất sắc' || s.rank === 'Tốt' || (s.achievements && s.achievements.length > 0))
      : students;

  const typeLabel =
    periodType === 'weekly' ? 'Tuần' : periodType === 'monthly' ? 'Tháng' : 'Học kỳ';

  const generateFileName = () => {
    const safeTitle = periodTitle.replace(/\s+/g, '_');
    return `Tong_ket_${typeLabel}_${safeTitle}_Lop_${className}_${schoolYear}`.replace(/[^a-zA-Z0-9_-]/g, '');
  };

  // Sao chép hình ảnh vào clipboard (để paste trực tiếp vào Zalo: Ctrl + V)
  const handleCopyImage = async () => {
    if (!exportCardRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      setErrorMsg(null);

      // Render to PNG blob with 2x resolution for crisp high-DPI display on Zalo
      const blob = await toBlob(exportCardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      if (!blob) {
        throw new Error('Không thể tạo file ảnh từ giao diện.');
      }

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
            }),
          ]);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 5000);
        } catch (clipboardErr) {
          console.warn('Clipboard write error, falling back to download:', clipboardErr);
          // If browser blocked clipboard, trigger automatic download
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${generateFileName()}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          setErrorMsg(
            'Trình duyệt hạn chế dán tự động, ảnh đã được tải về máy của bạn để gửi vào Zalo!'
          );
          setTimeout(() => setErrorMsg(null), 6000);
        }
      } else {
        // Fallback for browsers without ClipboardItem API
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${generateFileName()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setErrorMsg('Đã tải ảnh về máy để bạn đính kèm vào tin nhắn Zalo!');
        setTimeout(() => setErrorMsg(null), 5000);
      }
    } catch (err: any) {
      console.error('Failed to copy image:', err);
      setErrorMsg('Có lỗi xảy ra khi tạo hình ảnh: ' + (err?.message || 'Vui lòng thử lại.'));
    } finally {
      setIsCapturing(false);
    }
  };

  // Tải hình ảnh về máy (.PNG)
  const handleDownloadImage = async () => {
    if (!exportCardRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      setErrorMsg(null);

      const dataUrl = await toPng(exportCardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `${generateFileName()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error('Failed to download image:', err);
      setErrorMsg('Không thể tải ảnh về máy: ' + (err?.message || 'Vui lòng thử lại.'));
    } finally {
      setIsCapturing(false);
    }
  };

  // Sao chép tin nhắn văn bản tóm tắt để gửi kèm ảnh vào Zalo
  const handleCopyTextCaption = () => {
    const text = [
      `📢 [BÁO CÁO TỔNG KẾT RÈN LUYỆN ${periodTitle.toUpperCase()} - LỚP ${className.toUpperCase()}]`,
      `🏫 Năm học: ${schoolYear} | GVCN: ${homeroomTeacher || 'GVCN'}`,
      periodTimeInfo ? `🗓️ Thời gian: ${periodTimeInfo}` : '',
      `---------------------------------`,
      `📊 KẾT QUẢ CHUNG:`,
      `• Sĩ số: ${stats.totalStudents} học sinh`,
      `• Điểm trung bình cả lớp: ${formatVietnameseNumber(stats.avgScore)}/10.0`,
      `• Đạt Xuất sắc: ${stats.excellentCount} HS | Đạt Tốt: ${stats.goodCount} HS`,
      stats.fairCount > 0 ? `• Đạt Khá: ${stats.fairCount} HS` : '',
      stats.mediumCount > 0 ? `• Trung bình: ${stats.mediumCount} HS` : '',
      stats.weakCount > 0 ? `• Cần cố gắng: ${stats.weakCount} HS` : '',
      stats.totalAchievementBonus ? `• Thưởng thành tích: +${formatVietnameseNumber(stats.totalAchievementBonus)}đ` : '',
      `---------------------------------`,
      includeTeacherNote && teacherNote ? `💬 LỜI NHẮN GVCN:\n"${teacherNote}"\n---------------------------------` : '',
      `📌 (Kính mời Quý Phụ huynh xem chi tiết điểm và xếp loại từng học sinh trong hình ảnh đính kèm bên dưới).`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Topbar */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-white/15 backdrop-blur-md rounded-xl">
              <Share2 className="h-5 w-5 text-white" />
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight flex items-center gap-2">
                <span>Sao Chép Hình Ảnh Báo Cáo Gửi Zalo Phụ Huynh</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/20">
                  {periodTitle}
                </span>
              </h3>
              <p className="text-xs text-blue-100 opacity-90 mt-0.5">
                Tạo ảnh đẹp, sắc nét 2x để dán (Ctrl + V) hoặc gửi ngay vào nhóm Zalo lớp {className}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Controls & Options Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Display toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl p-0.5 bg-slate-200 dark:bg-slate-700 font-medium">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Cả lớp ({students.length})
              </button>
              <button
                onClick={() => setFilterMode('honors')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  filterMode === 'honors'
                    ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span>Bảng vinh danh ({stats.excellentCount + stats.goodCount})</span>
              </button>
            </div>

            {periodType !== 'semester' && (
              <button
                onClick={() => setShowScoreDetails(!showScoreDetails)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
                  showScoreDetails
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 font-semibold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title="Bật/Tắt hiển thị cột điểm trừ và điểm cộng chi tiết"
              >
                {showScoreDetails ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span>{showScoreDetails ? 'Chi tiết Điểm +/-: BẬT' : 'Thu gọn điểm: TẮT'}</span>
              </button>
            )}

            <button
              onClick={() => setShowStatsCard(!showStatsCard)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
                showStatsCard
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>Thống kê lớp: {showStatsCard ? 'HIỆN' : 'ẨN'}</span>
            </button>

            <button
              onClick={() => setIncludeTeacherNote(!includeTeacherNote)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
                includeTeacherNote
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Lời nhắn GVCN: {includeTeacherNote ? 'CÓ' : 'KHÔNG'}</span>
            </button>
          </div>

          {/* Main Primary Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleCopyTextCaption}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold transition ${
                textCopied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
              title="Sao chép lời nhắn tóm tắt văn bản để dán cùng ảnh vào Zalo"
            >
              {textCopied ? <Check className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              <span>{textCopied ? 'Đã sao chép lời nhắn' : 'Copy lời nhắn text'}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={isCapturing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition"
              title="Tải ảnh PNG độ nét cao về máy"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Tải ảnh PNG</span>
            </button>

            <button
              onClick={handleCopyImage}
              disabled={isCapturing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold shadow-md transition transform active:scale-95 ${
                copySuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 ring-2 ring-emerald-300'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
              }`}
            >
              {isCapturing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý ảnh...</span>
                </>
              ) : copySuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Đã sao chép ảnh! (Dán Ctrl+V vào Zalo)</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Sao chép ảnh gửi Zalo (Ctrl+V)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications / Feedback Bar */}
        {copySuccess && (
          <div className="px-5 py-2.5 bg-emerald-500 text-white font-medium text-xs flex items-center justify-between animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>
                <strong>Tuyệt vời!</strong> Ảnh đã được sao chép vào bộ nhớ tạm. Bạn hãy mở nhóm Zalo phụ huynh và bấm <strong>Ctrl + V</strong> (hoặc nhấn giữ chọn Dán) để gửi ngay ảnh này!
              </span>
            </div>
            <button onClick={() => setCopySuccess(false)} className="text-white/80 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="px-5 py-2.5 bg-amber-500 text-white font-medium text-xs flex items-center justify-between animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-white/80 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Teacher Note edit accordion if enabled */}
        {includeTeacherNote && (
          <div className="px-5 py-2.5 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 text-xs shrink-0 flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                  <span>Lời nhắn của Giáo viên gửi Phụ huynh kèm trong ảnh:</span>
                </span>
                <button
                  onClick={() => setIsEditingNote(!isEditingNote)}
                  className="text-blue-600 hover:text-blue-800 font-medium underline ml-2"
                >
                  {isEditingNote ? 'Thu nhỏ' : 'Chỉnh sửa lời nhắn'}
                </button>
              </div>

              {isEditingNote ? (
                <div className="space-y-1.5 mt-1">
                  <textarea
                    value={teacherNote}
                    onChange={(e) => setTeacherNote(e.target.value)}
                    rows={2}
                    className="w-full p-2 text-xs border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-blue-500"
                    placeholder="Nhập lời nhắn gửi phụ huynh..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setTeacherNote(defaultTeacherNote)}
                      className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700"
                    >
                      Khôi phục lời nhắn mẫu
                    </button>
                    <button
                      onClick={() => setIsEditingNote(false)}
                      className="px-3 py-1 bg-amber-600 text-white rounded-md text-[11px] font-bold"
                    >
                      Xong
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-300 italic line-clamp-1">
                  "{teacherNote}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-200/70 dark:bg-slate-950 flex justify-center">
          {/* THE EXPORTABLE CARD
              This div has fixed clean styling with white background, sharp typography,
              and high contrast so it converts into a picture-perfect image regardless of dark mode. */}
          <div
            ref={exportCardRef}
            className="w-full max-w-[960px] bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 font-sans"
            style={{ minWidth: '780px' }}
          >
            {/* Top Brand / School Header */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-blue-600">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                    {className.slice(0, 3)}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-blue-900">
                      LỚP {className} • NĂM HỌC {schoolYear}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Giáo viên chủ nhiệm: <strong className="text-slate-800">{homeroomTeacher || 'GVCN'}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-800 font-bold text-xs rounded-full border border-blue-200">
                  HỆ THỐNG NỀ NẾP & RÈN LUYỆN
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ngày lập: {formatVietnameseDate(new Date().toISOString().slice(0, 10))}
                </p>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="text-center my-5">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                BẢNG TỔNG KẾT ĐIỂM RÈN LUYỆN - {periodTitle.toUpperCase()}
              </h2>
              {periodTimeInfo && (
                <p className="text-xs font-semibold text-blue-700 mt-1">
                  Thời gian: {periodTimeInfo}
                </p>
              )}
              {filterMode === 'honors' && (
                <p className="inline-block mt-1.5 px-3 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-full">
                  🏆 DANH SÁCH VINH DANH HỌC SINH TIÊU BIỂU & ĐẠT THÀNH TÍCH
                </p>
              )}
            </div>

            {/* Quick KPI Stats Summary Cards */}
            {showStatsCard && (
              <div className="grid grid-cols-4 gap-3 mb-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-center p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-semibold block">Sĩ số theo dõi</span>
                  <span className="text-lg font-black text-slate-800">{stats.totalStudents} HS</span>
                </div>
                <div className="text-center p-2 bg-white rounded-lg border border-blue-200 shadow-2xs">
                  <span className="text-[11px] text-blue-600 font-semibold block">Điểm trung bình</span>
                  <span className="text-lg font-black text-blue-700">
                    {formatVietnameseNumber(stats.avgScore)}
                  </span>
                </div>
                <div className="text-center p-2 bg-white rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="text-[11px] text-emerald-600 font-semibold block">Đạt Xuất sắc & Tốt</span>
                  <span className="text-lg font-black text-emerald-700">
                    {stats.excellentCount + stats.goodCount} HS ({Math.round(((stats.excellentCount + stats.goodCount) / (stats.totalStudents || 1)) * 100)}%)
                  </span>
                </div>
                <div className="text-center p-2 bg-white rounded-lg border border-amber-200 shadow-2xs">
                  <span className="text-[11px] text-amber-600 font-semibold block">Khen thưởng thành tích</span>
                  <span className="text-lg font-black text-amber-700">
                    +{formatVietnameseNumber(stats.totalAchievementBonus || 0)}đ
                  </span>
                </div>
              </div>
            )}

            {/* Main Students Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs mb-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-10">STT</th>
                    <th className="py-2.5 px-3 w-20">Mã HS</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    
                    {/* Period specific columns */}
                    {periodType === 'semester' && semesterMonths ? (
                      semesterMonths.map((m) => (
                        <th key={m} className="py-2.5 px-2 text-center">
                          T{m}
                        </th>
                      ))
                    ) : (
                      showScoreDetails && (
                        <>
                          <th className="py-2.5 px-2 text-center text-rose-700">Điểm trừ (-)</th>
                          <th className="py-2.5 px-2 text-center text-emerald-700">Điểm cộng (+)</th>
                          <th className="py-2.5 px-2 text-center text-amber-700">Thưởng 🏆</th>
                        </>
                      )
                    )}

                    <th className="py-2.5 px-3 text-center">Điểm TK</th>
                    <th className="py-2.5 px-3 text-center">Xếp loại</th>
                    <th className="py-2.5 px-3">Khen thưởng / Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {displayedStudents.map((st, idx) => {
                    const isExcellent = st.rank === 'Xuất sắc';
                    const isGood = st.rank === 'Tốt';

                    return (
                      <tr
                        key={st.studentCode + idx}
                        className={
                          isExcellent
                            ? 'bg-amber-50/40 hover:bg-amber-50'
                            : idx % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/60'
                        }
                      >
                        <td className="py-2 px-3 text-center text-slate-500 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                          {st.studentCode}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{st.fullName}</span>
                          {isExcellent && <Award className="h-3.5 w-3.5 text-amber-500 inline shrink-0" />}
                        </td>

                        {/* Semester monthly scores */}
                        {periodType === 'semester' && semesterMonths ? (
                          semesterMonths.map((m) => {
                            const sc = st.monthlyScores ? st.monthlyScores[m] : null;
                            return (
                              <td key={m} className="py-2 px-2 text-center font-semibold text-slate-700">
                                {sc !== null && sc !== undefined ? formatVietnameseNumber(sc) : '—'}
                              </td>
                            );
                          })
                        ) : (
                          showScoreDetails && (
                            <>
                              <td className="py-2 px-2 text-center text-rose-600 font-semibold">
                                {st.totalDeduct && st.totalDeduct > 0 ? `-${formatVietnameseNumber(st.totalDeduct)}` : '0'}
                              </td>
                              <td className="py-2 px-2 text-center text-emerald-600 font-semibold">
                                {st.totalBonus && st.totalBonus > 0 ? `+${formatVietnameseNumber(st.totalBonus - (st.achievementBonus || 0))}` : '0'}
                              </td>
                              <td className="py-2 px-2 text-center text-amber-600 font-bold">
                                {st.achievementBonus && st.achievementBonus > 0 ? `+${formatVietnameseNumber(st.achievementBonus)}` : '—'}
                              </td>
                            </>
                          )
                        )}

                        {/* Final Score */}
                        <td className="py-2 px-3 text-center font-black text-sm text-slate-900">
                          {formatVietnameseNumber(st.finalScore)}
                        </td>

                        {/* Rank Badge */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs ${
                              st.rank === 'Xuất sắc'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : st.rank === 'Tốt'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : st.rank === 'Khá'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : st.rank === 'Trung bình'
                                ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}
                          >
                            {st.rank}
                          </span>
                        </td>

                        {/* Achievements / Note */}
                        <td className="py-2 px-3 text-[11px]">
                          {st.achievements && st.achievements.length > 0 ? (
                            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                              🏆 {st.achievements.join('; ')}
                            </span>
                          ) : st.notes ? (
                            <span className="text-slate-600 italic">{st.notes}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Teacher's Note Section in the image */}
            {includeTeacherNote && teacherNote && (
              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-950 mb-5">
                <span className="font-bold flex items-center gap-1.5 text-blue-900 mb-1">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span>Lời nhắn từ Giáo viên chủ nhiệm gửi Quý Phụ huynh:</span>
                </span>
                <p className="italic leading-relaxed">
                  "{teacherNote}"
                </p>
              </div>
            )}

            {/* Document Signature & Footer */}
            <div className="flex items-end justify-between pt-4 border-t border-slate-200 text-xs text-slate-600">
              <div>
                <p className="font-semibold text-slate-800">Trường THPT / THCS</p>
                <p className="text-[11px] text-slate-500">Lớp: {className} • Năm học: {schoolYear}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  * Bảng tổng kết được xuất tự động từ Hệ thống Quản lý Nề nếp Lớp học.
                </p>
              </div>

              <div className="text-center min-w-[200px]">
                <p className="text-[11px] italic text-slate-500">
                  Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </p>
                <p className="font-bold text-slate-800 mt-0.5 uppercase tracking-wide">
                  GIÁO VIÊN CHỦ NHIỆM
                </p>
                <div className="h-10 flex items-center justify-center">
                  <span className="font-serif italic text-blue-800 text-sm font-bold opacity-80">
                    {homeroomTeacher || 'GVCN'}
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-xs">{homeroomTeacher || 'GVCN'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Guide */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <span>
              Mẹo Zalo: Nhấn nút <strong>"Sao chép ảnh gửi Zalo"</strong> rồi sang Zalo mở nhóm phụ huynh ấn <strong>Ctrl + V</strong> để dán ảnh tức thì!
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition"
            >
              Đóng
            </button>
            <button
              onClick={handleCopyImage}
              disabled={isCapturing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Copy className="h-4 w-4" />
              <span>{copySuccess ? 'Đã sao chép ảnh' : 'Sao chép ảnh Zalo (Ctrl+V)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
