import React, { useState, useRef } from 'react';
import {
  Settings,
  HardDrive,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Save,
  RotateCcw,
  LogIn,
  LogOut,
  ShieldCheck,
  Tag,
  Award,
  Zap,
  PlusCircle,
  Edit2,
  Trash2,
  Power,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatVietnameseDate, formatVietnameseNumber } from '../lib/utils';
import { BehaviorCategory, AchievementBonusRule } from '../types';

export const SettingsBackupView: React.FC = () => {
  const {
    currentUser,
    isLocalMode,
    isCloudSyncing,
    cloudSyncError,
    login,
    logout,
    syncLocalToCloud,
    classConfig,
    updateClassConfig,
    students,
    disciplineLogs,
    behaviorCategories,
    updateBehaviorCategory,
    addBehaviorCategory,
    deleteBehaviorCategory,
    toggleBehaviorCategoryActive,
    resetBehaviorCategoriesToDefault,
    updateAchievementRule,
    addAchievementRule,
    deleteAchievementRule,
    resetAchievementRulesToDefault,
    exportFullBackupJson,
    restoreFromJson,
    resetToSampleData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'class' | 'violations' | 'achievements' | 'cloud' | 'backup'>('class');

  // Class Config Form state
  const [className, setClassName] = useState(classConfig.className);
  const [schoolYear, setSchoolYear] = useState(classConfig.schoolYear);
  const [homeroomTeacher, setHomeroomTeacher] = useState(classConfig.homeroomTeacher);
  const [baseScore, setBaseScore] = useState(classConfig.baseScore);
  const [minScore, setMinScore] = useState(classConfig.minScore);
  const [maxScore, setMaxScore] = useState(classConfig.maxScore);
  const [configSaved, setConfigSaved] = useState(false);

  // Restore file input
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [restoreJsonString, setRestoreJsonString] = useState<string>('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Quick edit modal for violation score
  const [editingCat, setEditingCat] = useState<BehaviorCategory | null>(null);
  const [editingAchieve, setEditingAchieve] = useState<AchievementBonusRule | null>(null);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateClassConfig({
      className: className.trim(),
      schoolYear: schoolYear.trim(),
      homeroomTeacher: homeroomTeacher.trim(),
      baseScore: Number(baseScore),
      minScore: Number(minScore),
      maxScore: Number(maxScore),
    });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const handleExportJson = () => {
    const json = exportFullBackupJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sao_luu_SoChamDiem_${classConfig.className}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJsonFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.students || !parsed.disciplineLogs) {
          alert('Tệp sao lưu không đúng định dạng của ứng dụng Sổ Chấm Điểm Hàng Ngày.');
          return;
        }

        setRestoreJsonString(text);
        setRestorePreview({
          exportedAt: parsed.exportedAt,
          className: parsed.classConfig?.className || classConfig.className,
          schoolYear: parsed.classConfig?.schoolYear || classConfig.schoolYear,
          teacher: parsed.classConfig?.homeroomTeacher || classConfig.homeroomTeacher,
          studentCount: parsed.students?.length || 0,
          logCount: parsed.disciplineLogs?.length || 0,
          categoryCount: parsed.behaviorCategories?.length || 0,
        });
      } catch (err: any) {
        alert('Lỗi định dạng tệp JSON: ' + (err.message || String(err)));
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!restoreJsonString) return;
    const res = await restoreFromJson(restoreJsonString);
    if (res.success) {
      alert(`Khôi phục thành công! Đã nạp ${res.studentCount} học sinh và ${res.logCount} bản ghi nhật ký.`);
      setRestorePreview(null);
      setRestoreJsonString('');
    } else {
      alert(res.message);
    }
  };

  const handleConfirmReset = async () => {
    await resetToSampleData();
    setIsResetConfirmOpen(false);
    alert('Đã khôi phục về dữ liệu mẫu chuẩn của lớp 10A8!');
  };

  const achievementRules = classConfig.achievementBonusRules || [];
  const deductCategories = behaviorCategories.filter((c) => c.type === 'deduct');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <span>Cài Đặt Hệ Thống & Sao Lưu Dữ Liệu</span>
        </h2>
        <p className="text-xs text-slate-500">
          Cấu hình thông tin lớp học, cài đặt danh mục lỗi, quy chế điểm thưởng tuần/tháng khi có thành tích, đồng bộ Cloud Firestore
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('class')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'class'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Thông Tin Lớp & Thang Điểm</span>
        </button>

        <button
          onClick={() => setActiveTab('violations')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'violations'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>Cài Đặt Danh Mục Lỗi ({deductCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'achievements'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Cài Đặt Điểm Thưởng Thành Tích ({achievementRules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'cloud'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Cloud className="h-4 w-4" />
          <span>Đồng Bộ Cloud Firestore</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'backup'
              ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>Sao Lưu & Khôi Phục</span>
        </button>
      </div>

      {/* TAB 1: THÔNG TIN LỚP & THANG ĐIỂM */}
      {activeTab === 'class' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Thông Tin Lớp & Thang Điểm Thi Đua
            </h3>
            {configSaved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Đã lưu cài đặt!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Tên lớp</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Năm học</label>
                <input
                  type="text"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Giáo viên chủ nhiệm</label>
              <input
                type="text"
                value={homeroomTeacher}
                onChange={(e) => setHomeroomTeacher(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block font-semibold mb-1">Điểm nền ban đầu</label>
                <input
                  type="number"
                  step="0.5"
                  value={baseScore}
                  onChange={(e) => setBaseScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Điểm thấp nhất</label>
                <input
                  type="number"
                  step="0.5"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Điểm cao nhất</label>
                <input
                  type="number"
                  step="0.5"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-xl text-slate-500 space-y-1">
              <p>• Điểm rèn luyện tuần/tháng = Giới hạn [0..10] của (Điểm nền − Điểm trừ + Điểm thưởng).</p>
              <p>• Năm học gồm các tháng: Tháng 9 đến Tháng 5 (35 tuần học tiêu chuẩn).</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-sm transition active:scale-95"
              >
                <Save className="h-4 w-4" />
                <span>Lưu thông tin lớp</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: CÀI ĐẶT DANH MỤC LỖI */}
      {activeTab === 'violations' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Tag className="h-4 w-4 text-rose-600" />
                <span>Cài Đặt Danh Mục Lỗi Vi Phạm ({deductCategories.length} lỗi)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tùy chỉnh mức điểm trừ cho từng lỗi vi phạm (L01–L09) hoặc thêm lỗi quy định mới của trường
              </p>
            </div>

            <button
              onClick={async () => {
                if (confirm('Khôi phục toàn bộ danh mục lỗi về mức điểm chuẩn ban đầu của Bộ GD&ĐT?')) {
                  await resetBehaviorCategoriesToDefault();
                  alert('Đã khôi phục danh mục lỗi chuẩn thành công!');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-800 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Khôi phục biểu điểm chuẩn</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {deductCategories.map((cat) => (
              <div
                key={cat.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shrink-0">
                    {cat.code}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white leading-snug">
                      {cat.name}
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Căn cứ: {cat.basisOrRegulation || 'Nội quy trường/lớp'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Mức phạt:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                      -{formatVietnameseNumber(cat.defaultScore)}đ
                    </span>
                  </div>

                  <button
                    onClick={() => toggleBehaviorCategoryActive(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      cat.isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                    title="Bật / Tắt áp dụng lỗi này"
                  >
                    {cat.isActive ? 'Đang dùng' : 'Tắt'}
                  </button>

                  <button
                    onClick={() => setEditingCat(cat)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition"
                    title="Chỉnh sửa mức điểm hoặc nội dung lỗi"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CÀI ĐẶT ĐIỂM THƯỞNG THÀNH TÍCH TUẦN/THÁNG */}
      {activeTab === 'achievements' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600" />
                <span>Cài Đặt Điểm Thưởng Tuần / Tháng Khi Có Thành Tích</span>
              </h3>
              <p className="text-xs text-slate-500">
                Quy định mức điểm thưởng cộng khi học sinh nề nếp gương mẫu (0 vi phạm), học sinh tiêu biểu, hoa điểm 10, thi đua HSG...
              </p>
            </div>

            <button
              onClick={async () => {
                if (confirm('Khôi phục quy chế điểm thưởng thành tích về mức mặc định chuẩn?')) {
                  await resetAchievementRulesToDefault();
                  alert('Đã khôi phục quy chế thành tích thành công!');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-800 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Khôi phục quy chế chuẩn</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievementRules.map((rule) => {
              const isWeekly = rule.period === 'weekly';
              return (
                <div
                  key={rule.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-750/50 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {rule.code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isWeekly
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                          }`}
                        >
                          {isWeekly ? 'Thành tích tuần' : 'Thành tích tháng'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          +{formatVietnameseNumber(rule.bonusScore)}đ
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {rule.title}
                    </h4>

                    {rule.description && (
                      <p className="text-[11px] text-slate-500">{rule.description}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {rule.isAutoEligible ? '⚡ Xét thưởng tự động' : '🎖️ Bình chọn'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          updateAchievementRule(rule.id, { isActive: !rule.isActive })
                        }
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          rule.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {rule.isActive ? 'Áp dụng' : 'Tắt'}
                      </button>

                      <button
                        onClick={() => setEditingAchieve(rule)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition"
                        title="Sửa quy chế"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ĐỒNG BỘ CLOUD FIRESTORE */}
      {activeTab === 'cloud' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-600" />
              <span>Đồng Bộ Dữ Liệu & Tài Khoản Google</span>
            </h3>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Trạng thái lưu trữ:
                </span>
                <span className="text-slate-500">
                  {currentUser
                    ? 'Đã kết nối Firebase Firestore Cloud'
                    : 'Chế độ Cục bộ (Local Storage an toàn trên trình duyệt)'}
                </span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                  currentUser
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                }`}
              >
                {currentUser ? 'Đám mây đồng bộ' : 'Lưu cục bộ'}
              </span>
            </div>

            {currentUser ? (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    {currentUser.displayName?.slice(0, 1) || 'GV'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {currentUser.displayName || 'Giáo viên chủ nhiệm'}
                    </p>
                    <p className="text-slate-400 text-[10px]">{currentUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={syncLocalToCloud}
                    disabled={isCloudSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xs transition"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                    <span>Đồng bộ ngay</span>
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-slate-500">
                  Đăng nhập tài khoản Google để tự động đồng bộ dữ liệu lớp học qua điện thoại, máy tính bảng và các thiết bị khác.
                </p>
                <button
                  onClick={login}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-sm shrink-0"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Đăng nhập Google</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SAO LƯU & KHÔI PHỤC */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Xuất Tệp Sao Lưu (.JSON)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tải toàn bộ danh sách {students.length} học sinh, {disciplineLogs.length} bản ghi nhật ký, danh mục lỗi và quy chế điểm thưởng thành tích về máy tính an toàn.
            </p>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Tải tệp sao lưu toàn bộ dữ liệu</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-600" />
              <span>Khôi Phục Từ Tệp Sao Lưu (.JSON)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Phục hồi dữ liệu từ bản sao lưu trước đó. Dữ liệu nạp vào sẽ đồng bộ lên đám mây nếu bạn đang đăng nhập.
            </p>
            <input
              type="file"
              accept=".json"
              ref={jsonFileInputRef}
              onChange={handleJsonFileSelected}
              className="hidden"
            />
            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Upload className="h-4 w-4" />
              <span>Chọn tệp sao lưu JSON để nạp</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: SỬA MỨC ĐIỂM LỖI */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-600" />
              <span>Sửa Mức Phạt Lỗi: [{editingCat.code}]</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nội dung hành vi</label>
                <textarea
                  rows={2}
                  value={editingCat.name}
                  onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Mức điểm trừ mỗi lần *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={editingCat.defaultScore}
                  onChange={(e) => setEditingCat({ ...editingCat, defaultScore: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-rose-600 text-base"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setEditingCat(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await updateBehaviorCategory(editingCat.id, {
                    name: editingCat.name,
                    defaultScore: editingCat.defaultScore,
                  });
                  setEditingCat(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SỬA ĐIỂM THƯỞNG THÀNH TÍCH */}
      {editingAchieve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              <span>Sửa Điểm Thưởng: [{editingAchieve.code}]</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Tên thành tích</label>
                <input
                  type="text"
                  value={editingAchieve.title}
                  onChange={(e) => setEditingAchieve({ ...editingAchieve, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Mức điểm thưởng cộng *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={editingAchieve.bonusScore}
                  onChange={(e) => setEditingAchieve({ ...editingAchieve, bonusScore: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-emerald-600 text-base"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setEditingAchieve(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await updateAchievementRule(editingAchieve.id, {
                    title: editingAchieve.title,
                    bonusScore: editingAchieve.bonusScore,
                  });
                  setEditingAchieve(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
