
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { MenuItem, PlatformConfig, SaleRecord, ExpenseItem } from './types';

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
    THEME: 'biz_total_v17_theme'
  };

  const [view, setView] = useState<'dashboard' | 'sales' | 'stats' | 'settings'>('dashboard');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('biz_total_v17_theme');
    return savedTheme !== 'light'; // 기본값을 다크모드로 설정
  });

  useEffect(() => {
    const savedMenu = localStorage.getItem(STORAGE_KEYS.MENU);
    const savedPlatforms = localStorage.getItem(STORAGE_KEYS.PLATFORMS);
    const savedSales = localStorage.getItem(STORAGE_KEYS.SALES);
    const savedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);

    setMenuItems(savedMenu ? JSON.parse(savedMenu) : INITIAL_MENU);
    setPlatforms(savedPlatforms ? JSON.parse(savedPlatforms) : DEFAULT_PLATFORMS);
    setSales(savedSales ? JSON.parse(savedSales) : []);
    setExpenses(savedExpenses ? JSON.parse(savedExpenses) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menuItems));
    localStorage.setItem(STORAGE_KEYS.PLATFORMS, JSON.stringify(platforms));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    localStorage.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [menuItems, platforms, sales, expenses, darkMode]);

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

  const handleBulkAddSales = (platformId: string, salesList: { menuId: string, qty: number, price: number, date?: string }[], dateOverride?: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return;

    const newRecords: SaleRecord[] = salesList.map(item => {
      const totalPrice = item.price;
      const totalFeePercent = (platform.feePercent || 0) + (platform.adjustmentPercent || 0);
      const commission = totalPrice * (totalFeePercent / 100);
      const settlementAmount = totalPrice - commission;
      const finalDateStr = item.date || dateOverride || new Date().toISOString().split('T')[0];
      const targetDate = new Date(finalDateStr);
      const now = new Date();
      targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      return {
        id: crypto.randomUUID(),
        date: targetDate.toISOString(),
        platformId,
        menuId: item.menuId,
        quantity: item.qty,
        totalPrice,
        settlementAmount,
        netProfit: settlementAmount,
      };
    });
    setSales(prev => [...newRecords, ...prev]);
  };

  const handleBackup = () => {
    const data = { menu: menuItems, platforms, sales, expenses, backupDate: new Date().toISOString() };
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
        {view === 'sales' && <SalesBulkInput menuItems={menuItems} platforms={platforms} onBulkAddSales={handleBulkAddSales} darkMode={darkMode} />}
        {view === 'stats' && <AdvancedStats sales={sales} expenses={expenses} menuItems={menuItems} platforms={platforms} setSales={setSales} darkMode={darkMode} />}
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

const AdvancedStats: React.FC<{ sales: SaleRecord[], expenses: ExpenseItem[], menuItems: MenuItem[], platforms: PlatformConfig[], setSales: any, darkMode: boolean }> = ({ sales, expenses, menuItems, platforms, setSales, darkMode }) => {
  const [timeUnit, setTimeUnit] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);

  const getPName = (id: string) => platforms.find(p => p.id === id)?.name || id;
  const getMName = (id: string) => menuItems.find(m => m.id === id)?.name || id;

  const filteredSales = useMemo(() => sales.filter(s => s.date.startsWith(searchDate)), [sales, searchDate]);
  const searchSummary = useMemo(() => {
    const revenue = filteredSales.reduce((acc, s) => acc + s.totalPrice, 0);
    const settlement = filteredSales.reduce((acc, s) => acc + s.settlementAmount, 0);
    return { revenue, settlement };
  }, [filteredSales]);

  const aggregated = useMemo(() => {
    const map: Record<string, { label: string, revenue: number, settlement: number, profit: number }> = {};
    const fixed = expenses.filter(e => e.type === 'fixed').reduce((acc, curr) => acc + curr.value, 0);
    const vRate = expenses.filter(e => e.type === 'percent').reduce((acc, curr) => acc + (curr.value / 100), 0);

    sales.forEach(s => {
      const d = new Date(s.date);
      let key = ''; let label = '';
      if (timeUnit === 'daily') { key = s.date.split('T')[0]; label = key.slice(5); }
      else if (timeUnit === 'monthly') { key = `${d.getFullYear()}-${d.getMonth()+1}`; label = `${d.getMonth()+1}월`; }
      else { key = `${d.getFullYear()}`; label = `${key}년`; }
      if (!map[key]) map[key] = { label, revenue: 0, settlement: 0, profit: 0 };
      map[key].revenue += s.totalPrice;
      map[key].settlement += s.settlementAmount;
    });

    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([_, v]) => {
      let fCost = timeUnit === 'daily' ? fixed/30 : timeUnit === 'monthly' ? fixed : fixed*12;
      return { ...v, profit: v.settlement - (v.revenue * vRate) - fCost };
    }).slice(timeUnit === 'daily' ? -14 : -6);
  }, [sales, expenses, timeUnit]);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <h2 className="text-3xl font-black">심층 분석</h2>
        <div className={`flex p-1.5 rounded-2xl ${darkMode ? 'bg-[#1C1C1E]' : 'bg-gray-200'}`}>
          {(['daily', 'monthly', 'yearly'] as const).map(u => (
            <button key={u} onClick={() => setTimeUnit(u)} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${timeUnit === u ? 'bg-[#448AFF] text-white shadow-md' : 'text-gray-500'}`}>
              {u === 'daily' ? '일간' : u === 'monthly' ? '월간' : '연간'}
            </button>
          ))}
        </div>
      </header>

      <div className="apple-card p-6 md:p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">날짜별 조회</h3>
          <input 
            type="date" 
            value={searchDate} 
            onChange={e => setSearchDate(e.target.value)}
            className={`text-sm font-bold p-3 rounded-2xl border-none outline-none transition-all ${darkMode ? 'bg-[#2C2C2E] text-white' : 'bg-gray-100 text-gray-900 focus:ring-2 ring-blue-500'}`}
          />
        </div>
        
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
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-500 uppercase border-b border-white/5">
                    <th className="py-3">플랫폼</th>
                    <th className="py-3">메뉴</th>
                    <th className="py-3 text-right">매출</th>
                    <th className="py-3 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSales.map(s => (
                    <tr key={s.id} className="group transition-colors hover:bg-white/5">
                      <td className="py-4 font-bold text-blue-400">{getPName(s.platformId)}</td>
                      <td className="py-4 font-medium text-sm">{getMName(s.menuId)} <span className="text-gray-500 ml-1">x{s.quantity}</span></td>
                      <td className="py-4 font-black text-right text-sm">{s.totalPrice.toLocaleString()}원</td>
                      <td className="py-4 text-center">
                        <button onClick={() => setSales(sales.filter((i: any) => i.id !== s.id))} className="text-gray-600 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center">
            <i className="fas fa-search text-5xl text-gray-800 mb-4"></i>
            <p className="text-sm font-bold text-gray-500">입력된 매출 정보가 없습니다.</p>
          </div>
        )}
      </div>

      <div className="apple-card p-6 md:p-8">
        <h3 className="text-xs font-black mb-8 uppercase tracking-widest text-gray-500">수익성 흐름</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aggregated} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
              <XAxis dataKey="label" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#8e8e93'}} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} contentStyle={{borderRadius: '16px', border: 'none', backgroundColor: darkMode ? '#2C2C2E' : '#fff'}} formatter={(v: any) => `${Math.round(v).toLocaleString()}원`} />
              <Legend verticalAlign="top" height={40} iconType="circle" />
              <Bar dataKey="revenue" name="총 매출" fill="#448AFF" radius={[6, 6, 0, 0]} barSize={16} />
              <Bar dataKey="profit" name="순이익" fill="#B9F6CA" radius={[6, 6, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
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

const SalesBulkInput: React.FC<{ menuItems: MenuItem[], platforms: PlatformConfig[], onBulkAddSales: (p: string, s: any[], d?: string) => void, darkMode: boolean }> = ({ menuItems, platforms, onBulkAddSales, darkMode }) => {
  const [platform, setPlatform] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<Record<string, { qty: string, price: string }>>({});
  const [msg, setMsg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const list = Object.entries(data).filter(([_, v]) => Number(v.qty) > 0).map(([id, v]) => ({ menuId: id, qty: Number(v.qty), price: Number(v.price) || 0 }));
    if (!platform || list.length === 0) return;
    onBulkAddSales(platform, list, date);
    setMsg(true); setTimeout(() => setMsg(false), 2000); setData({});
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const parsedData: Record<string, any[]> = {};
      lines.slice(1).forEach(line => {
        const parts = line.split(',').map(s => s?.trim());
        if (parts.length < 5) return;
        const [csvDate, csvPlatform, csvMenu, csvQty, csvPrice] = parts;
        const targetPlatform = platforms.find(p => p.name === csvPlatform);
        const targetMenu = menuItems.find(m => m.name === csvMenu);
        if (targetPlatform && targetMenu) {
          if (!parsedData[targetPlatform.id]) parsedData[targetPlatform.id] = [];
          parsedData[targetPlatform.id].push({ date: csvDate, menuId: targetMenu.id, qty: Number(csvQty), price: Number(csvPrice) });
        }
      });
      let addedCount = 0;
      Object.entries(parsedData).forEach(([pId, list]) => { onBulkAddSales(pId, list); addedCount += list.length; });
      if (addedCount > 0) alert(`${addedCount}건의 판매 실적이 등록되었습니다.`);
      else alert('매칭되는 정보가 없습니다. 파일 양식을 확인해주세요.');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSampleCsv = () => {
    const header = "날짜,플랫폼명,메뉴명,수량,총결제액\n";
    const sample = `${new Date().toISOString().split('T')[0]},${platforms[0]?.name || '배민'},${menuItems[0]?.name || '메뉴명'},1,15000`;
    const blob = new Blob(["\uFEFF" + header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '경희장부_양식.csv';
    link.click();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black">판매 실적 입력</h2>
        <div className="flex gap-2">
          <button onClick={downloadSampleCsv} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all">양식</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-[#448AFF] hover:bg-blue-600 rounded-xl text-xs font-bold text-white shadow-lg transition-all">업로드</button>
          <input type="file" ref={fileInputRef} accept=".csv" onChange={handleCsvUpload} className="hidden" />
        </div>
      </div>
      
      <div className="apple-card p-6 md:p-8 space-y-8">
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">날짜 선택</p>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className={`text-sm font-bold p-3 rounded-2xl outline-none border-none ${darkMode ? 'bg-[#2C2C2E]' : 'bg-gray-100'}`} />
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {platforms.map(p => (
            <button key={p.id} onClick={()=>setPlatform(p.id)} className={`flex-none px-6 py-3 rounded-2xl font-black text-xs transition-all duration-300 ${platform === p.id ? 'bg-[#448AFF] text-white shadow-lg active-tab-glow' : darkMode ? 'bg-[#2C2C2E] text-gray-500' : 'bg-gray-100 text-gray-400'}`}>{p.name}</button>
          ))}
        </div>

        <div className="space-y-4 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
          {menuItems.map(m => (
            <div key={m.id} className={`grid grid-cols-12 gap-3 items-center p-4 rounded-3xl transition-all ${darkMode ? 'bg-[#2C2C2E]/50 hover:bg-[#2C2C2E]' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <div className="col-span-4 text-sm font-bold truncate">{m.name}</div>
              <input type="number" inputMode="numeric" placeholder="0" value={data[m.id]?.qty||''} onChange={e=>setData({...data,[m.id]:{...data[m.id],qty:e.target.value}})} className={`col-span-3 p-3 rounded-2xl border-none font-black text-center text-sm ${darkMode ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`} />
              <div className="col-span-5 relative">
                <input type="number" inputMode="numeric" placeholder="0" value={data[m.id]?.price||''} onChange={e=>setData({...data,[m.id]:{...data[m.id],price:e.target.value}})} className={`w-full p-3 rounded-2xl border-none font-black text-right text-sm pr-7 ${darkMode ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm'}`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">₩</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={save} className="w-full py-5 bg-[#448AFF] hover:bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-500/20 active:scale-95 transition-all">실적 저장 {msg && '✓'}</button>
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
