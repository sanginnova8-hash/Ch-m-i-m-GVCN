export type BehaviorType = 'deduct' | 'bonus';

export type StudentStatus = 'active' | 'inactive';

export type RankLevel = 'Xuất sắc' | 'Tốt' | 'Khá' | 'Trung bình' | 'Yếu';

export interface Student {
  id: string;
  studentCode: string;
  lastName: string;
  firstName: string;
  fullName: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: 'Nam' | 'Nữ';
  status: StudentStatus;
  teacherId: string;
  classId: string;
  parentName?: string;
  parentPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BehaviorCategory {
  id: string;
  code: string;
  name: string;
  type: BehaviorType;
  defaultScore: number;
  group?: string; // e.g., 'Chuyên cần - Giờ giấc', 'Học tập - Bài vở', 'Kỷ luật - Tác phong', 'Đạo đức - Ứng xử', 'Tài sản - Vệ sinh'
  basisOrRegulation?: string;
  keywords?: string[];
  isActive: boolean;
  isCustom?: boolean;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export type AchievementPeriod = 'weekly' | 'monthly';

export interface AchievementBonusRule {
  id: string;
  code: string; // e.g., 'TT_W01', 'TT_M01'
  title: string; // e.g., 'Không vi phạm lỗi nào trong tuần'
  period: AchievementPeriod;
  bonusScore: number; // e.g. 1.0, 2.0
  description?: string;
  isAutoEligible?: boolean; // Tự động xét duyệt nếu đủ điều kiện (vd: 0 vi phạm)
  isActive: boolean;
  isCustom?: boolean;
}

export interface EditHistoryEntry {
  timestamp: string;
  editorName: string;
  action: 'create' | 'update' | 'delete';
  previousValue?: string;
  newValue?: string;
}

export interface DisciplineLog {
  id: string;
  date: string; // YYYY-MM-DD
  month: number; // 1 - 12
  weekNumber: number; // 1 - 35
  studentId: string;
  studentCode: string;
  studentName: string;
  behaviorCode: string;
  behaviorDescription: string;
  type: BehaviorType;
  scorePerUnit: number; // Positive number, e.g. 1, 0.5, 3
  count: number; // default 1
  totalScore: number; // scorePerUnit * count (represented as positive in record, math applies deduct/bonus)
  periodOrTime?: string; // e.g., 'Tiết 2', 'Giờ ra chơi', 'Sinh hoạt đầu tuần'
  reporter?: string; // e.g., 'Cán sự lớp', 'GVCN', 'GV Bộ môn Toán'
  basisOrRegulation?: string; // Nội quy trường/lớp
  note?: string;
  teacherId: string;
  classId: string;
  createdAt: string;
  updatedAt: string;
  history?: EditHistoryEntry[];
}

export interface SchoolWeek {
  weekNumber: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  semester: 1 | 2;
  month: number;
  title: string;
}

export interface ClassConfig {
  id: string;
  className: string;
  schoolYear: string;
  homeroomTeacher: string;
  baseScore: number; // 10
  minScore: number; // 0
  maxScore: number; // 10
  months: number[]; // [9, 10, 11, 12, 1, 2, 3, 4, 5]
  semester1Months: number[]; // [9, 10, 11, 12, 1]
  semester2Months: number[]; // [2, 3, 4, 5]
  weeks: SchoolWeek[];
  achievementBonusRules?: AchievementBonusRule[];
  teacherId: string;
  updatedAt: string;
}

export interface StudentWeeklySummary {
  studentId: string;
  studentCode: string;
  fullName: string;
  dateOfBirth?: string;
  status: StudentStatus;
  violationCount: number;
  bonusCount: number;
  totalDeduct: number;
  totalBonus: number;
  achievementBonus?: number;
  achievementCount?: number;
  achievements?: string[];
  finalScore: number;
  rank: RankLevel;
  notes: string;
}

export interface StudentMonthlySummary {
  studentId: string;
  studentCode: string;
  fullName: string;
  status: StudentStatus;
  weekDeductions: Record<number, number>; // weekNumber -> deduct amount
  totalDeduct: number;
  totalBonus: number;
  achievementBonus?: number;
  achievementCount?: number;
  achievements?: string[];
  finalScore: number;
  rank: RankLevel;
  violationCount: number;
  bonusCount: number;
  notes: string;
}

export interface StudentSemesterSummary {
  studentId: string;
  studentCode: string;
  fullName: string;
  status: StudentStatus;
  monthlyScores: Record<number, number | null>; // month -> finalScore
  averageScore: number;
  finalRank: RankLevel;
  totalViolations: number;
  totalDeduct: number;
  totalBonus: number;
}
