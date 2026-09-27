import React from 'react';
import {
  GraduationCap,
  CalendarDays,
  FileSpreadsheet,
  CalendarCheck,
  CalendarRange,
  Users,
  Tag,
  MessageSquareShare,
  Settings,
  PlusCircle,
  Cloud,
  HardDrive,
  LogIn,
  LogOut,
  RefreshCw,
  Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type TabType =
  | 'dashboard'
  | 'daily-log'
  | 'weekly'
  | 'monthly'
  | 'semester'
  | 'students'
  | 'categories'
  | 'parent-report'
  | 'settings';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenNewLogModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenNewLogModal }) => {
  const {
    currentUser,
    isLocalMode,
    isCloudSyncing,
    classConfig,
    login,
    logout,
    syncLocalToCloud,
  } = useApp();

  const navItems: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: CalendarDays },
    { id: 'daily-log', label: 'Nhật ký hằng ngày', icon: FileSpreadsheet },
    { id: 'weekly', label: 'Tổng kết tuần', icon: CalendarCheck },
    { id: 'monthly', label: 'Tổng kết tháng', icon: CalendarRange },
    { id: 'semester', label: 'Học kỳ', icon: Award },
    { id: 'students', label: 'Hồ sơ học sinh', icon: Users },
    { id: 'categories', label: 'Danh mục lỗi & Thưởng', icon: Tag },
    { id: 'parent-report', label: 'Báo cáo phụ huynh', icon: MessageSquareShare },
    { id: 'settings', label: 'Cài đặt & sao lưu', icon: Settings },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30 print:hidden">
      {/* Top Bar: Title, Class info & Account */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white uppercase">
                SỔ CHẤM ĐIỂM HÀNG NGÀY
              </h1>
              <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-400/30">
                Lớp {classConfig.className}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Năm học {classConfig.schoolYear} • GVCN: <span className="text-slate-200 font-medium">{classConfig.homeroomTeacher}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons & Status */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Quick Action Button */}
          <button
            onClick={onOpenNewLogModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-all active:scale-95"
            title="Ghi nhận vi phạm hoặc điểm cộng mới"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Thêm ghi nhận</span>
          </button>

          {/* Sync / Mode status */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Cloud className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Firestore Đám mây</span>
              </span>
              <button
                onClick={syncLocalToCloud}
                disabled={isCloudSyncing}
                className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-700 transition"
                title="Đồng bộ thủ công lên Cloud Firestore"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isCloudSyncing ? 'animate-spin text-blue-400' : ''}`} />
              </button>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 max-w-[120px] truncate hidden sm:inline" title={currentUser.email || currentUser.displayName || ''}>
                {currentUser.displayName || currentUser.email}
              </span>
              <button
                onClick={logout}
                className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-slate-700"
                title="Đăng xuất"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-amber-600/40 text-xs">
              <span className="flex items-center gap-1 text-amber-300">
                <HardDrive className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Chế độ cục bộ (10A8)</span>
              </span>
              <button
                onClick={login}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-2 py-0.5 rounded transition"
                title="Đăng nhập Google để đồng bộ Cloud Firestore"
              >
                <LogIn className="h-3 w-3" />
                <span>Đăng nhập</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
