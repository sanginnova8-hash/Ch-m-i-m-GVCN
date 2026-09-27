import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  Calendar,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student, BehaviorCategory, BehaviorType, DisciplineLog } from '../types';
import {
  removeVietnameseAccents,
  formatVietnameseDate,
  formatVietnameseNumber,
  parseFlexibleDate,
  downloadDisciplineLogTemplate,
} from '../lib/utils';

interface ParsedDisciplineRow {
  rowNum: number;
  rawDate: string;
  parsedDate: string;
  month: number;
  weekNumber: number;
  rawStudentCode: string;
  rawStudentName: string;
  matchedStudent: Student | null;
  behaviorCode: string;
  behaviorDescription: string;
  type: BehaviorType;
  scorePerUnit: number;
  count: number;
  totalScore: number;
  periodOrTime: string;
  reporter: string;
  basisOrRegulation: string;
  note: string;
  isValid: boolean;
  errorMsg: string;
}

interface ImportDisciplineLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportDisciplineLogsModal: React.FC<ImportDisciplineLogsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    students,
    behaviorCategories,
    classConfig,
    importDisciplineLogsBatch,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedDisciplineRow[]>([]);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'invalid'>('all');
  const [skipErrors, setSkipErrors] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>('');
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  // Auto-detect week from date
  const detectWeekFromDate = (dateString: string): number => {
    const target = new Date(dateString).getTime();
    for (const w of classConfig.weeks) {
      const s = new Date(w.startDate).getTime();
      const e = new Date(w.endDate).getTime() + 86400000;
      if (target >= s && target <= e) {
        return w.weekNumber;
      }
    }
    // Fallback: estimate from month
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      const m = d.getMonth() + 1;
      const foundWeek = classConfig.weeks.find((w) => w.month === m);
      if (foundWeek) return foundWeek.weekNumber;
    }
    return 1;
  };

  // Find student by code or name
  const matchStudent = (codeStr: string, nameStr: string): Student | null => {
    const cleanCode = codeStr.trim().toUpperCase();
    if (cleanCode) {
      const byCode = students.find((s) => s.studentCode.trim().toUpperCase() === cleanCode);
      if (byCode) return byCode;
    }

    const cleanName = removeVietnameseAccents(nameStr);
    if (cleanName) {
      const byName = students.find((s) => removeVietnameseAccents(s.fullName) === cleanName);
      if (byName) return byName;

      // Partial name match if unique
      const partialMatches = students.filter((s) =>
        removeVietnameseAccents(s.fullName).includes(cleanName) ||
        cleanName.includes(removeVietnameseAccents(s.fullName))
      );
      if (partialMatches.length === 1) return partialMatches[0];
    }

    return null;
  };

  // Find category by code or name
  const matchCategory = (codeStr: string, descStr: string): BehaviorCategory | null => {
    const cleanCode = codeStr.trim().toUpperCase();
    if (cleanCode) {
      const byCode = behaviorCategories.find((c) => c.code.trim().toUpperCase() === cleanCode);
      if (byCode) return byCode;
    }

    const cleanDesc = removeVietnameseAccents(descStr);
    if (cleanDesc) {
      const byName = behaviorCategories.find(
        (c) => removeVietnameseAccents(c.name) === cleanDesc
      );
      if (byName) return byName;

      // Check keywords
      const byKeyword = behaviorCategories.find((c) =>
        c.keywords?.some((k) => cleanDesc.includes(removeVietnameseAccents(k)))
      );
      if (byKeyword) return byKeyword;
    }

    return null;
  };

  // Parse Excel / CSV file
  const processFile = (file: File) => {
    setParseError('');
    setSelectedFileName(file.name);
    setImportSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('Tệp không chứa bảng tính nào.');
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        });

        if (rawRows.length === 0) {
          throw new Error('Tệp tải lên không có dữ liệu dòng nào.');
        }

        const rows: ParsedDisciplineRow[] = [];

        rawRows.forEach((row, index) => {
          const rowNum = index + 2; // Row number in Excel (header is row 1)

          // 1. Parse Date
          const rawDateVal =
            row['Ngày'] ||
            row['Ngay'] ||
            row['Ngày ghi nhận'] ||
            row['Date'] ||
            row['Thời gian'] ||
            '';
          let parsedDate = parseFlexibleDate(rawDateVal);
          if (!parsedDate) {
            // If date is completely blank, fallback to today's date
            if (!rawDateVal) {
              parsedDate = new Date().toISOString().split('T')[0];
            }
          }

          // 2. Month & Week
          let weekVal = 0;
          const rawWeek = row['Tuần'] || row['Tuan'] || row['Week'] || '';
          if (rawWeek && !isNaN(Number(rawWeek))) {
            weekVal = Number(rawWeek);
          } else if (parsedDate) {
            weekVal = detectWeekFromDate(parsedDate);
          } else {
            weekVal = 1;
          }

          const monthVal = parsedDate ? new Date(parsedDate).getMonth() + 1 : 9;

          // 3. Student
          const rawStudentCode = String(
            row['Mã học sinh'] ||
            row['Ma hoc sinh'] ||
            row['Mã HS'] ||
            row['MaHS'] ||
            row['Mã'] ||
            row['StudentCode'] ||
            ''
          ).trim();

          const rawStudentName = String(
            row['Họ và tên'] ||
            row['Ho va ten'] ||
            row['Họ tên'] ||
            row['Tên học sinh'] ||
            row['Học sinh'] ||
            row['FullName'] ||
            row['Name'] ||
            ''
          ).trim();

          const matchedStudent = matchStudent(rawStudentCode, rawStudentName);

          // 4. Behavior & Category
          const rawBehCode = String(
            row['Mã vi phạm'] ||
            row['Mã lỗi'] ||
            row['Ma loi'] ||
            row['Ma vi pham'] ||
            row['Mã hành vi'] ||
            row['BehaviorCode'] ||
            ''
          ).trim();

          const rawBehDesc = String(
            row['Nội dung lỗi'] ||
            row['Tên lỗi'] ||
            row['Lỗi vi phạm'] ||
            row['Mô tả vi phạm'] ||
            row['Mô tả'] ||
            row['Noi dung'] ||
            row['Mo ta'] ||
            row['Hành vi'] ||
            row['Behavior'] ||
            row['Description'] ||
            ''
          ).trim();

          const matchedCategory = matchCategory(rawBehCode, rawBehDesc);

          // 5. Behavior Type (deduct vs bonus)
          const rawTypeStr = String(
            row['Loại'] ||
            row['Loai'] ||
            row['Loại hành vi'] ||
            row['Type'] ||
            ''
          ).toLowerCase().trim();

          let behType: BehaviorType = 'deduct';
          if (
            rawTypeStr.includes('cộng') ||
            rawTypeStr.includes('bonus') ||
            rawTypeStr.includes('khen') ||
            rawTypeStr === '+'
          ) {
            behType = 'bonus';
          } else if (
            rawTypeStr.includes('trừ') ||
            rawTypeStr.includes('deduct') ||
            rawTypeStr.includes('lỗi') ||
            rawTypeStr.includes('vi phạm') ||
            rawTypeStr === '-'
          ) {
            behType = 'deduct';
          } else if (matchedCategory) {
            behType = matchedCategory.type;
          }

          // 6. Score & Count
          const rawScore = String(
            row['Điểm'] ||
            row['Diem'] ||
            row['Điểm mỗi lần'] ||
            row['Điểm trừ'] ||
            row['Điểm cộng'] ||
            row['Score'] ||
            ''
          ).replace(',', '.');

          let scorePerUnit = matchedCategory ? matchedCategory.defaultScore : 1;
          if (rawScore && !isNaN(parseFloat(rawScore))) {
            scorePerUnit = Math.abs(parseFloat(rawScore));
          }

          const rawCount = String(
            row['Số lần'] ||
            row['So lan'] ||
            row['Lần'] ||
            row['Count'] ||
            '1'
          );
          let count = 1;
          if (rawCount && !isNaN(parseInt(rawCount, 10))) {
            count = Math.max(1, parseInt(rawCount, 10));
          }

          const totalScore = Math.round(scorePerUnit * count * 100) / 100;

          // 7. Extra metadata
          const periodOrTime = String(
            row['Tiết / Thời điểm'] ||
            row['Tiết'] ||
            row['Tiet'] ||
            row['Thời điểm'] ||
            row['Thoi gian'] ||
            row['Period'] ||
            'Tiết 1'
          ).trim();

          const reporter = String(
            row['Người ghi nhận'] ||
            row['Người ghi'] ||
            row['Nguoi ghi'] ||
            row['Người báo cáo'] ||
            row['Nguoi bao cao'] ||
            row['Reporter'] ||
            classConfig.homeroomTeacher ||
            'Giáo viên'
          ).trim();

          const basisOrRegulation = String(
            row['Căn cứ / Quy định'] ||
            row['Căn cứ'] ||
            row['Quy định'] ||
            row['Can cu'] ||
            row['Regulation'] ||
            matchedCategory?.basisOrRegulation ||
            ''
          ).trim();

          const note = String(
            row['Ghi chú'] ||
            row['Ghi chu'] ||
            row['Note'] ||
            ''
          ).trim();

          // 8. Validation checks
          let isValid = true;
          const errorReasons: string[] = [];

          if (!parsedDate) {
            isValid = false;
            errorReasons.push(`Ngày không đúng định dạng (${rawDateVal || 'trống'})`);
          }

          if (!matchedStudent) {
            isValid = false;
            if (rawStudentCode || rawStudentName) {
              errorReasons.push(
                `Không tìm thấy học sinh [${rawStudentCode || ''} ${rawStudentName || ''}] trong lớp`
              );
            } else {
              errorReasons.push('Thiếu mã hoặc họ tên học sinh');
            }
          }

          const resolvedDesc = rawBehDesc || (matchedCategory ? matchedCategory.name : '');
          if (!resolvedDesc && !rawBehCode) {
            isValid = false;
            errorReasons.push('Thiếu mã hoặc mô tả lỗi vi phạm');
          }

          const resolvedCode =
            rawBehCode.toUpperCase() ||
            (matchedCategory ? matchedCategory.code : 'KHT');

          rows.push({
            rowNum,
            rawDate: String(rawDateVal),
            parsedDate: parsedDate || '',
            month: monthVal,
            weekNumber: weekVal,
            rawStudentCode,
            rawStudentName,
            matchedStudent,
            behaviorCode: resolvedCode,
            behaviorDescription: resolvedDesc || 'Hành vi nề nếp khác',
            type: behType,
            scorePerUnit,
            count,
            totalScore,
            periodOrTime,
            reporter,
            basisOrRegulation,
            note,
            isValid,
            errorMsg: errorReasons.join('; '),
          });
        });

        setParsedRows(rows);
      } catch (err: any) {
        setParseError(err.message || 'Lỗi khi đọc file. Vui lòng kiểm tra lại định dạng tệp.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Perform import
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('Không có dòng dữ liệu hợp lệ nào để tải lên.');
      return;
    }

    setIsProcessing(true);
    try {
      const logsPayload = validRows.map((r) => ({
        date: r.parsedDate,
        month: r.month,
        weekNumber: r.weekNumber,
        studentId: r.matchedStudent!.id,
        studentCode: r.matchedStudent!.studentCode,
        studentName: r.matchedStudent!.fullName,
        behaviorCode: r.behaviorCode,
        behaviorDescription: r.behaviorDescription,
        type: r.type,
        scorePerUnit: r.scorePerUnit,
        count: r.count,
        periodOrTime: r.periodOrTime,
        reporter: r.reporter,
        basisOrRegulation: r.basisOrRegulation,
        note: r.note,
      }));

      const res = await importDisciplineLogsBatch(logsPayload);
      setImportSuccessCount(res.imported);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      alert('Lỗi khi lưu dữ liệu nhật ký: ' + (err.message || String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  const displayedRows = parsedRows.filter((r) => {
    if (filterView === 'valid') return r.isValid;
    if (filterView === 'invalid') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-5 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/80 dark:bg-slate-750/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-2xl shadow-xs">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Tải Lên Nhật Ký Lỗi / Nề Nếp
              </h2>
              <p className="text-xs text-slate-500">
                Nhập danh sách vi phạm, điểm trừ hoặc khen thưởng hàng ngày từ tệp Excel (.xlsx) hoặc CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 scrollbar-thin flex-1">
          {/* File Upload Zone */}
          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-slate-300 dark:border-slate-650 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-750/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="p-4 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Kéo & thả tệp Excel/CSV vào đây, hoặc{' '}
                    <span className="text-blue-600 dark:text-blue-400 underline font-bold">chọn tệp từ máy tính</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ các định dạng .xlsx, .xls, .csv
                  </p>
                </div>
              </div>

              {parseError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Template Download & Column Guide */}
              <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
                    Chưa có tệp định dạng chuẩn?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tải mẫu Excel chuẩn với các cột: Ngày, Mã HS, Họ và tên, Mã lỗi, Nội dung lỗi, Loại (Trừ/Cộng), Điểm, Tiết, Người ghi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadDisciplineLogTemplate}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
                >
                  <Download className="h-4 w-4" />
                  <span>Tải tệp mẫu Excel</span>
                </button>
              </div>

              {/* Matching Rules Info */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                <p className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Quy tắc tự động nhận diện thông minh:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1 text-[11px]">
                  <li>
                    <strong>Nhận diện học sinh:</strong> Tự động khớp theo <em>Mã học sinh</em> (HS001, HS002...) hoặc theo <em>Họ và tên</em> (không phân biệt chữ hoa/thường và dấu).
                  </li>
                  <li>
                    <strong>Nhận diện ngày & tuần:</strong> Tự động chuyển đổi định dạng <code>DD/MM/YYYY</code> hoặc ngày Excel, và tự suy ra tuần học (Tuần 1 - 35) tương ứng trong niên khóa.
                  </li>
                  <li>
                    <strong>Danh mục lỗi:</strong> Tự nhận diện mã vi phạm (KTB, DHM, ...) hoặc tra cứu theo từ khóa trong danh mục nề nếp đã cấu hình.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info & Change File */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedFileName}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({parsedRows.length} dòng dữ liệu)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadDisciplineLogTemplate}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải tệp mẫu</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    onClick={() => {
                      setParsedRows([]);
                      setSelectedFileName('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Chọn tệp khác
                  </button>
                </div>
              </div>

              {/* Status Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFilterView('all')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    filterView === 'all'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <p className="text-[11px] text-slate-500 font-medium">Tổng bản ghi</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">
                    {parsedRows.length}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterView('valid')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    filterView === 'valid'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Hợp lệ (Sẵn sàng)
                  </p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {validCount}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterView('invalid')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    filterView === 'invalid'
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Cần xem lại
                  </p>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {invalidCount}
                  </p>
                </button>
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[360px] scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Dòng</th>
                        <th className="py-2.5 px-3 w-28">Trạng thái</th>
                        <th className="py-2.5 px-3 w-28">Ngày & Tuần</th>
                        <th className="py-2.5 px-3">Học sinh khớp</th>
                        <th className="py-2.5 px-3">Hành vi & Mã</th>
                        <th className="py-2.5 px-3 text-center">Loại</th>
                        <th className="py-2.5 px-3 text-right">Điểm</th>
                        <th className="py-2.5 px-3">Người ghi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Không có dòng nào phù hợp với bộ lọc hiển thị.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row) => (
                          <tr
                            key={row.rowNum}
                            className={`transition-colors ${
                              !row.isValid
                                ? 'bg-rose-50/50 dark:bg-rose-950/20'
                                : 'hover:bg-slate-50/60 dark:hover:bg-slate-750/40'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {row.rowNum}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Hợp lệ
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800"
                                  title={row.errorMsg}
                                >
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[120px]">{row.errorMsg}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {formatVietnameseDate(row.parsedDate) || row.rawDate}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Tuần {row.weekNumber} (T{row.month})
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {row.matchedStudent ? (
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {row.matchedStudent.fullName}
                                  </div>
                                  <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                                    {row.matchedStudent.studentCode}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="text-rose-600 font-medium line-through">
                                    {row.rawStudentName || '(Chưa có tên)'}
                                  </div>
                                  <div className="text-[10px] text-rose-500 font-mono">
                                    {row.rawStudentCode || '(Chưa có mã)'}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {row.behaviorDescription}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Mã: {row.behaviorCode}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {row.type === 'deduct' ? (
                                <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                                  Trừ
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                  Cộng
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {row.type === 'deduct' ? (
                                <span className="text-rose-600">
                                  -{formatVietnameseNumber(row.totalScore)}
                                </span>
                              ) : (
                                <span className="text-emerald-600">
                                  +{formatVietnameseNumber(row.totalScore)}
                                </span>
                              )}
                              {row.count > 1 && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  ({row.count} lần x {formatVietnameseNumber(row.scorePerUnit)})
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              <div>{row.reporter}</div>
                              {row.periodOrTime && (
                                <div className="text-[10px] text-slate-400">{row.periodOrTime}</div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Skip Errors Checkbox */}
              {invalidCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <input
                    type="checkbox"
                    id="skipErrors"
                    checked={skipErrors}
                    onChange={(e) => setSkipErrors(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="skipErrors" className="cursor-pointer">
                    Bỏ qua <strong>{invalidCount}</strong> dòng không hợp lệ và chỉ tải lên{' '}
                    <strong>{validCount}</strong> dòng hợp lệ
                  </label>
                </div>
              )}

              {/* Success Notification */}
              {importSuccessCount !== null && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>
                    Đã tải lên thành công <strong>{importSuccessCount}</strong> bản ghi nhật ký nề nếp vào sổ!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Đóng
          </button>

          {parsedRows.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing || (skipErrors ? validCount === 0 : invalidCount > 0)}
                onClick={handleConfirmImport}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4" />
                <span>
                  {isProcessing
                    ? 'Đang nhập dữ liệu...'
                    : `Xác nhận tải lên ${validCount} bản ghi`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
