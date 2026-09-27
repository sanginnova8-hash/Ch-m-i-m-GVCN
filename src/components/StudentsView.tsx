import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  Search,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Phone,
  MessageSquare,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDown01,
  ArrowUp10,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student, StudentStatus } from '../types';
import {
  formatVietnameseDate,
  formatVietnameseNumber,
  removeVietnameseAccents,
  exportToExcel,
  exportToCsv,
  downloadStudentTemplate,
  getRankBadgeClass,
  compareVietnameseNames,
  compareStudentCodes,
} from '../lib/utils';
import { TabType } from './Navbar';

interface StudentsViewProps {
  onNavigateTab: (tab: TabType) => void;
  onSelectStudentForReport?: (studentId: string) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  onNavigateTab,
  onSelectStudentForReport,
}) => {
  const {
    students,
    disciplineLogs,
    classConfig,
    addStudent,
    updateStudent,
    deleteStudent,
    deleteStudentsBatch,
    toggleStudentStatus,
    importStudentsBatch,
    getStudentLogs,
    getWeeklySummary,
    getMonthlySummary,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('all');

  // Multi-selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  // Delete confirm modal: null or { type: 'single' | 'batch', ids: string[], deleteLogs: boolean }
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    type: 'single' | 'batch';
    ids: string[];
    deleteLogs: boolean;
    namesSummary: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Add student form
  const [studentCode, setStudentCode] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  // File import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<Array<{
    rowNum: number;
    studentCode: string;
    lastName: string;
    firstName: string;
    fullName: string;
    dateOfBirth?: string;
    gender?: 'Nam' | 'Nữ';
    parentName?: string;
    parentPhone?: string;
    isValid: boolean;
    errorMsg?: string;
  }>>([]);
  const [importSummary, setImportSummary] = useState<{ total: number; valid: number; error: number } | null>(null);

  // Sorting state:
  // 'code': Xếp theo mã học sinh
  // 'name': Xếp theo họ và tên (chuẩn bảng chữ cái tiếng Việt, ưu tiên tên chính)
  // 'default': Thứ tự ban đầu
  const [sortField, setSortField] = useState<'name' | 'code' | 'default'>(() => {
    const saved = localStorage.getItem('class_students_sort_field');
    if (saved === 'name' || saved === 'code' || saved === 'default') return saved;
    return 'default';
  });

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('class_students_sort_dir');
    return saved === 'desc' ? 'desc' : 'asc';
  });

  const handleSortChange = (field: 'name' | 'code' | 'default', direction?: 'asc' | 'desc') => {
    setSortField(field);
    const nextDir = direction !== undefined ? direction : (sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortDirection(nextDir);
    localStorage.setItem('class_students_sort_field', field);
    localStorage.setItem('class_students_sort_dir', nextDir);
  };

  const handleHeaderSort = (field: 'name' | 'code') => {
    if (sortField !== field) {
      handleSortChange(field, 'asc');
    } else if (sortDirection === 'asc') {
      handleSortChange(field, 'desc');
    } else {
      handleSortChange('default', 'asc');
    }
  };

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    const list = students.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchTerm) {
        const q = removeVietnameseAccents(searchTerm);
        const matchName = removeVietnameseAccents(s.fullName).includes(q);
        const matchCode = s.studentCode.toLowerCase().includes(q);
        return matchName || matchCode;
      }
      return true;
    });

    if (sortField === 'name') {
      return [...list].sort((a, b) => compareVietnameseNames(a, b, sortDirection));
    }
    if (sortField === 'code') {
      return [...list].sort((a, b) => compareStudentCodes(a.studentCode, b.studentCode, sortDirection));
    }
    return list;
  }, [students, statusFilter, searchTerm, sortField, sortDirection]);

  // Handle Add Student
  const handleSaveNewStudent = async () => {
    const errors: Record<string, string> = {};
    if (!studentCode.trim()) errors.studentCode = 'Mã học sinh là bắt buộc';
    if (!lastName.trim()) errors.lastName = 'Họ đệm là bắt buộc';
    if (!firstName.trim()) errors.firstName = 'Tên là bắt buộc';

    // Check duplicate student code
    const isCodeTaken = students.some(
      (s) => s.studentCode.trim().toUpperCase() === studentCode.trim().toUpperCase()
    );
    if (isCodeTaken) {
      errors.studentCode = `Mã học sinh "${studentCode}" đã tồn tại trong lớp.`;
    }

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    setAddErrors({});
    const full = `${lastName.trim()} ${firstName.trim()}`;

    await addStudent({
      studentCode: studentCode.trim().toUpperCase(),
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      fullName: full,
      dateOfBirth: dateOfBirth || undefined,
      gender,
      status: 'active',
      parentName: parentName.trim() || undefined,
      parentPhone: parentPhone.trim() || undefined,
    });

    // Reset
    setStudentCode('');
    setLastName('');
    setFirstName('');
    setDateOfBirth('');
    setParentName('');
    setParentPhone('');
    setIsAddModalOpen(false);
  };

  // Handle File Upload for Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const previewList: typeof importPreview = [];
        let validCount = 0;
        let errorCount = 0;

        rawRows.forEach((row, idx) => {
          const rowNum = idx + 2; // header is row 1
          // Flexible key matching
          const sCode = String(row['Mã học sinh'] || row['Ma hoc sinh'] || row['Mã HS'] || row['MaHS'] || row['Code'] || '').trim();
          const lName = String(row['Họ đệm'] || row['Ho dem'] || row['Họ'] || row['Ho'] || '').trim();
          const fName = String(row['Tên'] || row['Ten'] || '').trim();
          const rawFull = String(row['Họ và tên'] || row['Ho va ten'] || row['Họ tên'] || row['FullName'] || '').trim();
          const dob = String(row['Ngày sinh'] || row['Ngay sinh'] || row['DOB'] || '').trim();
          const gen = String(row['Giới tính'] || row['Gioi tinh'] || '').trim();
          const pName = String(row['Tên phụ huynh'] || row['Ten phu huynh'] || row['Phụ huynh'] || '').trim();
          const pPhone = String(row['Điện thoại phụ huynh'] || row['Dien thoai'] || row['SĐT'] || '').trim();

          let resolvedLastName = lName;
          let resolvedFirstName = fName;
          let resolvedFullName = '';

          if (!resolvedFirstName && rawFull) {
            const parts = rawFull.split(' ');
            resolvedFirstName = parts.pop() || '';
            resolvedLastName = parts.join(' ');
          }
          resolvedFullName = resolvedLastName ? `${resolvedLastName} ${resolvedFirstName}` : resolvedFirstName;

          let isValid = true;
          let errorMsg = '';

          if (!sCode) {
            isValid = false;
            errorMsg = 'Thiếu mã học sinh';
          } else if (!resolvedFirstName) {
            isValid = false;
            errorMsg = 'Thiếu tên học sinh';
          }

          if (isValid) validCount++;
          else errorCount++;

          previewList.push({
            rowNum,
            studentCode: sCode.toUpperCase(),
            lastName: resolvedLastName,
            firstName: resolvedFirstName,
            fullName: resolvedFullName,
            dateOfBirth: dob,
            gender: gen.toLowerCase().includes('nữ') ? 'Nữ' : 'Nam',
            parentName: pName,
            parentPhone: pPhone,
            isValid,
            errorMsg,
          });
        });

        setImportPreview(previewList);
        setImportSummary({ total: rawRows.length, valid: validCount, error: errorCount });
      } catch (err: any) {
        alert('Lỗi đọc tệp Excel/CSV: ' + (err.message || String(err)));
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    const validRows = importPreview.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('Không có dòng hợp lệ nào để nhập.');
      return;
    }

    const payload = validRows.map((r) => ({
      studentCode: r.studentCode,
      lastName: r.lastName,
      firstName: r.firstName,
      fullName: r.fullName,
      dateOfBirth: r.dateOfBirth,
      gender: r.gender,
      status: 'active' as StudentStatus,
      parentName: r.parentName,
      parentPhone: r.parentPhone,
    }));

    const result = await importStudentsBatch(payload);
    alert(`Nhập thành công! Đã thêm mới ${result.imported} học sinh, cập nhật ${result.updated} học sinh.`);
    setImportPreview([]);
    setImportSummary(null);
    setIsImportModalOpen(false);
  };

  // Multi-select handlers
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open single student delete confirmation
  const handleRequestDeleteStudent = (student: Student) => {
    const studentLogsCount = disciplineLogs.filter((l) => l.studentId === student.id).length;
    setDeleteConfirmState({
      type: 'single',
      ids: [student.id],
      deleteLogs: true,
      namesSummary: `${student.studentCode} - ${student.fullName}${
        studentLogsCount > 0 ? ` (có ${studentLogsCount} bản ghi nề nếp liên quan)` : ''
      }`,
    });
  };

  // Open batch delete confirmation
  const handleRequestBatchDelete = () => {
    if (selectedStudentIds.length === 0) return;
    const selectedObjs = students.filter((s) => selectedStudentIds.includes(s.id));
    const totalLogsCount = disciplineLogs.filter((l) => selectedStudentIds.includes(l.studentId)).length;
    const names = selectedObjs.slice(0, 3).map((s) => s.fullName).join(', ');
    const more = selectedObjs.length > 3 ? ` và ${selectedObjs.length - 3} học sinh khác` : '';
    setDeleteConfirmState({
      type: 'batch',
      ids: selectedStudentIds,
      deleteLogs: true,
      namesSummary: `${names}${more}${
        totalLogsCount > 0 ? ` (có ${totalLogsCount} bản ghi nề nếp liên quan)` : ''
      }`,
    });
  };

  // Confirm delete execution
  const handleConfirmDelete = async () => {
    if (!deleteConfirmState) return;
    setIsDeleting(true);
    try {
      if (deleteConfirmState.type === 'single') {
        await deleteStudent(deleteConfirmState.ids[0], deleteConfirmState.deleteLogs);
      } else {
        await deleteStudentsBatch(deleteConfirmState.ids, deleteConfirmState.deleteLogs);
      }
      setSelectedStudentIds((prev) => prev.filter((id) => !deleteConfirmState.ids.includes(id)));
      setDeleteConfirmState(null);
    } catch (err: any) {
      alert('Lỗi khi xóa học sinh: ' + (err.message || String(err)));
    } finally {
      setIsDeleting(false);
    }
  };

  // Export current list to Excel
  const handleExportStudents = () => {
    const exportRows = filteredStudents.map((s, idx) => ({
      STT: idx + 1,
      'Mã học sinh': s.studentCode,
      'Họ đệm': s.lastName,
      'Tên': s.firstName,
      'Họ và tên': s.fullName,
      'Ngày sinh': formatVietnameseDate(s.dateOfBirth),
      'Giới tính': s.gender || '',
      'Trạng thái': s.status === 'active' ? 'Đang học' : 'Ngừng theo học',
      'Tên phụ huynh': s.parentName || '',
      'Số điện thoại phụ huynh': s.parentPhone || '',
    }));
    exportToExcel(exportRows, `Danh_sach_hoc_sinh_10A8_${new Date().toISOString().slice(0, 10)}`, 'HocSinh');
  };

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Quản Lý Hồ Sơ Học Sinh Lớp {classConfig.className}</span>
          </h2>
          <p className="text-xs text-slate-500">
            Tổng số {students.length} học sinh • Đang học: {students.filter((s) => s.status === 'active').length} • Đã nghỉ:{' '}
            {students.filter((s) => s.status === 'inactive').length}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>Thêm học sinh</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition"
          >
            <Upload className="h-4 w-4" />
            <span>Nhập Excel/CSV</span>
          </button>

          <button
            onClick={downloadStudentTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl transition"
            title="Tải tệp mẫu Excel chuẩn để nhập danh sách"
          >
            <Download className="h-4 w-4" />
            <span>Tải tệp mẫu</span>
          </button>

          <button
            onClick={handleExportStudents}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium rounded-xl shadow-sm transition"
          >
            <Download className="h-4 w-4" />
            <span>Xuất danh sách</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, tên đệm hoặc mã học sinh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang theo học</option>
            <option value="inactive">Đã ngừng theo học</option>
          </select>
        </div>

        <div className="sm:w-64">
          <select
            value={sortField === 'default' ? 'default' : `${sortField}_${sortDirection}`}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'default') {
                handleSortChange('default', 'asc');
              } else if (val === 'name_asc') {
                handleSortChange('name', 'asc');
              } else if (val === 'name_desc') {
                handleSortChange('name', 'desc');
              } else if (val === 'code_asc') {
                handleSortChange('code', 'asc');
              } else if (val === 'code_desc') {
                handleSortChange('code', 'desc');
              }
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="default">Sắp xếp: Mặc định (Thứ tự thêm)</option>
            <option value="name_asc">Sắp xếp: Họ và Tên (A → Z)</option>
            <option value="name_desc">Sắp xếp: Họ và Tên (Z → A)</option>
            <option value="code_asc">Sắp xếp: Mã học sinh (Tăng dần)</option>
            <option value="code_desc">Sắp xếp: Mã học sinh (Giảm dần)</option>
          </select>
        </div>
      </div>

      {/* Quick Sort & Summary Bar */}
      <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-blue-600" />
            <span>Xếp danh sách:</span>
          </span>

          <button
            type="button"
            onClick={() => {
              if (sortField === 'name') {
                handleSortChange('name', sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                handleSortChange('name', 'asc');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 ${
              sortField === 'name'
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300 shadow-xs ring-1 ring-blue-300 dark:ring-blue-700'
                : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="Xếp theo Họ và Tên (chuẩn danh sách Việt Nam: ưu tiên Tên chính, sau đó Họ đệm)"
          >
            {sortField === 'name' ? (
              sortDirection === 'asc' ? (
                <ArrowDownAZ className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              ) : (
                <ArrowUpAZ className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              )
            ) : (
              <ArrowDownAZ className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>
              Theo Họ và Tên {sortField === 'name' ? (sortDirection === 'asc' ? '(A → Z)' : '(Z → A)') : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (sortField === 'code') {
                handleSortChange('code', sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                handleSortChange('code', 'asc');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 ${
              sortField === 'code'
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300 shadow-xs ring-1 ring-blue-300 dark:ring-blue-700'
                : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="Xếp theo Mã học sinh (HS01, HS02, ...)"
          >
            {sortField === 'code' ? (
              sortDirection === 'asc' ? (
                <ArrowDown01 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              ) : (
                <ArrowUp10 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              )
            ) : (
              <ArrowDown01 className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>
              Theo Mã học sinh {sortField === 'code' ? (sortDirection === 'asc' ? '(Tăng dần)' : '(Giảm dần)') : ''}
            </span>
          </button>

          {sortField !== 'default' && (
            <button
              type="button"
              onClick={() => handleSortChange('default', 'asc')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline"
              title="Khôi phục thứ tự mặc định ban đầu"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Mặc định</span>
            </button>
          )}
        </div>

        <div className="text-slate-500 dark:text-slate-400">
          Hiển thị <span className="font-bold text-slate-800 dark:text-slate-200">{filteredStudents.length}</span> / {students.length} học sinh
          {sortField !== 'default' && (
            <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
              • Đang xếp: {sortField === 'name' ? 'Họ và Tên' : 'Mã HS'} ({sortDirection === 'asc' ? (sortField === 'name' ? 'A→Z' : 'Tăng dần') : (sortField === 'name' ? 'Z→A' : 'Giảm dần')})
            </span>
          )}
        </div>
      </div>

      {/* Selected Action Bar when multiple students are selected */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 px-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-rose-600 text-white text-xs font-bold font-mono">
              {selectedStudentIds.length}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-rose-900 dark:text-rose-200">
              Đã chọn {selectedStudentIds.length} học sinh
            </span>
            <button
              onClick={() => setSelectedStudentIds([])}
              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 underline ml-2"
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestBatchDelete}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
            >
              <Trash2 className="h-4 w-4" />
              <span>Xóa {selectedStudentIds.length} học sinh đã chọn</span>
            </button>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredStudents.length > 0 &&
                      selectedStudentIds.length === filteredStudents.length
                    }
                    onChange={handleToggleSelectAll}
                    title="Chọn / Bỏ chọn tất cả học sinh đang hiển thị"
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2 w-12 text-center">STT</th>
                <th
                  onClick={() => handleHeaderSort('code')}
                  className="py-3 px-3 w-36 cursor-pointer select-none group hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Nhấn để sắp xếp theo Mã học sinh (Tăng dần / Giảm dần)"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={sortField === 'code' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
                      Mã học sinh
                    </span>
                    <span className="flex items-center">
                      {sortField === 'code' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 transition" />
                      )}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('name')}
                  className="py-3 px-3 cursor-pointer select-none group hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Nhấn để sắp xếp theo Họ và Tên (chuẩn danh sách Việt Nam: ưu tiên Tên chính, sau đó Họ đệm)"
                >
                  <div className="flex items-center justify-between gap-1 max-w-[200px]">
                    <span className={sortField === 'name' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
                      Họ và tên
                    </span>
                    <span className="flex items-center">
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 transition" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-3">Giới tính</th>
                <th className="py-3 px-3">Phụ huynh & SĐT</th>
                <th className="py-3 px-3 text-center w-28">Trạng thái</th>
                <th className="py-3 px-3 text-center w-28">Lịch sử nề nếp</th>
                <th className="py-3 px-3 text-center w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Không tìm thấy học sinh nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const studentLogs = getStudentLogs(s.id);
                  const violations = studentLogs.filter((l) => l.type === 'deduct').length;
                  const bonuses = studentLogs.filter((l) => l.type === 'bonus').length;
                  const isSelected = selectedStudentIds.includes(s.id);

                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-rose-50/70 dark:bg-rose-950/30'
                          : 'hover:bg-blue-50/40 dark:hover:bg-slate-750/50'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(s.id)}
                          className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {s.studentCode}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">
                          {s.fullName}
                        </span>
                        {s.dateOfBirth && (
                          <span className="text-[10px] text-slate-400">
                            Sinh ngày: {formatVietnameseDate(s.dateOfBirth)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {s.gender || '—'}
                      </td>
                      <td className="py-3 px-3">
                        {s.parentName ? (
                          <div>
                            <span className="text-slate-800 dark:text-slate-200 block font-medium">
                              {s.parentName}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {s.parentPhone || 'Chưa có SĐT'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">Chưa cập nhật</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {s.status === 'active' ? 'Đang học' : 'Ngừng học'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono">
                          {violations > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded font-bold">
                              -{violations} lỗi
                            </span>
                          )}
                          {bonuses > 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold">
                              +{bonuses} việc tốt
                            </span>
                          )}
                          {violations === 0 && bonuses === 0 && (
                            <span className="text-slate-400">0 ghi nhận</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingStudent(s)}
                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition"
                            title="Xem chi tiết hồ sơ & tiến trình"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingStudent(s)}
                            className="p-1 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                            title="Sửa thông tin"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleStudentStatus(s.id)}
                            className={`p-1 rounded transition ${
                              s.status === 'active'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={s.status === 'active' ? 'Chuyển sang ngừng theo học (vẫn giữ lịch sử)' : 'Kích hoạt lại học sinh'}
                          >
                            {s.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleRequestDeleteStudent(s)}
                            className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition"
                            title="Xóa học sinh này"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* MODAL: Thêm học sinh mới */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <span>Thêm Học Sinh Mới Vào Lớp {classConfig.className}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã học sinh * (Không trùng lặp, dùng làm khóa định danh)
                </label>
                <input
                  type="text"
                  placeholder="vd: HS10A836"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase font-bold"
                />
                {addErrors.studentCode && <p className="text-rose-500 mt-1">{addErrors.studentCode}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Họ đệm *</label>
                  <input
                    type="text"
                    placeholder="vd: Nguyễn Văn"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  {addErrors.lastName && <p className="text-rose-500 mt-1">{addErrors.lastName}</p>}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tên *</label>
                  <input
                    type="text"
                    placeholder="vd: An"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  {addErrors.firstName && <p className="text-rose-500 mt-1">{addErrors.firstName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Giới tính</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Họ tên phụ huynh</label>
                  <input
                    type="text"
                    placeholder="vd: Nguyễn Văn Hùng"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">SĐT phụ huynh</label>
                  <input
                    type="tel"
                    placeholder="vd: 0912345678"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNewStudent}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500"
              >
                Thêm học sinh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Chỉnh sửa học sinh */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-600" />
              <span>Chỉnh Sửa Hồ Sơ Học Sinh</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mã học sinh</label>
                <input
                  type="text"
                  value={editingStudent.studentCode}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Họ đệm</label>
                  <input
                    type="text"
                    value={editingStudent.lastName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tên</label>
                  <input
                    type="text"
                    value={editingStudent.firstName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Họ tên phụ huynh</label>
                  <input
                    type="text"
                    value={editingStudent.parentName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">SĐT phụ huynh</label>
                  <input
                    type="tel"
                    value={editingStudent.parentPhone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await updateStudent(editingStudent.id, {
                    lastName: editingStudent.lastName,
                    firstName: editingStudent.firstName,
                    fullName: `${editingStudent.lastName} ${editingStudent.firstName}`,
                    parentName: editingStudent.parentName,
                    parentPhone: editingStudent.parentPhone,
                  });
                  setEditingStudent(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: Chi tiết học sinh */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-bold text-blue-600 text-sm">
                  {viewingStudent.firstName[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{viewingStudent.fullName}</span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">
                      {viewingStudent.studentCode}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lớp {classConfig.className} • Phụ huynh: {viewingStudent.parentName || 'Chưa cập nhật'} (
                    {viewingStudent.parentPhone || 'Chưa có SĐT'})
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Disciplinary history of this student */}
            <div className="mt-4 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Lịch Sử Ghi Nhận Nề Nếp & Thi Đua
                </h4>
                <button
                  onClick={() => {
                    if (onSelectStudentForReport) onSelectStudentForReport(viewingStudent.id);
                    onNavigateTab('parent-report');
                  }}
                  className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg font-semibold hover:bg-blue-100"
                >
                  Tạo tin nhắn báo phụ huynh
                </button>
              </div>

              {getStudentLogs(viewingStudent.id).length === 0 ? (
                <div className="py-8 text-center bg-slate-50 dark:bg-slate-750/50 rounded-xl text-slate-500">
                  Học sinh chưa có bản ghi vi phạm hay khen thưởng nào. Nề nếp duy trì hoàn hảo!
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {getStudentLogs(viewingStudent.id).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">[{log.behaviorCode}]</span>
                          <span>{log.behaviorDescription}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatVietnameseDate(log.date)} • Tuần {log.weekNumber} • {log.periodOrTime || 'Trong ngày'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold font-mono ${
                            log.type === 'deduct' ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {log.type === 'deduct' ? '-' : '+'}
                          {formatVietnameseNumber(log.totalScore)}đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nhập danh sách từ Excel/CSV với kiểm tra lỗi từng dòng */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                <span>Nhập Danh Sách Học Sinh Từ Excel / CSV</span>
              </h3>
              <button
                onClick={() => {
                  setImportPreview([]);
                  setImportSummary(null);
                  setIsImportModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-slate-700 dark:text-slate-300">
                <p className="font-semibold mb-1">Hướng dẫn nhập danh sách:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                  <li>Tệp hỗ trợ: .xlsx, .xls, .csv</li>
                  <li>Cột bắt buộc: <strong>Mã học sinh</strong>, <strong>Họ đệm</strong>, <strong>Tên</strong></li>
                  <li>Nếu trùng mã học sinh với danh sách hiện tại, thông tin sẽ được cập nhật lại theo tệp mới.</li>
                </ul>
                <div className="mt-2">
                  <button
                    onClick={downloadStudentTemplate}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải tệp mẫu Excel chuẩn (Mau_nhap_danh_sach_hoc_sinh_10A8.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Upload Input */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
                   onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Nhấn để chọn tệp Excel hoặc CSV từ máy tính
                </p>
                <p className="text-slate-400 text-[11px] mt-1">.xlsx, .xls, .csv dung lượng tối đa 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Preview table & Validation */}
              {importSummary && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-750 rounded-xl font-bold">
                    <span>Kết quả kiểm tra: {importSummary.total} dòng trong tệp</span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-emerald-600">✓ {importSummary.valid} dòng hợp lệ</span>
                      {importSummary.error > 0 && (
                        <span className="text-rose-600">⚠ {importSummary.error} dòng lỗi</span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-2">Dòng</th>
                          <th className="p-2">Mã HS</th>
                          <th className="p-2">Họ và tên</th>
                          <th className="p-2">Ngày sinh</th>
                          <th className="p-2">Trạng thái dòng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {importPreview.map((row) => (
                          <tr key={row.rowNum} className={row.isValid ? '' : 'bg-rose-50 dark:bg-rose-950/30'}>
                            <td className="p-2 font-mono">{row.rowNum}</td>
                            <td className="p-2 font-mono font-bold">{row.studentCode || '—'}</td>
                            <td className="p-2 font-bold">{row.fullName || '—'}</td>
                            <td className="p-2">{row.dateOfBirth || '—'}</td>
                            <td className="p-2">
                              {row.isValid ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Hợp lệ
                                </span>
                              ) : (
                                <span className="text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="h-3.5 w-3.5" /> {row.errorMsg}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setImportPreview([]);
                  setImportSummary(null);
                  setIsImportModalOpen(false);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!importSummary || importSummary.valid === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
              >
                Xác nhận nhập {importSummary?.valid || 0} học sinh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận xóa học sinh (đơn lẻ hoặc hàng loạt) */}
      {deleteConfirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {deleteConfirmState.type === 'batch'
                    ? `Xác nhận xóa ${deleteConfirmState.ids.length} học sinh?`
                    : 'Xác nhận xóa học sinh?'}
                </h3>
                <p className="text-xs text-slate-500">Hành động này sẽ xóa dữ liệu học sinh khỏi hệ thống</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 my-4 text-xs space-y-2">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {deleteConfirmState.type === 'batch'
                  ? `Danh sách học sinh được chọn (${deleteConfirmState.ids.length}):`
                  : 'Học sinh:'}
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-mono bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                {deleteConfirmState.namesSummary}
              </p>

              <label className="flex items-start gap-2.5 pt-2 text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteConfirmState.deleteLogs}
                  onChange={(e) =>
                    setDeleteConfirmState({
                      ...deleteConfirmState,
                      deleteLogs: e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                />
                <span className="text-[11px] leading-tight">
                  Đồng thời xóa toàn bộ các bản ghi vi phạm / điểm thưởng của học sinh này trong Nhật ký hằng ngày
                </span>
              </label>
            </div>

            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
              💡 Lưu ý: Nếu học sinh chỉ chuyển trường hoặc tạm nghỉ, thầy/cô có thể dùng nút <strong>"Ngừng theo học"</strong> (biểu tượng cạnh nút sửa) để bảo lưu lịch sử nề nếp cũ thay vì xóa vĩnh viễn.
            </p>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmState(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>
                  {isDeleting
                    ? 'Đang xóa...'
                    : deleteConfirmState.type === 'batch'
                    ? `Xóa vĩnh viễn (${deleteConfirmState.ids.length})`
                    : 'Xóa vĩnh viễn'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
