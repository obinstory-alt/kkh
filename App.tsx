
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
  data: string;
}

const App: React.FC = () => {
  const CURRENT_VERSION = 'v18.1'; // 버전 상향으로 캐시 갱신 유도
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
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
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
    const lastMonthSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
    });
    const dailyDataMap: Record<string, { date: string, revenue: number, settlement: number }> = {};
    sales.forEach(s => {
      const d = new Date(s.date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      if (!dailyDataMap[dateStr]) dailyDataMap[dateStr] = { date: dateStr, revenue: 0, settlement: 0 };
      dailyDataMap[dateStr].revenue += s.totalPrice;
      dailyDataMap[dateStr].settlement += s.settlementAmount;
    });
    return { 
      trendData: Object.keys(dailyDataMap).slice(-7).map(k => dailyDataMap[k]), 
      mtdRevenue, mtdSettlement, mtdProfit,
      lastMonthRevenue: lastMonthSales.reduce((acc, curr) => acc + curr.totalPrice, 0),
      currentMonthName: currentMonth + 1,
      lastMonthName: lastMonthDate.getMonth() + 1
    };
  }, [sales, expenses]);

  const handleMigration = () => {
    let foundSales: SaleRecord[] = [];
    let foundMemos: DailyMemo[] = [];
    let foundMenu: MenuItem[] = [];
    let foundPlat: PlatformConfig[] = [];
    let foundExp: ExpenseItem[] = [];
    let totalFoundCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('biz_total_') && !key.includes(CURRENT_VERSION)) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (key.endsWith('_sales')) foundSales = [...foundSales, ...parsed];
          else if (key.endsWith('_memos')) foundMemos = [...foundMemos, ...parsed];
          else if (key.endsWith('_menu')) foundMenu = parsed;
          else if (key.endsWith('_platforms')) foundPlat = parsed;
          else if (key.endsWith('_expenses')) foundExp = parsed;
          totalFoundCount++;
        } catch (e) {}
      }
    }

    if (totalFoundCount > 0) {
      if (confirm(`휴대폰 저장소에서 ${totalFoundCount}개의 과거 데이터 항목을 발견했습니다!\n사라졌던 판매 내역과 설정을 현재 버전으로 모두 가져오시겠습니까?`)) {
        const uniqueSales = Array.from(new Map([...sales, ...foundSales].map(i => [i.id, i])).values());
        const uniqueMemos = Array.from(new Map([...memos, ...foundMemos].map(i => [i.date, i])).values());
        setSales(uniqueSales);
        setMemos(uniqueMemos);
        if (foundMenu.length > 0) setMenuItems(foundMenu);
        if (foundPlat.length > 0) setPlatforms(foundPlat);
        if (foundExp.length > 0) setExpenses(foundExp);
        alert('복구가 완료되었습니다! 모든 탭을 확인해보세요.');
      }
    } else {
      alert('과거 데이터 흔적을 찾지 못했습니다. 이미 초기화되었거나 다른 브라우저를 사용 중이신지 확인해주세요.');
    }
  };

  const handleResetAll = () => {
    if (confirm('모든 데이터가 삭제됩니다. 정말 초기화하시겠습니까?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleForceReload = () => {
    if (confirm('브라우저의 캐시를 무시하고 최신 엔진을 다시 불러옵니다. 계속하시겠습니까?')) {
      window.location.href = window.location.pathname + '?v=' + Date.now();
    }
  };

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 lg:pl-64 transition-all duration-500 ${darkMode ? 'bg-black text-[#F2F2F7]' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}>
      <nav className={`fixed bottom-0 left-0 right-0 lg:top-0 lg:w-64 lg:h-full border-t lg:border-t-0 lg:border-r z-50 px-2 py-2 lg:p-6 flex lg:flex-col justify-around lg:justify-start gap-1 lg:gap-6 transition-all duration-300 ${darkMode ? 'bg-[#1C1C1E]/80 border-white/5' : 'bg-white/80 border-black/5'} backdrop-blur-3xl`}>
        <div className="hidden lg:block mb-10 px-2">
          <h1 className="text-2xl font-black bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent">경희장부</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Version {CURRENT_VERSION}</p>
        </div>
        <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-chart-pie" label="홈" darkMode={darkMode} />
        <NavItem active={view === 'sales'} onClick={() => setView('sales')} icon="fa-plus-circle" label="판매입력" darkMode={darkMode} />
        <NavItem active={view === 'stats'} onClick={() => setView('stats')} icon="fa-magnifying-glass-chart" label="심층분석" darkMode={darkMode} />
        <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon="fa-sliders" label="설정" darkMode={darkMode} />
      </nav>

      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        {view === 'dashboard' && <Dashboard stats={statsSummary} darkMode={darkMode} />}
        {view === 'sales' && <SalesBulkInput sales={sales} menuItems={menuItems} platforms={platforms} memos={memos} onFinalSubmit={(r) => {setSales([...r, ...sales]); alert('마감 완료');}} onSaveMemo={(d, c) => setMemos([...memos.filter(m=>m.date!==d), {date:d, content:c}])} darkMode={darkMode} storageKeys={STORAGE_KEYS} stats={statsSummary} />}
        {view === 'stats' && <AdvancedStats sales={sales} expenses={expenses} menuItems={menuItems} platforms={platforms} darkMode={darkMode} />}
        {view === 'settings' && (
          <Settings 
            version={CURRENT_VERSION}
            menuItems={menuItems} setMenuItems={setMenuItems} 
            platforms={platforms} setPlatforms={setPlatforms} 
            expenses={expenses} setExpenses={setExpenses} 
            onMigration={handleMigration}
            darkMode={darkMode} setDarkMode={setDarkMode} 
            onResetAll={handleResetAll}
            onForceReload={handleForceReload}
          />
        )}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string; darkMode: boolean }> = ({ active, onClick, icon, label, darkMode }) => (
  <button onClick={onClick} className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 px-3 py-3 lg:px-5 lg:py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-[#448AFF] text-white shadow-lg' : darkMode ? 'text-gray-500 hover:bg-white/5' : 'text-gray-400 hover:bg-black/5'}`}>
    <i className={`fas ${icon} text-lg`}></i>
    <span className="text-[10px] lg:text-sm font-bold">{label}</span>
  </button>
);

const Dashboard: React.FC<{ stats: any, darkMode: boolean }> = ({ stats, darkMode }) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="전월 매출" value={stats.lastMonthRevenue} color="text-gray-500" darkMode={darkMode} />
      <StatCard label="당월 매출" value={stats.mtdRevenue} color="text-blue-500" darkMode={darkMode} />
      <StatCard label="당월 정산" value={stats.mtdSettlement} color="text-indigo-500" darkMode={darkMode} />
      <StatCard label="예상 수익" value={stats.mtdProfit} color="text-emerald-500" darkMode={darkMode} />
    </div>
    <div className="apple-card p-6 h-64">
      <h3 className="text-xs font-black text-gray-500 uppercase mb-4">최근 실적 흐름</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={stats.trendData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
          <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{borderRadius: '16px', border: 'none', backgroundColor: darkMode ? '#2C2C2E' : '#fff'}} />
          <Line type="monotone" dataKey="revenue" stroke="#448AFF" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const StatCard: React.FC<{ label: string; value: number; color: string; darkMode: boolean }> = ({ label, value, color, darkMode }) => (
  <div className={`apple-card p-6 border-l-4 ${darkMode ? 'border-l-white/10' : 'border-l-black/5'}`}>
    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{label}</p>
    <p className={`text-xl font-black ${color}`}>{Math.round(value).toLocaleString()}원</p>
  </div>
);

const SalesBulkInput: React.FC<{ sales: SaleRecord[], menuItems: MenuItem[], platforms: PlatformConfig[], memos: DailyMemo[], onFinalSubmit: (records: SaleRecord[]) => void, onSaveMemo: (date: string, content: string) => void, darkMode: boolean, storageKeys: any, stats: any }> = ({ menuItems, platforms, onFinalSubmit, darkMode, stats }) => {
  const [platform, setPlatform] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState<Record<string, { qty: string, price: string }>>({});
  
  const addToQueue = () => {
    const targetPlatform = platforms.find(p => p.id === platform);
    if (!targetPlatform) return;
    const newRecords: SaleRecord[] = Object.entries(formData)
      .filter(([_, v]) => Number(v.qty) > 0)
      .map(([id, v]) => {
        const p = Number(v.price) || 0;
        const f = p * ((targetPlatform.feePercent + targetPlatform.adjustmentPercent) / 100);
        return {
          id: crypto.randomUUID(),
          date: new Date(date).toISOString(),
          platformId: platform,
          menuId: id,
          quantity: Number(v.qty),
          totalPrice: p,
          settlementAmount: p - f,
          netProfit: p - f,
        };
      });
    onFinalSubmit(newRecords);
    setFormData({});
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-3xl font-black">판매 입력</h2>
      <div className="apple-card p-6 space-y-6 border-t-4 border-blue-500">
        <div className="flex justify-between items-center">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="p-3 bg-white/5 rounded-2xl font-bold outline-none" />
          <select value={platform} onChange={e=>setPlatform(e.target.value)} className="p-3 bg-white/5 rounded-2xl font-bold outline-none">
            <option value="">플랫폼 선택</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
          {menuItems.map(m => (
            <div key={m.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-white/5 rounded-2xl">
              <span className="col-span-4 text-xs font-bold">{m.name}</span>
              <input type="number" placeholder="개수" value={formData[m.id]?.qty||''} onChange={e=>setFormData({...formData, [m.id]: {...formData[m.id], qty: e.target.value}})} className="col-span-3 p-2 bg-white/5 rounded-xl text-center text-xs" />
              <input type="number" placeholder="총액" value={formData[m.id]?.price||''} onChange={e=>setFormData({...formData, [m.id]: {...formData[m.id], price: e.target.value}})} className="col-span-5 p-2 bg-white/5 rounded-xl text-right text-xs" />
            </div>
          ))}
        </div>
        <button onClick={addToQueue} className="w-full py-4 bg-blue-500 text-white rounded-3xl font-black">정산 추가</button>
      </div>
    </div>
  );
};

const AdvancedStats: React.FC<{ sales: SaleRecord[], expenses: ExpenseItem[], menuItems: MenuItem[], platforms: PlatformConfig[], darkMode: boolean }> = ({ sales, menuItems, darkMode }) => (
  <div className="space-y-6">
    <h2 className="text-3xl font-black">심층 분석</h2>
    <div className="apple-card p-6 min-h-[300px] flex items-center justify-center text-gray-500 text-xs font-bold uppercase tracking-widest">
      {sales.length > 0 ? "분석 엔진 가동 중..." : "판매 데이터를 먼저 입력해주세요"}
    </div>
  </div>
);

const Settings: React.FC<{ version: string, menuItems: MenuItem[], setMenuItems: any, platforms: PlatformConfig[], setPlatforms: any, expenses: ExpenseItem[], setExpenses: any, onMigration: () => void, darkMode: boolean, setDarkMode: any, onResetAll: () => void, onForceReload: () => void }> = ({ version, menuItems, setMenuItems, platforms, setPlatforms, onMigration, darkMode, setDarkMode, onResetAll, onForceReload }) => {
  const [tab, setTab] = useState<'menu' | 'platform' | 'backup'>('menu');
  return (
    <div className="space-y-8 pb-20">
      <h2 className="text-3xl font-black">설정</h2>
      <div className="flex p-1 bg-white/5 rounded-2xl">
        {(['menu', 'platform', 'backup'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest ${tab === t ? 'bg-[#448AFF] text-white' : 'text-gray-500'}`}>{t}</button>
        ))}
      </div>
      <div className="apple-card p-6 min-h-[400px]">
        {tab === 'backup' ? (
          <div className="space-y-8">
            <div className="p-6 rounded-3xl bg-blue-500/10 border-2 border-dashed border-blue-500/30 text-center space-y-4">
               <h4 className="font-black text-blue-500">데이터 심폐소생술 (긴급 복구)</h4>
               <p className="text-[10px] text-gray-500 font-bold leading-relaxed">업데이트 후 판매내역이나 설정이 사라졌나요?<br/>과거 버전의 모든 흔적을 찾아 현재로 가져옵니다.</p>
               <button onClick={onMigration} className="w-full py-5 bg-[#448AFF] text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">
                 <i className="fas fa-search-plus mr-2"></i> 데이터 강제 복구 실행 (v1~v17 통합)
               </button>
            </div>
            <div className="space-y-4 pt-10 border-t border-white/5">
               <p className="text-[10px] font-black text-gray-400 uppercase text-center">도움말 및 진단</p>
               <button onClick={onForceReload} className="w-full py-4 bg-white/5 rounded-2xl text-xs font-bold text-gray-400">화면이 안 바뀐다면? (최신 엔진 강제 로드)</button>
               <button onClick={onResetAll} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-xs font-bold">전체 데이터 초기화</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 text-center font-bold">항목 관리 탭입니다.</p>
            <div className="grid gap-2">
               {(tab === 'menu' ? menuItems : platforms).map((item: any) => (
                 <div key={item.id} className="p-4 bg-white/5 rounded-2xl flex justify-between font-bold text-sm">
                   <span>{item.name}</span>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
      <div className="text-center space-y-2 opacity-30">
        <p className="text-[9px] font-black uppercase tracking-widest">Engine Version {version}</p>
        <button onClick={()=>setDarkMode(!darkMode)} className="text-[9px] font-black border-b border-current">THEME TOGGLE</button>
      </div>
    </div>
  );
};

export default App;
