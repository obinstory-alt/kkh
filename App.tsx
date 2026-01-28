
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { MenuItem, PlatformConfig, SaleRecord, ExpenseItem, DailyMemo } from './types';

const DEFAULT_PLATFORMS: PlatformConfig[] = [
  { id: 'baemin', name: '배민', feePercent: 6.8, adjustmentPercent: 0 },
  { id: 'coupang', name: '쿠팡', feePercent: 9.8, adjustmentPercent: 0 },
  { id: 'yogiyo', name: '요기요', feePercent: 12.5, adjustmentPercent: 0 },
  { id: 'naver', name: '네이버', feePercent: 3.5, adjustmentPercent: 0 },
  { id: 'store', name: '매장', feePercent: 1.5, adjustmentPercent: 0 },
];

const INITIAL_MENU: MenuItem[] = [
  { id: 'menu-1', name: '닭강정', costPercent: 0 },
  { id: 'menu-2', name: '국밥', costPercent: 0 },
  { id: 'menu-3', name: '냉면', costPercent: 0 },
];

const App: React.FC = () => {
  const STORAGE_KEYS = {
    MENU: 'biz_total_v17_menu',
    PLATFORMS: 'biz_total_v17_platforms',
    SALES: 'biz_total_v17_sales',
    EXPENSES: 'biz_total_v17_expenses',
    MEMOS: 'biz_total_v17_memos',
    THEME: 'biz_total_v17_theme',
    TEMP_FORM: 'biz_total_v17_temp_form',
    TEMP_QUEUE: 'biz_total_v17_temp_queue',
    TEMP_MEMO: 'biz_total_v17_temp_memo'
  };

  const [view, setView] = useState<'dashboard' | 'sales' | 'stats' | 'settings'>('dashboard');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [memos, setMemos] = useState<DailyMemo[]>([]);
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    return savedTheme !== 'light';
  });

  useEffect(() => {
    const savedMenu = localStorage.getItem(STORAGE_KEYS.MENU);
    const savedPlatforms = localStorage.getItem(STORAGE_KEYS.PLATFORMS);
    const savedSales = localStorage.getItem(STORAGE_KEYS.SALES);
    const savedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    const savedMemos = localStorage.getItem(STORAGE_KEYS.MEMOS);

    setMenuItems(savedMenu ? JSON.parse(savedMenu) : INITIAL_MENU);
    setPlatforms(savedPlatforms ? JSON.parse(savedPlatforms) : DEFAULT_PLATFORMS);
    setSales(savedSales ? JSON.parse(savedSales) : []);
    setExpenses(savedExpenses ? JSON.parse(savedExpenses) : []);
    setMemos(savedMemos ? JSON.parse(savedMemos) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menuItems));
    localStorage.setItem(STORAGE_KEYS.PLATFORMS, JSON.stringify(platforms));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    localStorage.setItem(STORAGE_KEYS.MEMOS, JSON.stringify(memos));
    localStorage.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [menuItems, platforms, sales, expenses, memos, darkMode]);

  const statsSummary = useMemo(() => {
    const totalRevenue = sales.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const totalSettlement = sales.reduce((acc, curr) => acc + curr.settlementAmount, 0);
    const fixedCosts = expenses.filter(e => e.type === 'fixed').reduce((acc, curr) => acc + curr.value, 0);
    const variableRate = expenses.filter(e => e.type === 'percent').reduce((acc, curr) => acc + (curr.value / 100), 0);
    const totalCosts = fixedCosts + (totalRevenue * variableRate);
    const totalProfit = totalSettlement - totalCosts;

    const dailyDataMap: Record<string, { date: string, revenue: number, settlement: number }> = {};
    sales.forEach(s => {
      const dateStr = s.date.split('T')[0].slice(5);
      if (!dailyDataMap[dateStr]) dailyDataMap[dateStr] = { date: dateStr, revenue: 0, settlement: 0 };
      dailyDataMap[dateStr].revenue += s.totalPrice;
      dailyDataMap[dateStr].settlement += s.settlementAmount;
    });
    const trendData = Object.keys(dailyDataMap).sort().map(date => dailyDataMap[date]).slice(-7);

    return { totalRevenue, totalSettlement, totalProfit, totalCosts, trendData };
  }, [sales, expenses]);

  const handleBulkAddSales = (records: SaleRecord[]) => {
    setSales(prev => [...records, ...prev]);
  };

  const handleSaveMemo = (date: string, content: string) => {
    setMemos(prev => {
      const filtered = prev.filter(m => m.date !== date);
      if (!content.trim()) return filtered;
      return [...filtered, { date, content }];
    });
  };

  const handleBackup = () => {
    const data = { menu: menuItems, platforms, sales, expenses, memos, backupDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `경희장부_백업_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('데이터를 복원하시겠습니까?')) {
          if (data.menu) setMenuItems(data.menu);
          if (data.platforms) setPlatforms(data.platforms);
          if (data.sales) setSales(data.sales);
          if (data.expenses) setExpenses(data.expenses);
          if (data.memos) setMemos(data.memos);
          alert('복구가 완료되었습니다!');
          window.location.reload();
        }
      } catch (err) {
        alert('올바르지 않은 파일입니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 lg:pl-64 transition-all duration-500 ${darkMode ? 'bg-black text-[#F2F2F7]' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}>
      <nav className={`fixed bottom-0 left-0 right-0 lg:top-0 lg:w-64 lg:h-full border-t lg:border-t-0 lg:border-r z-50 px-2 py-2 lg:p-6 flex lg:flex-col justify-around lg:justify-start gap-1 lg:gap-6 transition-all duration-300 ${darkMode ? 'bg-[#1C1C1E]/80 border-white/5' : 'bg-white/80 border-black/5'} backdrop-blur-3xl`}>
        <div className="hidden lg:block mb-10 px-2">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent">경희장부</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Premium Edition</p>
        </div>
        <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-chart-pie" label="홈" darkMode={darkMode} />
        <NavItem active={view === 'sales'} onClick={() => setView('sales')} icon="fa-plus-circle" label="판매입력" darkMode={darkMode} />
        <NavItem active={view === 'stats'} onClick={() => setView('stats'} icon="fa-magnifying-glass-chart" label="심층분석" darkMode={darkMode} />
        <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon="fa-sliders" label="설정" darkMode={darkMode} />
      </nav>

      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {view === 'dashboard' && <Dashboard stats={statsSummary} darkMode={darkMode} />}
        {view === 'sales' && <SalesBulkInput menuItems={menuItems} platforms={platforms} memos={memos} onFinalSubmit={handleBulkAddSales} onSaveMemo={handleSaveMemo} darkMode={darkMode} storageKeys={STORAGE_KEYS} />}
        {view === 'stats' && <AdvancedStats sales={sales} expenses={expenses} menuItems={menuItems} platforms={platforms} memos={memos} setSales={setSales} darkMode={darkMode} />}
        {view === 'settings' && <Settings menuItems={menuItems} setMenuItems={setMenuItems} platforms={platforms} setPlatforms={setPlatforms} expenses={expenses} setExpenses={setExpenses} darkMode={darkMode} setDarkMode={setDarkMode} onBackup={handleBackup} onRestore={handleRestore} />}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string; darkMode: boolean }> = ({ active, onClick, icon, label, darkMode }) => (
  <button onClick={onClick} className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 px-3 py-3 lg:px-5 lg:py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-[#448AFF] text-white shadow-lg active-tab-glow' : darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-black/5'}`}>
    <i className={`fas ${icon} text-lg lg:text-xl`}></i>
    <span className="text-[10px] lg:text-sm font-bold">{label}</span>
  </button>
);

const Dashboard: React.FC<{ stats: any, darkMode: boolean }> = ({ stats, darkMode }) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <header className="flex justify-between items-end">
      <div>
        <h2 className="text-3xl font-black">비즈니스 리포트</h2>
        <p className="text-sm font-semibold text-gray-500 mt-1">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준</p>
      </div>
    </header>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <StatCard label="총 매출액" value={stats.totalRevenue} color={darkMode ? "text-[#82B1FF]" : "text-blue-600"} darkMode={darkMode} />
      <StatCard label="정산 예정액" value={stats.totalSettlement} color={darkMode ? "text-indigo-300" : "text-indigo-600"} darkMode={darkMode} />
      <StatCard label="총 지출" value={stats.totalCosts} color={darkMode ? "text-[#FF8A80]" : "text-rose-600"} darkMode={darkMode} />
      <StatCard label="최종 순이익" value={stats.totalProfit} color={darkMode ? "text-[#B9F6CA]" : "text-emerald-600"} darkMode={darkMode} />
    </div>

    <div className="apple-card p-6 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">최근 7일 실적 추이</h3>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={stats.trendData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#8e8e93'}} />
            <YAxis hide />
            <Tooltip 
              contentStyle={{backgroundColor: darkMode ? '#2C2C2E' : '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}} 
              itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
              formatter={(v: any) => [`${Math.round(v).toLocaleString()}원`, '']} 
            />
            <Line type="monotone" dataKey="revenue" name="매출" stroke="#448AFF" strokeWidth={4} dot={{r: 4, fill: '#448AFF', strokeWidth: 2, stroke: darkMode ? '#1C1C1E' : '#fff'}} />
            <Line type="monotone" dataKey="settlement" name="정산" stroke="#818cf8" strokeWidth={4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const AdvancedStats: React.FC<{ sales: SaleRecord[], expenses: ExpenseItem[], menuItems: MenuItem[], platforms: PlatformConfig[], memos: DailyMemo[], setSales: any, darkMode: boolean }> = ({ sales, expenses, menuItems, platforms, memos, setSales, darkMode }) => {
  const [timeUnit, setTimeUnit] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);

  const getPName = (id: string) => platforms.find(p => p.id === id)?.name || id;
  const getMName = (id: string) => menuItems.find(m => m.id === id)?.name || id;

  const filteredSales = useMemo(() => sales.filter(s => s.date.startsWith(searchDate)), [sales, searchDate]);
  const currentMemo = useMemo(() => memos.find(m => m.date === searchDate)?.content || '', [memos, searchDate]);

  const searchSummary = useMemo(() => {
    const revenue = filteredSales.reduce((acc, s) => acc + s.totalPrice, 0);
    const settlement = filteredSales.reduce((acc, s) => acc + s.settlementAmount, 0);
    return { revenue, settlement };
  }, [filteredSales]);

  // 기간별 집계 로직 (주간 추가)
  const aggregated = useMemo(() => {
    const map: Record<string, { label: string, revenue: number, settlement: number, profit: number }> = {};
    const fixed = expenses.filter(e => e.type === 'fixed').reduce((acc, curr) => acc + curr.value, 0);
    const vRate = expenses.filter(e => e.type === 'percent').reduce((acc, curr) => acc + (curr.value / 100), 0);

    sales.forEach(s => {
      const d = new Date(s.date);
      let key = ''; let label = '';
      if (timeUnit === 'daily') { 
        key = s.date.split('T')[0]; 
        label = key.slice(5); 
      } else if (timeUnit === 'weekly') {
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${weekNum}`;
        label = `${weekNum}주차`;
      } else if (timeUnit === 'monthly') { 
        key = `${d.getFullYear()}-${d.getMonth()+1}`; 
        label = `${d.getMonth()+1}월`; 
      } else { 
        key = `${d.getFullYear()}`; 
        label = `${key}년`; 
      }
      if (!map[key]) map[key] = { label, revenue: 0, settlement: 0, profit: 0 };
      map[key].revenue += s.totalPrice;
      map[key].settlement += s.settlementAmount;
    });

    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([_, v]) => {
      let fCost = timeUnit === 'daily' ? fixed/30 : timeUnit === 'weekly' ? fixed/4 : timeUnit === 'monthly' ? fixed : fixed*12;
      return { ...v, profit: v.settlement - (v.revenue * vRate) - fCost };
    }).slice(timeUnit === 'daily' ? -14 : -10);
  }, [sales, expenses, timeUnit]);

  // 메뉴별 분석 데이터 (모든 기간 합산용 또는 선택 기간용)
  const menuRanking = useMemo(() => {
    const map: Record<string, { name: string, qty: number, revenue: number }> = {};
    const targetSales = timeUnit === 'daily' ? filteredSales : sales; // 일간일때는 선택날짜, 나머지는 전체 데이터(샘플링)
    
    targetSales.forEach(s => {
      if (!map[s.menuId]) map[s.menuId] = { name: getMName(s.menuId), qty: 0, revenue: 0 };
      map[s.menuId].qty += s.quantity;
      map[s.menuId].revenue += s.totalPrice;
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [sales, filteredSales, timeUnit, menuItems]);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <h2 className="text-3xl font-black">심층 분석</h2>
        <div className={`flex p-1.5 rounded-2xl ${darkMode ? 'bg-[#1C1C1E]' : 'bg-gray-200'}`}>
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(u => (
            <button key={u} onClick={() => setTimeUnit(u)} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${timeUnit === u ? 'bg-[#448AFF] text-white shadow-md' : 'text-gray-500'}`}>
              {u === 'daily' ? '일간' : u === 'weekly' ? '주간' : u === 'monthly' ? '월간' : '연간'}
            </button>
          ))}
        </div>
      </header>

      <div className="apple-card p-6 md:p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">조회 및 메모</h3>
          <input 
            type="date" 
            value={searchDate} 
            onChange={e => setSearchDate(e.target.value)}
            className={`text-sm font-bold p-3 rounded-2xl border-none outline-none transition-all ${darkMode ? 'bg-[#2C2C2E] text-white' : 'bg-gray-100 text-gray-900 focus:ring-2 ring-blue-500'}`}
          />
        </div>

        {currentMemo && (
          <div className={`p-6 rounded-3xl border-l-4 border-amber-400 ${darkMode ? 'bg-amber-400/5' : 'bg-amber-50'}`}>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2"><i className="fas fa-sticky-note mr-1"></i> 당일 특이사항</p>
            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{currentMemo}</p>
          </div>
        )}
        
        {filteredSales.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                <p className="text-[10px] font-black text-[#448AFF] uppercase mb-1">일 매출액</p>
                <p className="text-xl font-black text-[#448AFF]">{searchSummary.revenue.toLocaleString()}원</p>
              </div>
              <div className={`p-5 rounded-2xl ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <p className="text-[10px] font-black text-[#B9F6CA] uppercase mb-1">일 정산액</p>
                <p className="text-xl font-black text-[#B9F6CA]">{searchSummary.settlement.toLocaleString()}원</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm font-bold text-gray-500">조회된 날짜의 매출 데이터가 없습니다.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="apple-card p-6 md:p-8">
          <h3 className="text-xs font-black mb-8 uppercase tracking-widest text-gray-500">수익성 흐름 ({timeUnit})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregated}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                <XAxis dataKey="label" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#8e8e93'}} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} contentStyle={{borderRadius: '16px', border: 'none', backgroundColor: darkMode ? '#2C2C2E' : '#fff'}} formatter={(v: any) => `${Math.round(v).toLocaleString()}원`} />
                <Bar dataKey="revenue" name="매출" fill="#448AFF" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="profit" name="순익" fill="#B9F6CA" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="apple-card p-6 md:p-8">
          <h3 className="text-xs font-black mb-8 uppercase tracking-widest text-gray-500">메뉴별 판매 랭킹</h3>
          <div className="space-y-4 max-h-[256px] overflow-y-auto no-scrollbar">
            {menuRanking.map((m, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-400 text-white' : darkMode ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold">{m.name}</span>
                    <span className="text-xs font-black">{m.revenue.toLocaleString()}원</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${(m.revenue / menuRanking[0].revenue) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-[10px] font-black text-gray-500 whitespace-nowrap">{m.qty}개</div>
              </div>
            ))}
            {menuRanking.length === 0 && <p className="text-center py-10 text-xs text-gray-500">판매 기록이 없습니다.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string; darkMode: boolean }> = ({ label, value, color, darkMode }) => (
  <div className={`apple-card p-6 flex flex-col justify-between transition-all hover:scale-[1.02] cursor-default border-l-4 ${darkMode ? 'border-l-white/10' : 'border-l-black/5'}`}>
    <span className="text-gray-500 text-[10px] font-black uppercase tracking-tighter mb-2">{label}</span>
    <span className={`text-xl font-black ${color}`}>{Math.round(value).toLocaleString()}<span className="text-[10px] ml-1 opacity-60">원</span></span>
  </div>
);

const SalesBulkInput: React.FC<{ menuItems: MenuItem[], platforms: PlatformConfig[], memos: DailyMemo[], onFinalSubmit: (records: SaleRecord[]) => void, onSaveMemo: (date: string, content: string) => void, darkMode: boolean, storageKeys: any }> = ({ menuItems, platforms, memos, onFinalSubmit, onSaveMemo, darkMode, storageKeys }) => {
  const [platform, setPlatform] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [formData, setFormData] = useState<Record<string, { qty: string, price: string }>>(() => {
    const saved = localStorage.getItem(storageKeys.TEMP_FORM);
    return saved ? JSON.parse(saved) : {};
  });
  
  const [tempQueue, setTempQueue] = useState<SaleRecord[]>(() => {
    const saved = localStorage.getItem(storageKeys.TEMP_QUEUE);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [memoContent, setMemoContent] = useState(() => {
    return localStorage.getItem(storageKeys.TEMP_MEMO) || '';
  });

  const [isFinishing, setIsFinishing] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const [lastFinishedReport, setLastFinishedReport] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(storageKeys.TEMP_FORM, JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    localStorage.setItem(storageKeys.TEMP_QUEUE, JSON.stringify(tempQueue));
  }, [tempQueue]);

  useEffect(() => {
    localStorage.setItem(storageKeys.TEMP_MEMO, memoContent);
  }, [memoContent]);

  useEffect(() => {
    const existingMemo = memos.find(m => m.date === date);
    if (existingMemo) setMemoContent(existingMemo.content);
  }, [date, memos]);

  const getPName = (id: string) => platforms.find(p => p.id === id)?.name || id;
  const getMName = (id: string) => menuItems.find(m => m.id === id)?.name || id;

  const addToQueue = () => {
    const targetPlatform = platforms.find(p => p.id === platform);
    if (!targetPlatform) return;

    const newRecords: SaleRecord[] = Object.entries(formData)
      .filter(([_, v]) => Number((v as any).qty) > 0)
      .map(([id, v]) => {
        const val = v as any;
        const totalPrice = Number(val.price) || 0;
        const totalFeePercent = (targetPlatform.feePercent || 0) + (targetPlatform.adjustmentPercent || 0);
        const commission = totalPrice * (totalFeePercent / 100);
        const settlementAmount = totalPrice - commission;
        const targetDate = new Date(date);
        const now = new Date();
        targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

        return {
          id: crypto.randomUUID(),
          date: targetDate.toISOString(),
          platformId: platform,
          menuId: id,
          quantity: Number(val.qty),
          totalPrice,
          settlementAmount,
          netProfit: settlementAmount,
        };
      });

    if (newRecords.length === 0) return;
    setTempQueue(prev => [...prev, ...newRecords]);
    setFormData({});
  };

  const removeFromQueue = (id: string) => {
    setTempQueue(prev => prev.filter(r => r.id !== id));
  };

  const clearAllTempData = () => {
    if (confirm('입력 중인 모든 데이터를 초기화하시겠습니까?')) {
      setFormData({});
      setTempQueue([]);
      setMemoContent('');
      setLastFinishedReport(null);
      localStorage.removeItem(storageKeys.TEMP_FORM);
      localStorage.removeItem(storageKeys.TEMP_QUEUE);
      localStorage.removeItem(storageKeys.TEMP_MEMO);
    }
  };

  const submitFinal = () => {
    if (tempQueue.length === 0) return;
    setIsFinishing(true);
    
    // 메뉴별 합계 계산 (레포트용)
    const menuMap: Record<string, { name: string, qty: number, total: number }> = {};
    tempQueue.forEach(r => {
      if (!menuMap[r.menuId]) menuMap[r.menuId] = { name: getMName(r.menuId), qty: 0, total: 0 };
      menuMap[r.menuId].qty += r.quantity;
      menuMap[r.menuId].total += r.totalPrice;
    });

    setTimeout(() => {
      onFinalSubmit(tempQueue);
      setLastFinishedReport(Object.values(menuMap));
      setTempQueue([]);
      setFormData({});
      localStorage.removeItem(storageKeys.TEMP_FORM);
      localStorage.removeItem(storageKeys.TEMP_QUEUE);
      setIsFinishing(false);
      alert('정산 마감이 완료되었습니다! 메뉴별 합계를 확인하세요.');
    }, 800);
  };

  const saveMemo = () => {
    onSaveMemo(date, memoContent);
    setMemoSaved(true);
    localStorage.removeItem(storageKeys.TEMP_MEMO);
    setTimeout(() => setMemoSaved(false), 2000);
  };

  const downloadTemplate = () => {
    const header = "플랫폼,메뉴,수량,총액\n";
    const example = `${platforms[0]?.name || '배민'},${menuItems[0]?.name || '메뉴명'},1,15000\n`;
    const blob = new Blob(["\uFEFF" + header + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', '경희장부_판매양식.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      const newRecords: SaleRecord[] = [];

      for (let i = 1; i < lines.length; i++) {
        const [pName, mName, qty, price] = lines[i].split(',').map(s => s.trim());
        const platformObj = platforms.find(p => p.name === pName);
        const menuObj = menuItems.find(m => m.name === mName);

        if (platformObj && menuObj && Number(qty) > 0) {
          const totalPrice = Number(price) || 0;
          const totalFeePercent = (platformObj.feePercent || 0) + (platformObj.adjustmentPercent || 0);
          const commission = totalPrice * (totalFeePercent / 100);
          const settlementAmount = totalPrice - commission;
          const targetDate = new Date(date);
          const now = new Date();
          targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

          newRecords.push({
            id: crypto.randomUUID(),
            date: targetDate.toISOString(),
            platformId: platformObj.id,
            menuId: menuObj.id,
            quantity: Number(qty),
            totalPrice,
            settlementAmount,
            netProfit: settlementAmount,
          });
        }
      }

      if (newRecords.length > 0) {
        setTempQueue(prev => [...prev, ...newRecords]);
        alert(`${newRecords.length}개의 내역을 대기 목록에 추가했습니다.`);
      } else {
        alert('인식된 데이터가 없습니다.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black">판매 실적 입력</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={clearAllTempData} className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-rose-500/10 text-rose-500 hover:bg-rose-500/20">초기화</button>
          <button onClick={downloadTemplate} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${darkMode ? 'bg-amber-400/10 text-amber-500 hover:bg-amber-400/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>양식</button>
          <button onClick={() => fileInputRef.current?.click()} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}><i className="fas fa-file-excel mr-1"></i> 업로드</button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
        </div>
      </div>
      
      {/* STEP 1: 입력 폼 */}
      <div className="apple-card p-6 md:p-8 space-y-8 border-t-4 border-[#448AFF]">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-[#448AFF] uppercase tracking-widest">STEP 1. 정보 입력</p>
            <h3 className="text-lg font-black">플랫폼별 실적 기입</h3>
          </div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className={`text-sm font-bold p-3 rounded-2xl outline-none border-none ${darkMode ? 'bg-[#2C2C2E]' : 'bg-gray-100'}`} />
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {platforms.map(p => (
            <button key={p.id} onClick={()=>setPlatform(p.id)} className={`flex-none px-6 py-3 rounded-2xl font-black text-xs transition-all duration-300 ${platform === p.id ? 'bg-[#448AFF] text-white shadow-lg' : darkMode ? 'bg-[#2C2C2E] text-gray-500' : 'bg-gray-100 text-gray-400'}`}>{p.name}</button>
          ))}
        </div>

        <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
          {menuItems.map(m => (
            <div key={m.id} className={`grid grid-cols-12 gap-3 items-center p-4 rounded-3xl transition-all ${darkMode ? 'bg-[#2C2C2E]/30 hover:bg-[#2C2C2E]' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <div className="col-span-4 text-sm font-bold truncate">{m.name}</div>
              <input type="number" inputMode="numeric" placeholder="수량" value={formData[m.id]?.qty||''} onChange={e=>setFormData({...formData,[m.id]:{...formData[m.id],qty:e.target.value}})} className={`col-span-3 p-3 rounded-2xl border-none font-black text-center text-sm ${darkMode ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`} />
              <div className="col-span-5 relative">
                <input type="number" inputMode="numeric" placeholder="총액" value={formData[m.id]?.price||''} onChange={e=>setFormData({...formData,[m.id]:{...formData[m.id],price:e.target.value}})} className={`w-full p-3 rounded-2xl border-none font-black text-right text-sm pr-7 ${darkMode ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">₩</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addToQueue} className={`w-full py-4 rounded-3xl font-black text-sm transition-all ${platform ? 'bg-white/10 hover:bg-white/20' : 'opacity-30 cursor-not-allowed'}`}>
          <i className="fas fa-plus mr-2"></i> 확인용 목록에 추가
        </button>
      </div>

      {/* STEP 2: 대기 목록 */}
      <div className="apple-card p-6 md:p-8 space-y-6 border-t-4 border-[#B9F6CA]">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-[#B9F6CA] uppercase tracking-widest">STEP 2. 정산 대기 목록</p>
          <h3 className="text-lg font-black">오늘의 정산 내역 확인</h3>
        </div>

        {tempQueue.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {tempQueue.map(r => (
                <div key={r.id} className={`flex justify-between items-center p-4 rounded-2xl ${darkMode ? 'bg-[#2C2C2E]/60' : 'bg-gray-50'}`}>
                  <div className="flex gap-4 items-center">
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400">{getPName(r.platformId)}</span>
                    <span className="text-sm font-bold">{getMName(r.menuId)}</span>
                    <span className="text-xs text-gray-500">x{r.quantity}</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-sm font-black">{r.totalPrice.toLocaleString()}원</span>
                    <button onClick={() => removeFromQueue(r.id)} className="text-gray-600 hover:text-rose-500"><i className="fas fa-times"></i></button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl text-white shadow-xl shadow-emerald-500/20">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold opacity-80 uppercase">마감 합계</span>
                <span className="text-2xl font-black">{tempQueue.reduce((acc, r) => acc + r.totalPrice, 0).toLocaleString()}원</span>
              </div>
              <button onClick={submitFinal} disabled={isFinishing} className="w-full py-4 bg-white text-emerald-600 rounded-2xl font-black text-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                {isFinishing ? <i className="fas fa-circle-notch animate-spin"></i> : <><i className="fas fa-check-double"></i> 정산 마감하기</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm font-bold text-gray-600">입력된 대기 내역이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 신설: 오늘의 정산 리포트 (메뉴별 합계) */}
      {lastFinishedReport && (
        <div className="apple-card p-6 md:p-8 space-y-6 border-t-4 border-indigo-500 bg-indigo-500/5 animate-in zoom-in-95 duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-indigo-500"><i className="fas fa-file-invoice-dollar mr-2"></i>오늘의 메뉴별 합계</h3>
            <button onClick={() => setLastFinishedReport(null)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
          </div>
          <div className="divide-y divide-indigo-500/10">
            {lastFinishedReport.map((m, idx) => (
              <div key={idx} className="flex justify-between py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{m.name}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500 text-white">x{m.qty}</span>
                </div>
                <span className="font-black text-sm">{m.total.toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-indigo-500/20 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase">오늘 총 판매액</span>
            <span className="text-xl font-black text-indigo-600">{lastFinishedReport.reduce((acc, c) => acc + c.total, 0).toLocaleString()}원</span>
          </div>
        </div>
      )}

      {/* STEP 3: 메모 */}
      <div className="apple-card p-6 md:p-8 space-y-4 border-t-4 border-amber-400">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black">오늘의 특이사항</h3>
          <button onClick={saveMemo} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${memoSaved ? 'bg-emerald-500 text-white' : 'bg-amber-400/10 text-amber-500 hover:bg-amber-400/20'}`}>
            {memoSaved ? '저장됨 ✓' : '메모 저장'}
          </button>
        </div>
        <textarea 
          placeholder="오늘의 이슈를 기록하세요..."
          value={memoContent}
          onChange={(e) => setMemoContent(e.target.value)}
          className={`w-full h-32 p-5 rounded-3xl font-medium text-sm outline-none resize-none transition-all leading-relaxed ${darkMode ? 'bg-[#1C1C1E] text-gray-300' : 'bg-gray-50 text-gray-800 focus:bg-white focus:ring-2 ring-amber-100'}`}
        />
      </div>
    </div>
  );
};

const Settings: React.FC<{ menuItems: MenuItem[], setMenuItems: any, platforms: PlatformConfig[], setPlatforms: any, expenses: ExpenseItem[], setExpenses: any, darkMode: boolean, setDarkMode: any, onBackup: () => void, onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ menuItems, setMenuItems, platforms, setPlatforms, expenses, setExpenses, darkMode, setDarkMode, onBackup, onRestore }) => {
  const [tab, setTab] = useState<'menu' | 'platform' | 'expense'>('menu');
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [v1, setV1] = useState('0');
  const [v2, setV2] = useState('0');
  const [type, setType] = useState<'fixed' | 'percent'>('fixed');

  const startEdit = (item: any, type: 'menu' | 'platform' | 'expense') => {
    setEditId(item.id); setName(item.name);
    if (type === 'platform') { setV1(String(item.feePercent)); setV2(String(item.adjustmentPercent)); }
    else if (type === 'expense') { setV1(String(item.value)); setType(item.type); }
    setShow(true);
  };

  const save = () => {
    if (!name) return;
    if (tab === 'menu') {
      if (editId) setMenuItems(menuItems.map(m => m.id === editId ? { ...m, name } : m));
      else setMenuItems([...menuItems, { id: crypto.randomUUID(), name, costPercent: 0 }]);
    } else if (tab === 'platform') {
      const p = { id: editId || crypto.randomUUID(), name, feePercent: Number(v1), adjustmentPercent: Number(v2) };
      if (editId) setPlatforms(platforms.map(i => i.id === editId ? p : i));
      else setPlatforms([...platforms, p]);
    } else {
      const e = { id: editId || crypto.randomUUID(), name, value: Number(v1), type };
      if (editId) setExpenses(expenses.map(i => i.id === editId ? e : i));
      else setExpenses([...expenses, e]);
    }
    setShow(false); setEditId(null); setName(''); setV1('0'); setV2('0');
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-3xl font-black">비즈니스 설정</h2>
      <div className={`flex p-1.5 rounded-2xl ${darkMode ? 'bg-[#1C1C1E]' : 'bg-gray-200'}`}>
        {(['menu', 'platform', 'expense'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${tab === t ? 'bg-[#448AFF] text-white shadow-md' : 'text-gray-500'}`}>{t==='menu'?'메뉴':t==='platform'?'플랫폼':'지출'}</button>
        ))}
      </div>
      
      <div className="apple-card p-6 md:p-8 min-h-[400px]">
        {show ? (
          <div className="space-y-8 max-w-sm mx-auto animate-in zoom-in-95 duration-300">
            <h4 className="font-black text-xl text-center">{editId ? '정보 수정' : '새 항목 추가'}</h4>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase px-1">항목명</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="이름을 입력하세요" className={`w-full p-5 rounded-2xl font-bold text-sm outline-none border-none ${darkMode ? 'bg-[#2C2C2E] text-white' : 'bg-gray-100 text-gray-900'}`} />
              </div>
              {tab === 'platform' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase px-1">중개 수수료(%)</label>
                    <input type="number" step="0.1" value={v1} onChange={e=>setV1(e.target.value)} className={`w-full p-5 rounded-2xl font-bold text-sm outline-none border-none ${darkMode ? 'bg-[#2C2C2E] text-blue-400' : 'bg-gray-100 text-blue-600'}`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase px-1">기타 수수료(%)</label>
                    <input type="number" step="0.1" value={v2} onChange={e=>setV2(e.target.value)} className={`w-full p-5 rounded-2xl font-bold text-sm outline-none border-none ${darkMode ? 'bg-[#2C2C2E] text-rose-400' : 'bg-gray-100 text-rose-600'}`} />
                  </div>
                </div>
              )}
              {tab === 'expense' && (
                <div className="space-y-6">
                  <div className={`flex p-1 rounded-2xl ${darkMode ? 'bg-[#1C1C1E]' : 'bg-gray-200'}`}>
                    <button onClick={()=>setType('fixed')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${type==='fixed'?'bg-white dark:bg-[#2C2C2E] text-blue-500 shadow-sm':'text-gray-500'}`}>월 고정비(원)</button>
                    <button onClick={()=>setType('percent')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${type==='percent'?'bg-white dark:bg-[#2C2C2E] text-rose-500 shadow-sm':'text-gray-500'}`}>매출 대비(%)</button>
                  </div>
                  <input type="number" value={v1} onChange={e=>setV1(e.target.value)} className={`w-full p-5 rounded-2xl font-bold text-sm outline-none border-none ${darkMode ? 'bg-[#2C2C2E]' : 'bg-gray-100'}`} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={save} className="w-full py-5 bg-[#448AFF] hover:bg-blue-600 text-white rounded-3xl font-black shadow-lg transition-all">저장하기</button>
              <button onClick={()=>{setShow(false); setEditId(null); setName('');}} className="w-full py-3 text-gray-500 font-bold text-xs hover:text-gray-300">취소</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button onClick={()=>{setEditId(null); setName(''); setV1('0'); setV2('0'); setShow(true);}} className={`w-full py-5 border-2 border-dashed rounded-3xl font-bold text-sm transition-all ${darkMode ? 'border-white/5 text-gray-600 hover:border-blue-500/50' : 'border-black/5 text-gray-400 hover:border-blue-500/50'}`}>+ 새로운 항목 추가</button>
            <div className="grid gap-3">
              {tab === 'menu' && menuItems.map(m => (
                <div key={m.id} className={`flex justify-between items-center p-5 rounded-3xl transition-all ${darkMode ? 'bg-[#2C2C2E]/50 hover:bg-[#2C2C2E]' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <span className="font-bold text-sm">{m.name}</span>
                  <div className="flex gap-5">
                    <button onClick={()=>startEdit(m, 'menu')} className="text-gray-600 hover:text-blue-500 transition-colors"><i className="fas fa-edit"></i></button>
                    <button onClick={()=>setMenuItems(menuItems.filter(i=>i.id!==m.id))} className="text-gray-600 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))}
              {tab === 'platform' && platforms.map(p => (
                <div key={p.id} className={`p-5 rounded-3xl flex justify-between items-center transition-all ${darkMode ? 'bg-[#2C2C2E]/50 hover:bg-[#2C2C2E]' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <div>
                    <p className="font-bold text-sm">{p.name}</p>
                    <p className="text-[10px] font-semibold text-gray-500">수수료 {p.feePercent}% · 조정 {p.adjustmentPercent}%</p>
                  </div>
                  <div className="flex gap-5">
                    <button onClick={()=>startEdit(p, 'platform')} className="text-gray-600 hover:text-blue-500 transition-colors"><i className="fas fa-edit"></i></button>
                    <button onClick={()=>setPlatforms(platforms.filter(i=>i.id!==p.id))} className="text-gray-600 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))}
              {tab === 'expense' && expenses.map(e => (
                <div key={e.id} className={`p-5 rounded-3xl flex justify-between items-center transition-all ${darkMode ? 'bg-[#2C2C2E]/50 hover:bg-[#2C2C2E]' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <div>
                    <p className="font-bold text-sm">{e.name}</p>
                    <p className="text-[10px] font-semibold text-gray-500">{e.type==='fixed'?'월 고정비':'월 매출 대비 비율'}</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className={`font-black text-sm ${e.type === 'percent' ? 'text-rose-400' : 'text-emerald-400'}`}>{e.value.toLocaleString()}{e.type==='fixed'?'원':'%'}</span>
                    <button onClick={()=>startEdit(e, 'expense')} className="text-gray-600 hover:text-blue-500 transition-colors"><i className="fas fa-edit"></i></button>
                    <button onClick={()=>setExpenses(expenses.filter(i=>i.id!==e.id))} className="text-gray-600 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="apple-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">테마 모드</span>
          <button onClick={()=>setDarkMode(!darkMode)} className={`w-14 h-8 rounded-full relative transition-all duration-500 ${darkMode ? 'bg-blue-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-md flex items-center justify-center ${darkMode ? 'left-7' : 'left-1'}`}>
              <i className={`fas ${darkMode ? 'fa-moon text-blue-500' : 'fa-sun text-orange-400'} text-[10px]`}></i>
            </div>
          </button>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button onClick={onBackup} className="flex-1 md:flex-none px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold transition-all">백업</button>
          <label className="flex-1 md:flex-none px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-center cursor-pointer transition-all">
            복원
            <input type="file" accept=".json" onChange={onRestore} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};

export default App;
