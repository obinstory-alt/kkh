
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import * as XLSX from 'xlsx';
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

interface InternalBackup {
  id: string;
  timestamp: string;
  data: string; // JSON string
}

const App: React.FC = () => {
  const CURRENT_VERSION = 'v18';
  const STORAGE_KEYS = {
    MENU: `biz_total_${CURRENT_VERSION}_menu`,
    PLATFORMS: `biz_total_${CURRENT_VERSION}_platforms`,
    SALES: `biz_total_${CURRENT_VERSION}_sales`,
    EXPENSES: `biz_total_${CURRENT_VERSION}_expenses`,
    MEMOS: `biz_total_${CURRENT_VERSION}_memos`,
    THEME: `biz_total_${CURRENT_VERSION}_theme`,
    TEMP_FORM: `biz_total_${CURRENT_VERSION}_temp_form`,
    TEMP_QUEUE: `biz_total_${CURRENT_VERSION}_temp_queue`,
    TEMP_MEMO: `biz_total_${CURRENT_VERSION}_temp_memo`,
    BACKUPS: `biz_total_${CURRENT_VERSION}_internal_backups`
  };

  const [view, setView] = useState<'dashboard' | 'sales' | 'stats' | 'settings'>('dashboard');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [memos, setMemos] = useState<DailyMemo[]>([]);
  const [internalBackups, setInternalBackups] = useState<InternalBackup[]>([]);
  
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
    const savedBackups = localStorage.getItem(STORAGE_KEYS.BACKUPS);

    setMenuItems(savedMenu ? JSON.parse(savedMenu) : INITIAL_MENU);
    setPlatforms(savedPlatforms ? JSON.parse(savedPlatforms) : DEFAULT_PLATFORMS);
    setSales(savedSales ? JSON.parse(savedSales) : []);
    setExpenses(savedExpenses ? JSON.parse(savedExpenses) : []);
    setMemos(savedMemos ? JSON.parse(savedMemos) : []);
    setInternalBackups(savedBackups ? JSON.parse(savedBackups) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menuItems));
    localStorage.setItem(STORAGE_KEYS.PLATFORMS, JSON.stringify(platforms));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    localStorage.setItem(STORAGE_KEYS.MEMOS, JSON.stringify(memos));
    localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(internalBackups));
    localStorage.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [menuItems, platforms, sales, expenses, memos, internalBackups, darkMode]);

  const statsSummary = useMemo(() => {
    const fixedCosts = expenses.filter(e => e.type === 'fixed').reduce((acc, curr) => acc + curr.value, 0);
    const variableRate = expenses.filter(e => e.type === 'percent').reduce((acc, curr) => acc + (curr.value / 100), 0);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); 

    const mtdSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const mtdRevenue = mtdSales.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const mtdSettlement = mtdSales.reduce((acc, curr) => acc + curr.settlementAmount, 0);
    const mtdProfit = mtdSettlement - (mtdRevenue * variableRate) - (fixedCosts / 30 * now.getDate());

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const targetYear = lastMonthDate.getFullYear();
    const targetMonth = lastMonthDate.getMonth();

    const lastMonthSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
    const lastMonthRevenue = lastMonthSales.reduce((acc, curr) => acc + curr.totalPrice, 0);

    const dailyDataMap: Record<string, { date: string, revenue: number, settlement: number }> = {};
    sales.forEach(s => {
      const d = new Date(s.date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      if (!dailyDataMap[dateStr]) dailyDataMap[dateStr] = { date: dateStr, revenue: 0, settlement: 0 };
      dailyDataMap[dateStr].revenue += s.totalPrice;
      dailyDataMap[dateStr].settlement += s.settlementAmount;
    });
    const trendData = Object.keys(dailyDataMap).slice(-7).map(k => dailyDataMap[k]);

    return { 
      trendData, 
      mtdRevenue, mtdSettlement, mtdProfit,
      lastMonthRevenue,
      currentMonthName: currentMonth + 1,
      lastMonthName: targetMonth + 1
    };
  }, [sales, expenses]);

  const triggerAutoBackup = (newSales?: SaleRecord[]) => {
    const currentData = {
      menu: menuItems,
      platforms,
      sales: newSales || sales,
      expenses,
      memos
    };
    const newBackup: InternalBackup = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data: JSON.stringify(currentData)
    };
    
    setInternalBackups(prev => {
      const updated = [newBackup, ...prev];
      return updated.slice(0, 10);
    });
  };

  const handleBulkAddSales = (records: SaleRecord[]) => {
    const updatedSales = [...records, ...sales];
    setSales(updatedSales);
    triggerAutoBackup(updatedSales);
  };

  const handleSaveMemo = (date: string, content: string) => {
    setMemos(prev => {
      const filtered = prev.filter(m => m.date !== date);
      if (!content.trim()) return filtered;
      return [...filtered, { date, content }];
    });
  };

  const handleRestoreFromInternal = (backup: InternalBackup) => {
    if (confirm(`${new Date(backup.timestamp).toLocaleString()} 버전으로 데이터를 복원하시겠습니까?`)) {
      try {
        const parsed = JSON.parse(backup.data);
        if (parsed.menu) setMenuItems(parsed.menu);
        if (parsed.platforms) setPlatforms(parsed.platforms);
        if (parsed.sales) setSales(parsed.sales);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.memos) setMemos(parsed.memos);
        alert('데이터 복원이 완료되었습니다.');
      } catch (e) {
        alert('복원에 실패했습니다.');
      }
    }
  };

  const handleMigration = () => {
    // 로컬 스토리지 전체를 뒤져서 'biz_total_' 로 시작하는 모든 데이터를 수집
    let foundSales: SaleRecord[] = [];
    let foundMemos: DailyMemo[] = [];
    let foundMenu: MenuItem[] = [];
    let foundPlat: PlatformConfig[] = [];
    let foundExp: ExpenseItem[] = [];
    let keyCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('biz_total_') && !key.includes(CURRENT_VERSION)) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (key.endsWith('_sales')) foundSales = [...foundSales, ...parsed];
          if (key.endsWith('_memos')) foundMemos = [...foundMemos, ...parsed];
          if (key.endsWith('_menu')) foundMenu = parsed;
          if (key.endsWith('_platforms')) foundPlat = parsed;
          if (key.endsWith('_expenses')) foundExp = parsed;
          keyCount++;
        } catch (e) {}
      }
    }

    if (keyCount > 0) {
      if (confirm(`휴대폰 저장소에서 과거 데이터 흔적(${keyCount}개 항목)을 발견했습니다!\n사라진 판매 내역과 설정을 모두 가져오시겠습니까?`)) {
        // 중복 제거 (ID 기준)
        const combinedSales = [...sales, ...foundSales];
        const uniqueSales = Array.from(new Map(combinedSales.map(item => [item.id, item])).values());
        
        const combinedMemos = [...memos, ...foundMemos];
        const uniqueMemos = Array.from(new Map(combinedMemos.map(item => [item.date, item])).values());

        if (uniqueSales.length > 0) setSales(uniqueSales);
        if (uniqueMemos.length > 0) setMemos(uniqueMemos);
        if (foundMenu.length > 0) setMenuItems(foundMenu);
        if (foundPlat.length > 0) setPlatforms(foundPlat);
        if (foundExp.length > 0) setExpenses(foundExp);

        alert(`복구가 완료되었습니다!\n판매내역: ${uniqueSales.length}건\n메모: ${uniqueMemos.length}건\n설정 정보가 모두 복구되었습니다.`);
      }
    } else {
      alert('과거 데이터 흔적을 찾지 못했습니다.\n이미 초기화되었거나 다른 브라우저를 사용 중이신지 확인해주세요.');
    }
  };

  const handleDeleteBackup = (id: string) => {
    if (confirm('해당 백업을 삭제하시겠습니까?')) {
      setInternalBackups(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleResetAll = () => {
    if (confirm('⚠️ 모든 데이터가 영구 삭제됩니다. 계속하시겠습니까?')) {
      localStorage.clear();
      window.location.reload();
    }
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
        if (confirm('파일로부터 데이터를 복원하시겠습니까?')) {
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
        <NavItem active={view === 'stats'} onClick={() => setView('stats')} icon="fa-magnifying-glass-chart" label="심층분석" darkMode={darkMode} />
        <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon="fa-sliders" label="설정" darkMode={darkMode} />
      </nav>

      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {view === 'dashboard' && <Dashboard stats={statsSummary} darkMode={darkMode} />}
        {view === 'sales' && <SalesBulkInput sales={sales} menuItems={menuItems} platforms={platforms} memos={memos} onFinalSubmit={handleBulkAddSales} onSaveMemo={handleSaveMemo} darkMode={darkMode} storageKeys={STORAGE_KEYS} stats={statsSummary} />}
        {view === 'stats' && <AdvancedStats sales={sales} expenses={expenses} menuItems={menuItems} platforms={platforms} memos={memos} setSales={setSales} darkMode={darkMode} />}
        {view === 'settings' && (
          <Settings 
            version={CURRENT_VERSION}
            menuItems={menuItems} setMenuItems={setMenuItems} 
            platforms={platforms} setPlatforms={setPlatforms} 
            expenses={expenses} setExpenses={setExpenses} 
            internalBackups={internalBackups}
            onRestoreInternal={handleRestoreFromInternal}
            onDeleteBackup={handleDeleteBackup}
            onMigration={handleMigration}
            darkMode={darkMode} setDarkMode={setDarkMode} 
            onBackup={handleBackup} onRestore={handleRestore}
            onResetAll={handleResetAll}
          />
        )}
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
      <StatCard label={`전월 매출`} value={stats.lastMonthRevenue} color={darkMode ? "text-gray-400" : "text-gray-500"} darkMode={darkMode} />
      <StatCard label={`당월 매출`} value={stats.mtdRevenue} color={darkMode ? "text-[#82B1FF]" : "text-blue-600"} darkMode={darkMode} />
      <StatCard label={`당월 정산`} value={stats.mtdSettlement} color={darkMode ? "text-indigo-300" : "text-indigo-600"} darkMode={darkMode} />
      <StatCard label={`당월 수익`} value={stats.mtdProfit} color={darkMode ? "text-[#B9F6CA]" : "text-emerald-600"} darkMode={darkMode} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
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

      <div className="apple-card p-6 md:p-8 flex flex-col justify-between border-t-4 border-indigo-500">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">MONTHLY PROGRESS</p>
          <h3 className="text-xl font-black">{stats.currentMonthName}월 성과 분석</h3>
          <p className="text-[10px] text-gray-500 font-bold">이번 달 실시간 누적치</p>
        </div>
        
        <div className="space-y-6 my-6">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-gray-500">누적 매출액</span>
            <span className="text-lg font-black">{stats.mtdRevenue.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-end pt-4 border-t border-white/5">
            <span className="text-xs font-bold text-gray-500">예상 순수익</span>
            <span className="text-xl font-black text-emerald-500">{Math.max(0, Math.round(stats.mtdProfit)).toLocaleString()}원</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AdvancedStats: React.FC<{ sales: SaleRecord[], expenses: ExpenseItem[], menuItems: MenuItem[], platforms: PlatformConfig[], memos: DailyMemo[], setSales: any, darkMode: boolean }> = ({ sales, expenses, menuItems, platforms, memos, setSales, darkMode }) => {
  const [timeUnit, setTimeUnit] = useState<'daily' | 'monthly'>('monthly');
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchMonth, setSearchMonth] = useState(new Date().toISOString().slice(0, 7));

  const getMName = (id: string) => menuItems.find(m => m.id === id)?.name || id;

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
      } else { 
        key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`; 
        label = `${d.getMonth()+1}월`; 
      }
      if (!map[key]) map[key] = { label, revenue: 0, settlement: 0, profit: 0 };
      map[key].revenue += s.totalPrice;
      map[key].settlement += s.settlementAmount;
    });

    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([_, v]) => {
      let fCost = timeUnit === 'daily' ? fixed/30 : fixed;
      return { ...v, profit: v.settlement - (v.revenue * vRate) - fCost };
    }).slice(-12);
  }, [sales, expenses, timeUnit]);

  const menuRanking = useMemo(() => {
    const map: Record<string, { name: string, qty: number, revenue: number }> = {};
    let targetSales = sales;

    if (timeUnit === 'daily') {
      targetSales = sales.filter(s => s.date.startsWith(searchDate));
    } else {
      targetSales = sales.filter(s => s.date.startsWith(searchMonth));
    }
    
    targetSales.forEach(s => {
      if (!map[s.menuId]) map[s.menuId] = { name: getMName(s.menuId), qty: 0, revenue: 0 };
      map[s.menuId].qty += s.quantity;
      map[s.menuId].revenue += s.totalPrice;
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [sales, searchDate, searchMonth, timeUnit, menuItems]);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <h2 className="text-3xl font-black">심층 분석</h2>
        <div className={`flex p-1.5 rounded-2xl ${darkMode ? 'bg-[#1C1C1E]' : 'bg-gray-200'}`}>
          {(['daily', 'monthly'] as const).map(u => (
            <button key={u} onClick={() => setTimeUnit(u)} className={`px-6 py-2 rounded-xl text-[11px] font-bold transition-all ${timeUnit === u ? 'bg-[#448AFF] text-white shadow-md' : 'text-gray-500'}`}>
              {u === 'daily' ? '일간' : '월간'}
            </button>
          ))}
        </div>
      </header>

      <div className="apple-card p-6 md:p-8 space-y-8 border-t-4 border-[#448AFF]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">분석 대상 기간</h3>
          <input 
            type={timeUnit === 'monthly' ? 'month' : 'date'} 
            value={timeUnit === 'monthly' ? searchMonth : searchDate} 
            onChange={e => timeUnit === 'monthly' ? setSearchMonth(e.target.value) : setSearchDate(e.target.value)}
            className={`text-sm font-black p-4 rounded-2xl border-none outline-none transition-all w-full md:w-auto text-center ${darkMode ? 'bg-[#2C2C2E] text-[#448AFF]' : 'bg-gray-100 text-[#448AFF]'}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="apple-card p-6 md:p-8">
          <h3 className="text-xs font-black mb-8 uppercase tracking-widest text-gray-500">성과 지표</h3>
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
          <h3 className="text-xs font-black mb-8 uppercase tracking-widest text-gray-500">메뉴별 점유율</h3>
          <div className="space-y-4 max-h-[256px] overflow-y-auto no-scrollbar">
            {menuRanking.length > 0 ? menuRanking.map((m, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-400 text-white' : darkMode ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold">{m.name}</span>
                    <span className="text-xs font-black">{m.revenue.toLocaleString()}원</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(m.revenue / (menuRanking[0]?.revenue || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            )) : <div className="py-10 text-center text-gray-500 text-xs font-bold">판매 데이터 없음</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string; darkMode: boolean }> = ({ label, value, color, darkMode }) => (
  <div className={`apple-card p-6 flex flex-col justify-between transition-all border-l-4 ${darkMode ? 'border-l-white/10' : 'border-l-black/5'}`}>
    <span className="text-gray-500 text-[10px] font-black uppercase tracking-tighter mb-1">{label}</span>
    <span className={`text-xl font-black ${color}`}>{Math.round(value).toLocaleString()}원</span>
  </div>
);

const SalesBulkInput: React.FC<{ sales: SaleRecord[], menuItems: MenuItem[], platforms: PlatformConfig[], memos: DailyMemo[], onFinalSubmit: (records: SaleRecord[]) => void, onSaveMemo: (date: string, content: string) => void, darkMode: boolean, storageKeys: any, stats: any }> = ({ sales, menuItems, platforms, memos, onFinalSubmit, onSaveMemo, darkMode, storageKeys, stats }) => {
  const [platform, setPlatform] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const excelInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Record<string, { qty: string, price: string }>>(() => {
    const saved = localStorage.getItem(storageKeys.TEMP_FORM);
    return saved ? JSON.parse(saved) : {};
  });
  
  const [tempQueue, setTempQueue] = useState<SaleRecord[]>(() => {
    const saved = localStorage.getItem(storageKeys.TEMP_QUEUE);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [memoContent, setMemoContent] = useState(() => localStorage.getItem(storageKeys.TEMP_MEMO) || '');
  const [isFinishing, setIsFinishing] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);

  useEffect(() => { localStorage.setItem(storageKeys.TEMP_FORM, JSON.stringify(formData)); }, [formData]);
  useEffect(() => { localStorage.setItem(storageKeys.TEMP_QUEUE, JSON.stringify(tempQueue)); }, [tempQueue]);
  useEffect(() => { localStorage.setItem(storageKeys.TEMP_MEMO, memoContent); }, [memoContent]);

  useEffect(() => {
    const existingMemo = memos.find(m => m.date === date);
    if (existingMemo) setMemoContent(existingMemo.content);
    else setMemoContent(localStorage.getItem(storageKeys.TEMP_MEMO) || '');
  }, [date, memos]);

  const getPName = (id: string) => platforms.find(p => p.id === id)?.name || id;
  const getMName = (id: string) => menuItems.find(m => m.id === id)?.name || id;

  const downloadExcelTemplate = () => {
    const headers = [['날짜', '플랫폼', '메뉴', '수량', '총금액']];
    const sampleData = [['2024-01-01', '배민', '닭강정', 2, 45000]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "양식");
    XLSX.writeFile(wb, "경희장부_양식.xlsx");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const newRecords: SaleRecord[] = [];
        data.forEach((row: any) => {
          const rowPlatform = platforms.find(p => p.name === String(row['플랫폼']));
          const rowMenu = menuItems.find(m => m.name === String(row['메뉴']));
          if (rowPlatform && rowMenu) {
            const price = Number(row['총금액']);
            const fee = price * ((rowPlatform.feePercent + rowPlatform.adjustmentPercent) / 100);
            newRecords.push({
              id: crypto.randomUUID(),
              date: new Date(row['날짜']).toISOString(),
              platformId: rowPlatform.id,
              menuId: rowMenu.id,
              quantity: Number(row['수량']),
              totalPrice: price,
              settlementAmount: price - fee,
              netProfit: price - fee,
            });
          }
        });
        setTempQueue(prev => [...prev, ...newRecords]);
        alert(`${newRecords.length}건 로드됨`);
      } catch (err) { alert('파일 오류'); }
    };
    reader.readAsBinaryString(file);
  };

  const addToQueue = () => {
    const targetPlatform = platforms.find(p => p.id === platform);
    if (!targetPlatform) return;
    const newRecords: SaleRecord[] = Object.entries(formData)
      .filter(([_, v]) => Number((v as any).qty) > 0)
      .map(([id, v]) => {
        const val = v as any;
        const price = Number(val.price) || 0;
        const fee = price * ((targetPlatform.feePercent + targetPlatform.adjustmentPercent) / 100);
        return {
          id: crypto.randomUUID(),
          date: new Date(date).toISOString(),
          platformId: platform,
          menuId: id,
          quantity: Number(val.qty),
          totalPrice: price,
          settlementAmount: price - fee,
          netProfit: price - fee,
        };
      });
    setTempQueue(prev => [...prev, ...newRecords]);
    setFormData({});
  };

  const submitFinal = () => {
    setIsFinishing(true);
    setTimeout(() => {
      onFinalSubmit(tempQueue);
      setTempQueue([]);
      setIsFinishing(false);
      alert('정산 마감 완료');
    }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black">판매 입력</h2>
        <div className="flex gap-2">
          <button onClick={downloadExcelTemplate} className="p-3 bg-white/5 rounded-2xl text-xs font-bold"><i className="fas fa-download"></i></button>
          <button onClick={() => excelInputRef.current?.click()} className="p-3 bg-[#448AFF]/10 text-[#448AFF] rounded-2xl text-xs font-bold"><i className="fas fa-file-excel"></i></button>
          <input type="file" ref={excelInputRef} onChange={handleExcelUpload} className="hidden" />
        </div>
      </div>

      <div className="apple-card p-6 border-t-4 border-[#448AFF] space-y-6">
        <div className="flex justify-between items-center">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className={`p-3 rounded-2xl outline-none font-bold ${darkMode ? 'bg-[#2C2C2E]' : 'bg-gray-100'}`} />
          <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[150px]">
            {platforms.map(p => (
              <button key={p.id} onClick={()=>setPlatform(p.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${platform === p.id ? 'bg-[#448AFF] text-white' : 'bg-white/5 text-gray-500'}`}>{p.name}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 no-scrollbar">
          {menuItems.map(m => (
            <div key={m.id} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-2xl ${darkMode ? 'bg-[#1C1C1E]' : 'bg-gray-50'}`}>
              <span className="col-span-4 text-xs font-bold">{m.name}</span>
              <input type="number" placeholder="수량" value={formData[m.id]?.qty||''} onChange={e=>setFormData({...formData,[m.id]:{...formData[m.id],qty:e.target.value}})} className="col-span-3 p-2 rounded-xl text-center text-xs font-bold bg-white/5" />
              <input type="number" placeholder="총액" value={formData[m.id]?.price||''} onChange={e=>setFormData({...formData,[m.id]:{...formData[m.id],price:e.target.value}})} className="col-span-5 p-2 rounded-xl text-right text-xs font-bold bg-white/5" />
            </div>
          ))}
        </div>
        <button onClick={addToQueue} className="w-full py-4 bg-white/5 rounded-3xl font-black text-sm">목록 추가</button>
      </div>

      {tempQueue.length > 0 && (
        <div className="apple-card p-6 border-t-4 border-emerald-500 space-y-4">
          <h3 className="text-sm font-black uppercase text-emerald-500">대기 목록 ({tempQueue.length})</h3>
          <div className="space-y-2">
            {tempQueue.map(r => (
              <div key={r.id} className="flex justify-between items-center p-3 bg-white/5 rounded-2xl text-xs font-bold">
                <span>{getMName(r.menuId)} ({getPName(r.platformId)})</span>
                <span>{r.totalPrice.toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <button onClick={submitFinal} className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black">{isFinishing ? '처리 중...' : '최종 정산 마감'}</button>
        </div>
      )}

      <div className="apple-card p-6 border-t-4 border-amber-400 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black">일일 메모</h3>
          <button onClick={()=>onSaveMemo(date, memoContent)} className="text-[10px] font-black text-amber-500">저장</button>
        </div>
        <textarea value={memoContent} onChange={e=>setMemoContent(e.target.value)} className="w-full h-24 p-4 bg-white/5 rounded-2xl outline-none resize-none text-sm" />
      </div>
    </div>
  );
};

const Settings: React.FC<{ version: string, menuItems: MenuItem[], setMenuItems: any, platforms: PlatformConfig[], setPlatforms: any, expenses: ExpenseItem[], setExpenses: any, internalBackups: InternalBackup[], onRestoreInternal: (b: InternalBackup) => void, onDeleteBackup: (id: string) => void, onMigration: () => void, darkMode: boolean, setDarkMode: any, onBackup: () => void, onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void, onResetAll: () => void }> = ({ version, menuItems, setMenuItems, platforms, setPlatforms, expenses, setExpenses, internalBackups, onRestoreInternal, onDeleteBackup, onMigration, darkMode, setDarkMode, onBackup, onRestore, onResetAll }) => {
  const [tab, setTab] = useState<'menu' | 'platform' | 'expense' | 'backup'>('menu');
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [v1, setV1] = useState('0');

  const save = () => {
    if (!name) return;
    if (tab === 'menu') setMenuItems([...menuItems, { id: crypto.randomUUID(), name, costPercent: 0 }]);
    else if (tab === 'platform') setPlatforms([...platforms, { id: crypto.randomUUID(), name, feePercent: Number(v1), adjustmentPercent: 0 }]);
    else if (tab === 'expense') setExpenses([...expenses, { id: crypto.randomUUID(), name, value: Number(v1), type: 'fixed' }]);
    setShow(false); setName('');
  };

  return (
    <div className="space-y-8 pb-20">
      <h2 className="text-3xl font-black">설정</h2>
      <div className={`flex p-1 rounded-2xl bg-white/5 overflow-x-auto no-scrollbar`}>
        {(['menu', 'platform', 'expense', 'backup'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest ${tab === t ? 'bg-[#448AFF] text-white shadow-lg' : 'text-gray-500'}`}>{t}</button>
        ))}
      </div>
      
      <div className="apple-card p-6 min-h-[400px]">
        {tab === 'backup' ? (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-blue-500/10 border-2 border-dashed border-blue-500/30 space-y-5">
               <div className="text-center space-y-1">
                 <h4 className="font-black text-blue-500">긴급 데이터 복구 도구</h4>
                 <p className="text-[10px] text-gray-500 font-bold leading-relaxed">업데이트 후 데이터가 안 보이신다면 아래 버튼을 누르세요.<br/>기기에 남은 모든 과거 기록을 샅샅이 찾아냅니다.</p>
               </div>
               <button onClick={onMigration} className="w-full py-5 bg-[#448AFF] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                 <i className="fas fa-search-plus mr-2"></i> 데이터 강제 복구 실행 (v1~v17 통합)
               </button>
            </div>

            <div className="space-y-3 pt-6 border-t border-white/5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">자동 백업 포인트 (현재 버전)</p>
              {internalBackups.length > 0 ? internalBackups.map(b => (
                <div key={b.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                  <span className="text-xs font-bold">{new Date(b.timestamp).toLocaleString()}</span>
                  <div className="flex gap-2">
                    <button onClick={() => onRestoreInternal(b)} className="text-[10px] font-bold text-blue-500">복구</button>
                    <button onClick={() => onDeleteBackup(b.id)} className="text-[10px] font-bold text-rose-500">삭제</button>
                  </div>
                </div>
              )) : <div className="py-10 text-center text-gray-500 text-xs font-bold">백업 지점이 없습니다.</div>}
            </div>
          </div>
        ) : show ? (
          <div className="space-y-6 max-w-sm mx-auto pt-10">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="명칭" className="w-full p-4 bg-white/5 rounded-2xl font-bold outline-none" />
            {(tab !== 'menu') && <input type="number" value={v1} onChange={e=>setV1(e.target.value)} placeholder="수치" className="w-full p-4 bg-white/5 rounded-2xl font-bold outline-none" />}
            <button onClick={save} className="w-full py-5 bg-[#448AFF] text-white rounded-2xl font-black">추가하기</button>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={()=>setShow(true)} className="w-full py-4 border-2 border-dashed border-gray-500/20 rounded-2xl font-bold text-gray-500 text-xs">+ 항목 추가</button>
            <div className="grid gap-2">
              {tab === 'menu' && menuItems.map(m => (
                <div key={m.id} className="flex justify-between p-4 bg-white/5 rounded-2xl text-sm font-bold">
                  <span>{m.name}</span>
                  <button onClick={()=>setMenuItems(menuItems.filter(i=>i.id!==m.id))} className="text-rose-500"><i className="fas fa-trash"></i></button>
                </div>
              ))}
              {tab === 'platform' && platforms.map(p => (
                <div key={p.id} className="flex justify-between p-4 bg-white/5 rounded-2xl text-sm font-bold">
                  <span>{p.name} ({p.feePercent}%)</span>
                  <button onClick={()=>setPlatforms(platforms.filter(i=>i.id!==p.id))} className="text-rose-500"><i className="fas fa-trash"></i></button>
                </div>
              ))}
              {tab === 'expense' && expenses.map(e => (
                <div key={e.id} className="flex justify-between p-4 bg-white/5 rounded-2xl text-sm font-bold">
                  <span>{e.name} ({e.value.toLocaleString()}원)</span>
                  <button onClick={()=>setExpenses(expenses.filter(i=>i.id!==e.id))} className="text-rose-500"><i className="fas fa-trash"></i></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <button onClick={()=>setDarkMode(!darkMode)} className="flex-1 py-4 bg-white/5 rounded-2xl text-xs font-bold">테마 전환</button>
          <button onClick={onBackup} className="flex-1 py-4 bg-white/5 rounded-2xl text-xs font-bold">파일 백업</button>
        </div>
        <div className="pt-6 border-t border-white/5 text-center space-y-4">
           <button onClick={onResetAll} className="text-[10px] font-black text-rose-500/40 uppercase tracking-widest">초기화</button>
           <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Current Engine Version: {version}</p>
        </div>
      </div>
    </div>
  );
};

export default App;
