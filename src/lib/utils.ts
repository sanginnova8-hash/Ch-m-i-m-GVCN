import * as XLSX from 'xlsx';
import { RankLevel } from '../types';

/**
 * Remove Vietnamese accents for loose search / matching
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Format date YYYY-MM-DD or ISO string to dd/MM/yyyy
 */
export function formatVietnameseDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    // If it's already YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const cleanDay = day.split('T')[0];
      return `${cleanDay.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format decimal numbers using Vietnamese comma, e.g. 0.5 -> "0,5", 9 -> "9", 8.25 -> "8,25"
 */
export function formatVietnameseNumber(num: number, maxDecimals: number = 2): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  // Round to maxDecimals
  const rounded = Math.round(num * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);
  const parts = rounded.toString().split('.');
  if (parts.length === 1) return parts[0];
  return `${parts[0]},${parts[1]}`;
}

/**
 * Calculate rank level according to prompt:
 * - Xuất sắc: từ 9 đến 10
 * - Tốt: từ 8 đến dưới 9
 * - Khá: từ 7 đến dưới 8
 * - Trung bình: từ 5 đến dưới 7
 * - Yếu: dưới 5
 */
export function calculateRank(score: number): RankLevel {
  if (score >= 9) return 'Xuất sắc';
  if (score >= 8) return 'Tốt';
  if (score >= 7) return 'Khá';
  if (score >= 5) return 'Trung bình';
  return 'Yếu';
}

/**
 * Clamp score between min and max (defaults 0 to 10)
 */
export function clampScore(score: number, min: number = 0, max: number = 10): number {
  const rounded = Math.round(score * 100) / 100;
  return Math.max(min, Math.min(max, rounded));
}

/**
 * Get CSS badge color classes for Rank
 */
export function getRankBadgeClass(rank: RankLevel): { bg: string; text: string; border: string } {
  switch (rank) {
    case 'Xuất sắc':
      return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
    case 'Tốt':
      return { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' };
    case 'Khá':
      return { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
    case 'Trung bình':
      return { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' };
    case 'Yếu':
      return { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' };
  }
}

/**
 * Export data array to Excel (.xlsx) file and trigger download
 */
export function exportToExcel(data: Record<string, any>[], fileName: string, sheetName: string = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Export data array to CSV file and trigger download
 */
export function exportToCsv(data: Record<string, any>[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a blank sample Excel file for student imports
 */
export function downloadStudentTemplate() {
  const template = [
    {
      'Mã học sinh': 'HS10A801',
      'Họ đệm': 'Nguyễn Văn',
      'Tên': 'An',
      'Ngày sinh': '15/05/2011',
      'Giới tính': 'Nam',
      'Điện thoại phụ huynh': '0912345678',
      'Tên phụ huynh': 'Nguyễn Văn Hùng',
    },
    {
      'Mã học sinh': 'HS10A802',
      'Họ đệm': 'Trần Thị',
      'Tên': 'Bình',
      'Ngày sinh': '20/08/2011',
      'Giới tính': 'Nữ',
      'Điện thoại phụ huynh': '0987654321',
      'Tên phụ huynh': 'Lê Thị Mai',
    },
    {
      'Mã học sinh': 'HS10A803',
      'Họ đệm': 'Lê Hoàng',
      'Tên': 'Bảo',
      'Ngày sinh': '12/11/2011',
      'Giới tính': 'Nam',
      'Điện thoại phụ huynh': '0903123456',
      'Tên phụ huynh': 'Lê Hoàng Nam',
    },
  ];
  exportToExcel(template, 'Mau_nhap_danh_sach_hoc_sinh_10A8', 'DanhSachHocSinh');
}

/**
 * Flexible date parser for Excel/CSV inputs
 * Handles Excel serial numbers, DD/MM/YYYY, YYYY-MM-DD, ISO strings
 */
export function parseFlexibleDate(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;

  // If already Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If Excel numeric serial date (e.g. 45557)
  if (typeof val === 'number' && val > 20000 && val < 80000) {
    try {
      // Excel 1900 date system leap year bug adjustment (25569 = 1970-01-01)
      const utcDays = Math.floor(val - 25569);
      const date = new Date(utcDays * 86400 * 1000);
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch {
      return null;
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try standard JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Download a sample Excel file for discipline log (Nhật ký lỗi / nề nếp) imports
 */
export function downloadDisciplineLogTemplate() {
  const template = [
    {
      'Ngày': '2026-09-22',
      'Mã học sinh': 'HS10A801',
      'Họ và tên': 'Nguyễn Văn An',
      'Mã vi phạm': 'KTB',
      'Nội dung lỗi': 'Không thuộc bài môn Toán',
      'Loại': 'Trừ điểm',
      'Điểm': 1,
      'Số lần': 1,
      'Tiết / Thời điểm': 'Tiết 1',
      'Người ghi nhận': 'Cán sự môn Toán',
      'Căn cứ / Quy định': 'Điều 3 - Nội quy học tập',
      'Ghi chú': 'Kiểm tra miệng đầu giờ',
    },
    {
      'Ngày': '2026-09-23',
      'Mã học sinh': 'HS10A802',
      'Họ và tên': 'Trần Thị Bình',
      'Mã vi phạm': 'DHM',
      'Nội dung lỗi': 'Đi học muộn 15 phút',
      'Loại': 'Trừ điểm',
      'Điểm': 1,
      'Số lần': 1,
      'Tiết / Thời điểm': 'Đầu giờ sáng',
      'Người ghi nhận': 'Cờ đỏ',
      'Căn cứ / Quy định': 'Nội quy chuyên cần',
      'Ghi chú': 'Hỏng xe trên đường đến trường',
    },
    {
      'Ngày': '2026-09-24',
      'Mã học sinh': 'HS10A803',
      'Họ và tên': 'Lê Hoàng Bảo',
      'Mã vi phạm': 'PBT',
      'Nội dung lỗi': 'Phát biểu xây dựng bài sôi nổi',
      'Loại': 'Cộng điểm',
      'Điểm': 0.5,
      'Số lần': 2,
      'Tiết / Thời điểm': 'Tiết 3',
      'Người ghi nhận': 'GV Bộ môn',
      'Căn cứ / Quy định': 'Tiêu chí thi đua học tập',
      'Ghi chú': 'Giải bài tập nâng cao lên bảng',
    },
  ];
  exportToExcel(template, 'Mau_nhap_nhat_ky_ne_nep_10A8', 'NhatKyLoi');
}

/**
 * Vietnamese comparison for student names according to Vietnamese school convention:
 * Compares by firstName (Tên chính) first, then lastName (Họ & tên đệm), then fullName.
 * Uses Vietnamese locale collation ('vi') so vowels with diacritics
 * are sorted in standard Vietnamese alphabet order.
 */
export function compareVietnameseNames(
  studentA: { firstName?: string; lastName?: string; fullName?: string },
  studentB: { firstName?: string; lastName?: string; fullName?: string },
  direction: 'asc' | 'desc' = 'asc'
): number {
  const getFirstName = (s: { firstName?: string; fullName?: string }) => {
    if (s.firstName && s.firstName.trim()) return s.firstName.trim();
    if (s.fullName && s.fullName.trim()) {
      const parts = s.fullName.trim().split(/\s+/);
      return parts[parts.length - 1];
    }
    return '';
  };

  const getLastName = (s: { lastName?: string; fullName?: string }) => {
    if (s.lastName && s.lastName.trim()) return s.lastName.trim();
    if (s.fullName && s.fullName.trim()) {
      const parts = s.fullName.trim().split(/\s+/);
      if (parts.length > 1) {
        return parts.slice(0, parts.length - 1).join(' ');
      }
    }
    return '';
  };

  const nameA = getFirstName(studentA);
  const nameB = getFirstName(studentB);

  // Compare first name (Tên chính) with Vietnamese collation
  let comp = nameA.localeCompare(nameB, 'vi', { sensitivity: 'base', numeric: true });
  if (comp === 0) {
    // If first names are identical, compare last & middle name (Họ & Đệm)
    const lastA = getLastName(studentA);
    const lastB = getLastName(studentB);
    comp = lastA.localeCompare(lastB, 'vi', { sensitivity: 'base', numeric: true });
  }
  if (comp === 0) {
    comp = (studentA.fullName || '').localeCompare(studentB.fullName || '', 'vi');
  }

  return direction === 'asc' ? comp : -comp;
}

/**
 * Natural comparison for student code (e.g. HS01, HS02, HS10)
 */
export function compareStudentCodes(
  codeA?: string,
  codeB?: string,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const comp = (codeA || '').trim().localeCompare((codeB || '').trim(), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  return direction === 'asc' ? comp : -comp;
}
