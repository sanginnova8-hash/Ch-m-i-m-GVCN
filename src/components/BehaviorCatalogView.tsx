import React, { useState, useMemo } from 'react';
import {
  Tag,
  PlusCircle,
  Edit2,
  Trash2,
  Power,
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  AlertOctagon,
  Search,
  RotateCcw,
  Download,
  Award,
  Zap,
  Check,
  HelpCircle,
  Layers,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BehaviorCategory, BehaviorType, AchievementBonusRule, AchievementPeriod } from '../types';
import { formatVietnameseNumber, exportToExcel, removeVietnameseAccents } from '../lib/utils';

export const BehaviorCatalogView: React.FC = () => {
  const {
    behaviorCategories,
    disciplineLogs,
    classConfig,
    addBehaviorCategory,
    updateBehaviorCategory,
    toggleBehaviorCategoryActive,
    deleteBehaviorCategory,
    resetBehaviorCategoriesToDefault,
    updateAchievementRule,
    addAchievementRule,
    deleteAchievementRule,
    resetAchievementRulesToDefault,
  } = useApp();

  const [mainTab, setMainTab] = useState<'deduct' | 'bonus' | 'achievement' | 'all'>('deduct');
  const [achievementSubTab, setAchievementSubTab] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<string>('all');

  // Modals for Behavior Categories
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BehaviorCategory | null>(null);
  const [isResetCatConfirmOpen, setIsResetCatConfirmOpen] = useState(false);

  // Form states for Category Add
  const [catCode, setCatCode] = useState('');
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<BehaviorType>('deduct');
  const [catDefaultScore, setCatDefaultScore] = useState<number>(1);
  const [catBasis, setCatBasis] = useState('');
  const [catKeywordsStr, setCatKeywordsStr] = useState('');
  const [catErrors, setCatErrors] = useState<Record<string, string>>({});

  // Modals for Achievement Rules
  const [isAddAchieveModalOpen, setIsAddAchieveModalOpen] = useState(false);
  const [editingAchieveRule, setEditingAchieveRule] = useState<AchievementBonusRule | null>(null);
  const [isResetAchieveConfirmOpen, setIsResetAchieveConfirmOpen] = useState(false);

  // Form states for Achievement Add
  const [achieveCode, setAchieveCode] = useState('');
  const [achieveTitle, setAchieveTitle] = useState('');
  const [achievePeriod, setAchievePeriod] = useState<AchievementPeriod>('weekly');
  const [achieveBonusScore, setAchieveBonusScore] = useState<number>(1.0);
  const [achieveDescription, setAchieveDescription] = useState('');
  const [achieveIsAuto, setAchieveIsAuto] = useState<boolean>(false);
  const [achieveErrors, setAchieveErrors] = useState<Record<string, string>>({});

  const achievementRules = useMemo(() => {
    return classConfig.achievementBonusRules || [];
  }, [classConfig.achievementBonusRules]);

  // Check if a category is used in logs
  const isCategoryUsed = (catCodeToCheck: string): boolean => {
    return disciplineLogs.some((l) => l.behaviorCode.toUpperCase() === catCodeToCheck.toUpperCase());
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return behaviorCategories.filter((c) => {
      // Main tab filter
      if (mainTab === 'deduct' && c.type !== 'deduct') return false;
      if (mainTab === 'bonus' && c.type !== 'bonus') return false;

      // Score filter
      if (scoreFilter !== 'all') {
        const targetScore = parseFloat(scoreFilter);
        if (c.defaultScore !== targetScore) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = removeVietnameseAccents(searchQuery.toLowerCase());
        const matchCode = c.code.toLowerCase().includes(q);
        const matchName = removeVietnameseAccents(c.name.toLowerCase()).includes(q);
        const matchBasis = removeVietnameseAccents((c.basisOrRegulation || '').toLowerCase()).includes(q);
        const matchKeywords = (c.keywords || []).some((k) =>
          removeVietnameseAccents(k.toLowerCase()).includes(q)
        );
        return matchCode || matchName || matchBasis || matchKeywords;
      }

      return true;
    });
  }, [behaviorCategories, mainTab, scoreFilter, searchQuery]);

  // Filtered achievement rules
  const filteredAchievementRules = useMemo(() => {
    return achievementRules.filter((r) => {
      if (achievementSubTab === 'weekly' && r.period !== 'weekly') return false;
      if (achievementSubTab === 'monthly' && r.period !== 'monthly') return false;

      if (searchQuery.trim()) {
        const q = removeVietnameseAccents(searchQuery.toLowerCase());
        const matchCode = r.code.toLowerCase().includes(q);
        const matchTitle = removeVietnameseAccents(r.title.toLowerCase()).includes(q);
        const matchDesc = removeVietnameseAccents((r.description || '').toLowerCase()).includes(q);
        return matchCode || matchTitle || matchDesc;
      }

      return true;
    });
  }, [achievementRules, achievementSubTab, searchQuery]);

  // Handler: Add new Category
  const handleSaveNewCategory = async () => {
    const errors: Record<string, string> = {};
    if (!catCode.trim()) errors.code = 'Mã danh mục là bắt buộc (vd: L10, T06)';
    if (!catName.trim()) errors.name = 'Tên nội dung hành vi là bắt buộc';
    if (catDefaultScore < 0) errors.score = 'Điểm không được âm';

    if (behaviorCategories.some((c) => c.code.toUpperCase() === catCode.trim().toUpperCase())) {
      errors.code = `Mã danh mục "${catCode}" đã tồn tại.`;
    }

    if (Object.keys(errors).length > 0) {
      setCatErrors(errors);
      return;
    }

    setCatErrors({});
    const keywords = catKeywordsStr
      ? catKeywordsStr.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [];

    await addBehaviorCategory({
      code: catCode.trim().toUpperCase(),
      name: catName.trim(),
      type: catType,
      defaultScore: Number(catDefaultScore),
      basisOrRegulation: catBasis.trim(),
      keywords,
      isActive: true,
      isCustom: true,
    });

    setCatCode('');
    setCatName('');
    setCatType('deduct');
    setCatDefaultScore(1);
    setCatBasis('');
    setCatKeywordsStr('');
    setIsAddCatModalOpen(false);
  };

  // Handler: Delete Category
  const handleDeleteCategory = async (id: string, codeVal: string) => {
    const res = await deleteBehaviorCategory(id);
    if (!res.success) {
      alert(res.message);
    }
  };

  // Handler: Save New Achievement Rule
  const handleSaveNewAchievementRule = async () => {
    const errors: Record<string, string> = {};
    if (!achieveCode.trim()) errors.code = 'Mã quy chế là bắt buộc (vd: TT_W05, TT_M06)';
    if (!achieveTitle.trim()) errors.title = 'Tên thành tích là bắt buộc';
    if (achieveBonusScore <= 0) errors.score = 'Điểm thưởng phải lớn hơn 0';

    if (achievementRules.some((r) => r.code.toUpperCase() === achieveCode.trim().toUpperCase())) {
      errors.code = `Mã quy chế "${achieveCode}" đã tồn tại.`;
    }

    if (Object.keys(errors).length > 0) {
      setAchieveErrors(errors);
      return;
    }

    setAchieveErrors({});
    await addAchievementRule({
      code: achieveCode.trim().toUpperCase(),
      title: achieveTitle.trim(),
      period: achievePeriod,
      bonusScore: Number(achieveBonusScore),
      description: achieveDescription.trim(),
      isAutoEligible: achieveIsAuto,
      isActive: true,
    });

    setAchieveCode('');
    setAchieveTitle('');
    setAchieveBonusScore(1.0);
    setAchieveDescription('');
    setAchieveIsAuto(false);
    setIsAddAchieveModalOpen(false);
  };

  // Export categories to Excel
  const handleExportCategories = () => {
    const rows = behaviorCategories.map((c, idx) => ({
      STT: idx + 1,
      'Mã quy định': c.code,
      'Nội dung hành vi / Vi phạm': c.name,
      'Loại': c.type === 'deduct' ? 'Trừ điểm' : 'Điểm cộng',
      'Điểm mỗi lần': c.defaultScore,
      'Căn cứ quy định': c.basisOrRegulation || 'Nội quy trường/lớp',
      'Từ khóa gợi ý': (c.keywords || []).join(', '),
      'Trạng thái': c.isActive ? 'Đang dùng' : 'Vô hiệu hóa',
    }));
    exportToExcel(rows, `Danh_muc_loi_va_khen_thuong_${classConfig.className}_${classConfig.schoolYear}`, 'DanhMuc');
  };

  // Export achievement rules to Excel
  const handleExportAchievementRules = () => {
    const rows = achievementRules.map((r, idx) => ({
      STT: idx + 1,
      'Mã quy chế': r.code,
      'Tên thành tích': r.title,
      'Phạm vi': r.period === 'weekly' ? 'Theo Tuần' : 'Theo Tháng',
      'Điểm thưởng': `+${r.bonusScore}đ`,
      'Tiêu chuẩn đạt': r.description || '',
      'Chế độ xét': r.isAutoEligible ? 'Tự động' : 'Bình chọn',
      'Trạng thái': r.isActive ? 'Đang áp dụng' : 'Tạm tắt',
    }));
    exportToExcel(rows, `Quy_che_diem_thuong_thanh_tich_${classConfig.className}_${classConfig.schoolYear}`, 'QuyCheThuong');
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-xl">
              <Tag className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Cài Đặt Danh Mục Lỗi & Điểm Thưởng Thành Tích</span>
              </h2>
              <p className="text-xs text-slate-500">
                Tùy chỉnh biểu điểm vi phạm • Cài đặt quy chế cộng điểm thưởng tuần / tháng khi có thành tích • Lớp {classConfig.className}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {mainTab === 'achievement' ? (
            <>
              <button
                onClick={handleExportAchievementRules}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
                title="Xuất Excel quy chế thưởng"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Xuất Excel</span>
              </button>
              <button
                onClick={() => setIsResetAchieveConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-800 transition"
                title="Khôi phục quy chế thưởng thành tích mặc định"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Khôi phục chuẩn</span>
              </button>
              <button
                onClick={() => {
                  setAchievePeriod('weekly');
                  setAchieveCode(`TT_W0${achievementRules.length + 1}`);
                  setIsAddAchieveModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Thêm quy chế thưởng</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleExportCategories}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
                title="Xuất bảng danh mục ra Excel"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Xuất Excel</span>
              </button>
              <button
                onClick={() => setIsResetCatConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-800 transition"
                title="Khôi phục danh mục chuẩn Bộ GD&ĐT (L01-L09 & T01-T05)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Khôi phục chuẩn</span>
              </button>
              <button
                onClick={() => {
                  setCatType(mainTab === 'bonus' ? 'bonus' : 'deduct');
                  setCatCode(mainTab === 'bonus' ? `T0${behaviorCategories.filter(c => c.type === 'bonus').length + 1}` : `L${behaviorCategories.filter(c => c.type === 'deduct').length + 1}`);
                  setIsAddCatModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-95"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Thêm danh mục mới</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
        <button
          onClick={() => {
            setMainTab('deduct');
            setScoreFilter('all');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            mainTab === 'deduct'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Danh Mục Lỗi (Điểm Trừ)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${mainTab === 'deduct' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 font-bold'}`}>
            {behaviorCategories.filter((c) => c.type === 'deduct').length}
          </span>
        </button>

        <button
          onClick={() => {
            setMainTab('achievement');
            setScoreFilter('all');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            mainTab === 'achievement'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Điểm Thưởng Tuần / Tháng (Thành Tích)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${mainTab === 'achievement' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 font-bold'}`}>
            {achievementRules.length} quy chế
          </span>
        </button>

        <button
          onClick={() => {
            setMainTab('bonus');
            setScoreFilter('all');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            mainTab === 'bonus'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Điểm Thưởng Thường (Trong Ngày)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${mainTab === 'bonus' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold'}`}>
            {behaviorCategories.filter((c) => c.type === 'bonus').length}
          </span>
        </button>

        <button
          onClick={() => {
            setMainTab('all');
            setScoreFilter('all');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            mainTab === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Tất cả ({behaviorCategories.length})</span>
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={
              mainTab === 'achievement'
                ? 'Tìm mã, tên thành tích, tiêu chuẩn...'
                : 'Tìm mã lỗi, tên hành vi, từ khóa...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {mainTab === 'achievement' ? (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto">
            <button
              onClick={() => setAchievementSubTab('all')}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg transition ${
                achievementSubTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tất cả ({achievementRules.length})
            </button>
            <button
              onClick={() => setAchievementSubTab('weekly')}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg transition ${
                achievementSubTab === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Thành tích tuần ({achievementRules.filter((r) => r.period === 'weekly').length})
            </button>
            <button
              onClick={() => setAchievementSubTab('monthly')}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg transition ${
                achievementSubTab === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Thành tích tháng ({achievementRules.filter((r) => r.period === 'monthly').length})
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <span className="text-xs text-slate-500">Mức điểm:</span>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Tất cả mức điểm</option>
              <option value="0.5">0,5 điểm</option>
              <option value="1">1 điểm</option>
              <option value="2">2 điểm</option>
              <option value="3">3 điểm</option>
              <option value="5">5 điểm</option>
            </select>
          </div>
        )}
      </div>

      {/* CONTENT FOR TAB: ACHIEVEMENT RULES */}
      {mainTab === 'achievement' && (
        <div className="space-y-4">
          {/* Informational Guidance Box */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
              <Award className="h-4 w-4" />
              <span>Quy Chế Điểm Thưởng Tuần / Tháng Khi Có Thành Tích</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              • <strong>Điểm thưởng tuần:</strong> Được cộng thêm vào điểm tuần khi học sinh duy trì nề nếp gương mẫu (ví dụ: cả tuần không mắc lỗi nào), đạt hoa điểm 10 hoặc tham gia phong trào xuất sắc.
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              • <strong>Điểm thưởng tháng:</strong> Áp dụng cho các thành tích chuyên cần trọn tháng, học sinh xuất sắc nhất tháng, đạt giải kỳ thi HSG/năng khiếu hoặc có tiến bộ vượt bậc.
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              • <strong>Xét thưởng nhanh:</strong> Trong màn hình <em>Tổng kết tuần</em> và <em>Tổng kết tháng</em>, giáo viên có thể bấm <strong>"⚡ Xét thưởng tự động"</strong> để hệ thống tự động kiểm tra và trao thưởng cho toàn bộ học sinh đạt chuẩn chỉ trong 1 chạm!
            </p>
          </div>

          {/* Achievement Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievementRules.map((rule) => {
              const isWeekly = rule.period === 'weekly';
              return (
                <div
                  key={rule.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border p-4.5 flex flex-col justify-between transition-all hover:shadow-md ${
                    !rule.isActive
                      ? 'border-slate-200 dark:border-slate-700 opacity-60 bg-slate-50/40'
                      : isWeekly
                      ? 'border-blue-200 dark:border-blue-900/60 shadow-xs'
                      : 'border-purple-200 dark:border-purple-900/60 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {rule.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isWeekly
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                          }`}
                        >
                          {isWeekly ? 'Thành tích tuần' : 'Thành tích tháng'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          +{formatVietnameseNumber(rule.bonusScore)}đ
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                        {rule.title}
                      </h4>
                      {rule.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {rule.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      {rule.isAutoEligible ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                          <Zap className="h-3 w-3" />
                          <span>Hỗ trợ xét tự động</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                          <Award className="h-3 w-3" />
                          <span>Bình chọn & Ghi nhận</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <button
                      onClick={() => updateAchievementRule(rule.id, { isActive: !rule.isActive })}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        rule.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-300'
                      }`}
                    >
                      <Power className="h-3 w-3" />
                      <span>{rule.isActive ? 'Đang áp dụng' : 'Tạm tắt'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingAchieveRule(rule)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Chỉnh sửa quy chế & mức điểm thưởng"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa quy chế khen thưởng "${rule.title}"?`)) {
                            deleteAchievementRule(rule.id);
                          }
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Xóa quy chế"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAchievementRules.length === 0 && (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
              <Award className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Không tìm thấy quy chế khen thưởng thành tích phù hợp
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setAchievementSubTab('all');
                }}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONTENT FOR TAB: BEHAVIOR CATEGORIES (DEDUCT / BONUS / ALL) */}
      {mainTab !== 'achievement' && (
        <div className="space-y-3">
          {/* Note for L09 */}
          {mainTab === 'deduct' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Quy tắc bảo toàn lịch sử:</strong> Thay đổi mức điểm trong danh mục sẽ áp dụng cho các ghi nhận tiếp theo, không làm sai lệch số điểm các bản ghi nhật ký đã lưu trong quá khứ.
                </span>
              </div>
            </div>
          )}

          {/* Categories Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[650px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3 w-16 text-center">Mã</th>
                    <th className="py-3 px-3 min-w-[280px]">Nội dung hành vi / Lỗi vi phạm</th>
                    <th className="py-3 px-3 text-center w-24">Loại</th>
                    <th className="py-3 px-3 text-right w-28">Điểm mỗi lần</th>
                    <th className="py-3 px-3 min-w-[180px]">Căn cứ quy định</th>
                    <th className="py-3 px-3 min-w-[160px]">Từ khóa gợi ý</th>
                    <th className="py-3 px-3 text-center w-28">Trạng thái</th>
                    <th className="py-3 px-3 text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredCategories.map((c) => {
                    const isDeduct = c.type === 'deduct';
                    const used = isCategoryUsed(c.code);

                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-blue-50/40 dark:hover:bg-slate-750/50 transition-colors ${
                          !c.isActive ? 'opacity-50 bg-slate-50/50 dark:bg-slate-800/50' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {c.code}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-900 dark:text-white leading-relaxed">
                            {c.name}
                          </p>
                          {c.isCustom && (
                            <span className="text-[10px] text-blue-500 font-semibold">(Tự định nghĩa)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isDeduct
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            }`}
                          >
                            {isDeduct ? 'Trừ điểm' : 'Điểm cộng'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                          <span className={isDeduct ? 'text-rose-600' : 'text-emerald-600'}>
                            {isDeduct ? '-' : '+'}
                            {formatVietnameseNumber(c.defaultScore)}đ
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {c.basisOrRegulation || 'Nội quy trường/lớp'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {c.keywords && c.keywords.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {c.keywords.slice(0, 3).map((k, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 rounded text-[10px]"
                                >
                                  {k}
                                </span>
                              ))}
                              {c.keywords.length > 3 && (
                                <span className="text-[10px] text-slate-400">+{c.keywords.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => toggleBehaviorCategoryActive(c.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                              c.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}
                            title="Bấm để bật / tắt sử dụng danh mục này"
                          >
                            <Power className="h-3 w-3" />
                            <span>{c.isActive ? 'Đang dùng' : 'Vô hiệu hóa'}</span>
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingCategory(c)}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition"
                              title="Sửa danh mục & mức điểm"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(c.id, c.code)}
                              className={`p-1 rounded transition ${
                                used
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'text-rose-600 hover:bg-rose-50'
                              }`}
                              title={
                                used
                                  ? 'Danh mục đã có bản ghi sử dụng, không thể xóa (hãy vô hiệu hóa)'
                                  : 'Xóa danh mục'
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredCategories.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <Tag className="h-8 w-8 mx-auto text-slate-300" />
                <p>Không tìm thấy danh mục nào phù hợp với bộ lọc hiện tại.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setScoreFilter('all');
                  }}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Thêm danh mục hành vi / lỗi mới */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                <span>Thêm Danh Mục Hành Vi / Lỗi Mới</span>
              </h3>
              <button onClick={() => setIsAddCatModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Mã danh mục * (vd: L10, T06)</label>
                  <input
                    type="text"
                    placeholder="vd: L10"
                    value={catCode}
                    onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase font-bold"
                  />
                  {catErrors.code && <p className="text-rose-500 mt-1">{catErrors.code}</p>}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Loại hành vi</label>
                  <select
                    value={catType}
                    onChange={(e) => setCatType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                  >
                    <option value="deduct">Vi phạm (Điểm trừ)</option>
                    <option value="bonus">Khen thưởng (Điểm cộng)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Nội dung hành vi / Lỗi vi phạm *</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả hành vi hoặc lỗi quy định..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
                {catErrors.name && <p className="text-rose-500 mt-1">{catErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Điểm mỗi lần *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={catDefaultScore}
                    onChange={(e) => setCatDefaultScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono"
                  />
                  {catErrors.score && <p className="text-rose-500 mt-1">{catErrors.score}</p>}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Căn cứ quy định</label>
                  <input
                    type="text"
                    placeholder="vd: Điều 34 Điều lệ THPT..."
                    value={catBasis}
                    onChange={(e) => setCatBasis(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Từ khóa gợi ý (Phân cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  placeholder="vd: di muon, khong chep bai, an qua vat..."
                  value={catKeywordsStr}
                  onChange={(e) => setCatKeywordsStr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setIsAddCatModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNewCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500"
              >
                Lưu danh mục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Sửa danh mục */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-600" />
              <span>Chỉnh Sửa Danh Mục: [{editingCategory.code}]</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nội dung hành vi / Lỗi</label>
                <textarea
                  rows={2}
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Điểm mỗi lần</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingCategory.defaultScore}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, defaultScore: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Căn cứ quy định</label>
                  <input
                    type="text"
                    value={editingCategory.basisOrRegulation || ''}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, basisOrRegulation: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Từ khóa gợi ý (phân cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={editingCategory.keywords?.join(', ') || ''}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      keywords: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await updateBehaviorCategory(editingCategory.id, {
                    name: editingCategory.name,
                    defaultScore: editingCategory.defaultScore,
                    basisOrRegulation: editingCategory.basisOrRegulation,
                    keywords: editingCategory.keywords,
                  });
                  setEditingCategory(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Thêm quy chế thành tích mới */}
      {isAddAchieveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                <span>Thêm Quy Chế Điểm Thưởng Thành Tích Mới</span>
              </h3>
              <button onClick={() => setIsAddAchieveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Mã quy chế * (vd: TT_W05, TT_M06)</label>
                  <input
                    type="text"
                    placeholder="vd: TT_W05"
                    value={achieveCode}
                    onChange={(e) => setAchieveCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase font-bold"
                  />
                  {achieveErrors.code && <p className="text-rose-500 mt-1">{achieveErrors.code}</p>}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Kỳ áp dụng thưởng *</label>
                  <select
                    value={achievePeriod}
                    onChange={(e) => setAchievePeriod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                  >
                    <option value="weekly">Thành tích theo Tuần (Weekly)</option>
                    <option value="monthly">Thành tích theo Tháng (Monthly)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Tên danh hiệu / Thành tích *</label>
                <input
                  type="text"
                  placeholder="vd: Tuần không vi phạm lỗi nào, Học sinh xuất sắc tháng..."
                  value={achieveTitle}
                  onChange={(e) => setAchieveTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
                {achieveErrors.title && <p className="text-rose-500 mt-1">{achieveErrors.title}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Điểm thưởng cộng *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={achieveBonusScore}
                    onChange={(e) => setAchieveBonusScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-emerald-600"
                  />
                  {achieveErrors.score && <p className="text-rose-500 mt-1">{achieveErrors.score}</p>}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Chế độ xét duyệt</label>
                  <select
                    value={achieveIsAuto ? 'auto' : 'manual'}
                    onChange={(e) => setAchieveIsAuto(e.target.value === 'auto')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    <option value="manual">🎖️ Giáo viên bình chọn / ghi nhận</option>
                    <option value="auto">⚡ Tự động xét nếu 0 lỗi vi phạm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Mô tả tiêu chuẩn đạt thành tích</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả tiêu chí để được cộng điểm thưởng..."
                  value={achieveDescription}
                  onChange={(e) => setAchieveDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setIsAddAchieveModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNewAchievementRule}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500"
              >
                Lưu quy chế thưởng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Sửa quy chế thành tích */}
      {editingAchieveRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-amber-600" />
              <span>Chỉnh Sửa Quy Chế Thưởng: [{editingAchieveRule.code}]</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Tên thành tích</label>
                <input
                  type="text"
                  value={editingAchieveRule.title}
                  onChange={(e) =>
                    setEditingAchieveRule({ ...editingAchieveRule, title: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Điểm thưởng cộng</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editingAchieveRule.bonusScore}
                    onChange={(e) =>
                      setEditingAchieveRule({
                        ...editingAchieveRule,
                        bonusScore: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Chế độ xét duyệt</label>
                  <select
                    value={editingAchieveRule.isAutoEligible ? 'auto' : 'manual'}
                    onChange={(e) =>
                      setEditingAchieveRule({
                        ...editingAchieveRule,
                        isAutoEligible: e.target.value === 'auto',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    <option value="manual">🎖️ Giáo viên bình chọn / ghi nhận</option>
                    <option value="auto">⚡ Tự động xét nếu 0 lỗi vi phạm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Mô tả tiêu chuẩn</label>
                <textarea
                  rows={2}
                  value={editingAchieveRule.description || ''}
                  onChange={(e) =>
                    setEditingAchieveRule({
                      ...editingAchieveRule,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setEditingAchieveRule(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await updateAchievementRule(editingAchieveRule.id, {
                    title: editingAchieveRule.title,
                    bonusScore: editingAchieveRule.bonusScore,
                    isAutoEligible: editingAchieveRule.isAutoEligible,
                    description: editingAchieveRule.description,
                  });
                  setEditingAchieveRule(null);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-500"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: Khôi phục danh mục chuẩn */}
      {isResetCatConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Khôi phục danh mục chuẩn Bộ GD&ĐT?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Thao tác này sẽ khôi phục toàn bộ danh mục vi phạm (L01 - L09) và khen thưởng (T01 - T05) về mức điểm chuẩn ban đầu. Các bản ghi nhật ký cũ đã chấm trước đó vẫn được giữ nguyên tính toàn vẹn.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResetCatConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await resetBehaviorCategoriesToDefault();
                  setIsResetCatConfirmOpen(false);
                  alert('Đã khôi phục danh mục chuẩn thành công!');
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: Khôi phục quy chế thưởng thành tích */}
      {isResetAchieveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Khôi phục quy chế điểm thưởng thành tích chuẩn?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Khôi phục lại toàn bộ danh mục quy chế điểm thưởng tuần & tháng về mức quy định ban đầu (Tuần không vi phạm: +1đ, Tháng không vi phạm: +2đ, Chuyên cần 100%: +1đ, Học sinh xuất sắc, giải HSG...).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResetAchieveConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await resetAchievementRulesToDefault();
                  setIsResetAchieveConfirmOpen(false);
                  alert('Đã khôi phục quy chế điểm thưởng thành tích thành công!');
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
