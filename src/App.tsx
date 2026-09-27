import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Navbar, TabType } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DailyLogView } from './components/DailyLogView';
import { WeeklySummaryView } from './components/WeeklySummaryView';
import { MonthlySummaryView } from './components/MonthlySummaryView';
import { SemesterView } from './components/SemesterView';
import { StudentsView } from './components/StudentsView';
import { BehaviorCatalogView } from './components/BehaviorCatalogView';
import { ParentReportView } from './components/ParentReportView';
import { SettingsBackupView } from './components/SettingsBackupView';

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isNewLogModalOpen, setIsNewLogModalOpen] = useState(false);
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);

  const handleSelectStudentForReport = (studentId: string) => {
    setReportStudentId(studentId);
    setActiveTab('parent-report');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewLogModal={() => setIsNewLogModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigateTab={setActiveTab}
            onSelectStudentForReport={handleSelectStudentForReport}
            onOpenNewLogModal={() => setIsNewLogModalOpen(true)}
          />
        )}

        {activeTab === 'daily-log' && (
          <DailyLogView
            isModalOpen={isNewLogModalOpen}
            onCloseModal={() => setIsNewLogModalOpen(false)}
            onOpenModal={() => setIsNewLogModalOpen(true)}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklySummaryView
            onNavigateTab={setActiveTab}
            onSelectStudentForReport={handleSelectStudentForReport}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlySummaryView
            onNavigateTab={setActiveTab}
            onSelectStudentForReport={handleSelectStudentForReport}
          />
        )}

        {activeTab === 'semester' && (
          <SemesterView
            onNavigateTab={setActiveTab}
            onSelectStudentForReport={handleSelectStudentForReport}
          />
        )}

        {activeTab === 'students' && (
          <StudentsView
            onNavigateTab={setActiveTab}
            onSelectStudentForReport={handleSelectStudentForReport}
          />
        )}

        {activeTab === 'categories' && <BehaviorCatalogView />}

        {activeTab === 'parent-report' && (
          <ParentReportView initialSelectedStudentId={reportStudentId} />
        )}

        {activeTab === 'settings' && <SettingsBackupView />}

        {/* Global modal support for DailyLogView if opened from other tabs */}
        {activeTab !== 'daily-log' && isNewLogModalOpen && (
          <DailyLogView
            isModalOpen={isNewLogModalOpen}
            onCloseModal={() => setIsNewLogModalOpen(false)}
            onOpenModal={() => setIsNewLogModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Sổ Chấm Điểm Hàng Ngày • Lớp 10A8 • Niên khóa 2026–2027 • GVCN: Nguyễn Văn Sang
          </span>
          <span className="text-slate-400">
            Hệ thống hỗ trợ nề nếp & thi đua chuẩn hóa dành cho trường trung học
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
