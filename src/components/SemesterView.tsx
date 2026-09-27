import React, { useState, useMemo } from 'react';
import {
  Award,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  Settings,
  Check,
  Share2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatVietnameseNumber,
  getRankBadgeClass,
  exportToExcel,
} from '../lib/utils';
import { TabType } from './Navbar';
import { SummaryZaloExportModal } from './SummaryZaloExportModal';

interface SemesterViewProps {
  onNavigateTab: (tab: TabType) => void;
  onSelectStudentForReport?: (studentId: string) => void;
}

export const SemesterView: React.FC<SemesterViewProps> = ({
  onNavigateTab,
  onSelectStudentForReport,
}) => {
  const { classConfig, getSemesterSummary, updateClassConfig } = useApp();

  const [activeSemester, setActiveSemester] = useState<1 | 2>(1);
  const [showConfigMonths, setShowConfigMonths] = useState<boolean>(false);
  const [isZaloModalOpen, setIsZaloModalOpen] = useState<boolean>(false);
  const [tempMonths, setTempMonths] = useState<number[]>(
    activeSemester === 1 ? classConfig.semester1Months : classConfig.semester2Months
  );

  const currentMonths = useMemo(() => {
    return activeSemester === 1 ? classConfig.semester1Months : classConfig.semester2Months;
  }, [activeSemester, classConfig]);

  // Semester summary computed from raw logs
  const semesterData = useMemo(() => {
    return getSemesterSummary(activeSemester);
  }, [getSemesterSummary, activeSemester]);

  // Overall semester metrics
  const stats = useMemo(() => {
    const scores = semesterData.map((d) => d.averageScore);
    const avgSemesterScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 10;
    const totalViolations = semesterData.reduce((acc, curr) => acc + curr.totalViolations, 0);
    const totalDeduct = semesterData.reduce((acc, curr) => acc + curr.totalDeduct, 0);
    const totalBonus = semesterData.reduce((acc, curr) => acc + curr.totalBonus, 0);

    const ranks = {
      'Xuất sắc': semesterData.filter((d) => d.finalRank === 'Xuất sắc').length,
      'Tốt': semesterData.filter((d) => d.finalRank === 'Tốt').length,
      'Khá': semesterData.filter((d) => d.finalRank === 'Khá').length,
      'Trung bình': semesterData.filter((d) => d.finalRank === 'Trung bình').length,
      'Yếu': semesterData.filter((d) => d.finalRank === 'Yếu').length,
    };

    return {
      avgSemesterScore: Math.round(avgSemesterScore * 100) / 100,
      totalViolations,
      totalDeduct: Math.round(totalDeduct * 100) / 100,
      totalBonus: Math.round(totalBonus * 100) / 100,
      ranks,
    };
  }, [semesterData]);

  // Export Excel
  const handleExportExcel = () => {
    const exportRows = semesterData.map((s, idx) => {
      const row: Record<string, any> = {
        STT: idx + 1,
        'Mã học sinh': s.studentCode,
        'Họ và tên': s.fullName,
      };

      currentMonths.forEach((m) => {
        const sc = s.monthlyScores[m];
        row[`Tháng ${m}`] = sc !== null && sc !== undefined ? formatVietnameseNumber(sc) : '—';
      });

      row['Điểm TB Học kỳ'] = formatVietnameseNumber(s.averageScore);
      row['Xếp loại Học kỳ'] = s.finalRank;
      row['Tổng số lượt vi phạm'] = s.totalViolations;
      row['Tổng điểm trừ'] = formatVietnameseNumber(s.totalDeduct);
      row['Tổng điểm cộng'] = formatVietnameseNumber(s.totalBonus);

      return row;
    });

    exportToExcel(
      exportRows,
      `Tong_ket_Hoc_ky_${activeSemester}_Lop_${classConfig.className}_${classConfig.schoolYear}`,
      `HocKy_${activeSemester}`
    );
  };

  const handleSaveMonthsConfig = async () => {
    if (activeSemester === 1) {
      await updateClassConfig({ semester1Months: tempMonths });
    } else {
      await updateClassConfig({ semester2Months: tempMonths });
    }
    setShowConfigMonths(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-xl">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Tổng Kết Nề Nếp Học Kỳ {activeSemester}
              </h2>
              <p className="text-xs text-slate-500">
                Các tháng tính điểm: {currentMonths.map((m) => `Tháng ${m}`).join(', ')} • Lớp {classConfig.className}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Semester Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setActiveSemester(1);
                setTempMonths(classConfig.semester1Months);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSemester === 1
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Học kỳ 1 (T9 - T1)
            </button>
            <button
              onClick={() => {
                setActiveSemester(2);
                setTempMonths(classConfig.semester2Months);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSemester === 2
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Học kỳ 2 (T2 - T5)
            </button>
          </div>

          <button
            onClick={() => setShowConfigMonths(!showConfigMonths)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition"
            title="Cấu hình tháng thuộc học kỳ"
          >
            <Settings className="h-4 w-4" />
            <span>Đổi tháng kỳ</span>
          </button>

          <button
            onClick={() => setIsZaloModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
            title="Sao chép hình ảnh Tổng kết Học kỳ để dán gửi nhóm Zalo phụ huynh"
          >
            <Share2 className="h-4 w-4" />
            <span>Gửi ảnh Zalo</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Download className="h-4 w-4" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Printer className="h-4 w-4" />
            <span>In học kỳ</span>
          </button>
        </div>
      </div>

      {/* Month Config Drawer / Accordion */}
      {showConfigMonths && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs space-y-3 print:hidden">
          <div className="flex items-center justify-between font-bold text-blue-900 dark:text-blue-200">
            <span>Chọn các tháng thuộc Học kỳ {activeSemester}:</span>
            <button onClick={() => setShowConfigMonths(false)} className="text-slate-400 hover:text-slate-600">
              Đóng
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[9, 10, 11, 12, 1, 2, 3, 4, 5].map((m) => {
              const isSelected = tempMonths.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => {
                    if (isSelected) {
                      setTempMonths(tempMonths.filter((x) => x !== m));
                    } else {
                      setTempMonths([...tempMonths, m]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  Tháng {m}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={handleSaveMonthsConfig}
              className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Áp dụng cấu hình tháng</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
          <span className="text-[11px] text-blue-600 font-medium block">Điểm TB Học Kỳ</span>
          <span className="text-2xl font-bold text-blue-600">
            {formatVietnameseNumber(stats.avgSemesterScore)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Thang 10,0 điểm</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
          <span className="text-[11px] text-emerald-600 font-medium block">Học sinh Xuất sắc</span>
          <span className="text-2xl font-bold text-emerald-600">{stats.ranks['Xuất sắc']} HS</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Đạt từ 9.0 đến 10.0</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
          <span className="text-[11px] text-blue-600 font-medium block">Học sinh Tốt</span>
          <span className="text-2xl font-bold text-blue-600">{stats.ranks['Tốt']} HS</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Đạt từ 8.0 đến dưới 9.0</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-100 dark:border-amber-900/40">
          <span className="text-[11px] text-amber-600 font-medium block">Học sinh Khá & TB</span>
          <span className="text-2xl font-bold text-amber-600">
            {stats.ranks['Khá'] + stats.ranks['Trung bình']} HS
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Khá: {stats.ranks['Khá']} | TB: {stats.ranks['Trung bình']}</span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-100 dark:border-rose-900/40">
          <span className="text-[11px] text-rose-600 font-medium block">Cần rèn luyện thêm</span>
          <span className="text-2xl font-bold text-rose-600">{stats.ranks['Yếu']} HS</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Dưới 5.0 điểm</span>
        </div>
      </div>

      {/* Main Semester Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-10 text-center">STT</th>
                <th className="py-3 px-3 w-28">Mã HS</th>
                <th className="py-3 px-3 min-w-[160px]">Họ và tên</th>
                {currentMonths.map((m) => (
                  <th key={m} className="py-3 px-2 text-center w-24">
                    Tháng {m}
                  </th>
                ))}
                <th className="py-3 px-3 text-right w-24 font-bold text-blue-600">ĐTB Kỳ {activeSemester}</th>
                <th className="py-3 px-3 text-center w-28">Xếp loại</th>
                <th className="py-3 px-3 text-center w-24">Tổng vi phạm</th>
                <th className="py-3 px-3 text-right w-24">Tổng trừ</th>
                <th className="py-3 px-3 text-right w-24">Tổng cộng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {semesterData.map((s, idx) => {
                const rankBadge = getRankBadgeClass(s.finalRank);
                return (
                  <tr
                    key={s.studentId}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-750/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {s.studentCode}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {s.fullName}
                    </td>

                    {/* Monthly scores */}
                    {currentMonths.map((m) => {
                      const score = s.monthlyScores[m];
                      return (
                        <td key={m} className="py-2.5 px-2 text-center font-mono">
                          {score !== null && score !== undefined ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatVietnameseNumber(score)}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                      {formatVietnameseNumber(s.averageScore)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${rankBadge.bg} ${rankBadge.text} ${rankBadge.border}`}
                      >
                        {s.finalRank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                      {s.totalViolations > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full font-bold">
                          {s.totalViolations}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-medium">
                      {s.totalDeduct > 0 ? `-${formatVietnameseNumber(s.totalDeduct)}đ` : '0'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {s.totalBonus > 0 ? `+${formatVietnameseNumber(s.totalBonus)}đ` : '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zalo Image Export Modal */}
      <SummaryZaloExportModal
        isOpen={isZaloModalOpen}
        onClose={() => setIsZaloModalOpen(false)}
        periodType="semester"
        periodTitle={`Học kỳ ${activeSemester}`}
        periodTimeInfo={`Năm học ${classConfig.schoolYear} • Gồm các Tháng: ${currentMonths.map((m) => `T${m}`).join(', ')}`}
        className={classConfig.className}
        schoolYear={classConfig.schoolYear}
        homeroomTeacher={classConfig.homeroomTeacher}
        semesterMonths={currentMonths}
        stats={{
          totalStudents: semesterData.length,
          avgScore: stats.avgSemesterScore,
          excellentCount: stats.ranks['Xuất sắc'] || 0,
          goodCount: stats.ranks['Tốt'] || 0,
          fairCount: stats.ranks['Khá'] || 0,
          mediumCount: stats.ranks['Trung bình'] || 0,
          weakCount: stats.ranks['Yếu'] || 0,
          totalViolations: stats.totalViolations,
          totalDeduct: stats.totalDeduct,
          totalBonus: stats.totalBonus,
        }}
        students={[...semesterData]
          .sort((a, b) => b.averageScore - a.averageScore || a.studentCode.localeCompare(b.studentCode))
          .map((s, idx) => ({
            stt: idx + 1,
            studentCode: s.studentCode,
            fullName: s.fullName,
            finalScore: s.averageScore,
            rank: s.finalRank,
            monthlyScores: s.monthlyScores,
            totalDeduct: s.totalDeduct,
            totalBonus: s.totalBonus,
            violationCount: s.totalViolations,
          }))}
      />
    </div>
  );
};
