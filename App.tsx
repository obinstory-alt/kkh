
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
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
    return savedTheme === 'dark';
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
      
      // 날짜 결정: 항목별 날짜가 있으면 그것을 쓰고, 없으면 선택된 날짜(dateOverride) 사용
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
    const data = {
      menu: menuItems,
      platforms: platforms,
      sales: sales,
      expenses: expenses,
      backupDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `사장님계산기_백업_${new Date().toISOString().split('T')[0]}.json`;
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
        if (confirm('기존 데이터가 삭제되고 백업된 데이터로 교체됩니다. 계속하시겠습니까?')) {
          if (data.menu) setMenuItems(data.menu);
          if (data.platforms) setPlatforms(data.platforms);
          if (data.sales) setSales(data.sales);
          if (data.expenses) setExpenses(data.expenses);
          alert('복구가 완료되었습니다!');
          window.location.reload();
        }
      } catch (err) {
        alert('올바르지 않은 백업 파일입니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 lg:pl-64 transition-colors duration-300 ${darkMode ? 'bg-[#1C1C1E] text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>
      <nav className={`fixed bottom-0 left-0 right-0 lg:top-0 lg:w-64 lg:h-full border-t lg:border-t-0 lg:border-r z-50 px-2 py-2 lg:p-4 flex lg:flex-col justify-around lg:justify-start gap-1 lg:gap-4 transition-colors duration-300 ${darkMode ? 'bg-[#2C2C2E]/90 border-gray-700' : 'bg-white/90 border-gray-200'} backdrop-blur-xl`}>
        <div className="hidden lg:block mb-10 mt-4 px-4">
          <h1 className="text-xl font-black tracking-tight text-blue-600">사장님 계산기</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Master Edition</p>
        </div>
        <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-chart-pie" label="홈" darkMode={darkMode} />
        <NavItem active={view === 'sales'} onClick={() => setView('sales')} icon="fa-plus-circle" label="판매입력" darkMode={darkMode} />
        <NavItem active={view === 'stats'} onClick={() => setView('stats'} icon="fa-magnifying-glass-chart" label="통계/조회" darkMode={darkMode} />
        <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon="fa-sliders" label="설정" darkMode={darkMode} />
      </nav>

      <main className="p-4 md:p-6 max-w-6xl mx-auto">
        {view === 'dashboard' && <Dashboard stats={statsSummary} sales={sales} setSales={setSales} menuItems={menuItems} platforms={platforms} darkMode={darkMode} />}
        {view === 'sales' && <SalesBulkInput menuItems={menuItems} platforms={platforms} onBulkAddSales={handleBulkAddSales} darkMode={darkMode} />}
        {view === 'stats' && <AdvancedStats sales={sales} expenses={expenses} menuItems={menuItems} platforms={platforms} setSales={setSales} darkMode={darkMode} />}
        {view === 'settings' && <Settings menuItems={menuItems} setMenuItems={setMenuItems} platforms={platforms} setPlatforms={setPlatforms} expenses={expenses} setExpenses={setExpenses} darkMode={darkMode} setDarkMode={setDarkMode} onBackup={handleBackup} onRestore={handleRestore} />}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string; darkMode: boolean }> = ({ active, onClick, icon, label, darkMode }) => (
  <button onClick={onClick} className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 px-2 py-2 lg:px-4 lg:py-4 rounded-xl lg:rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
    <i className={`fas ${icon} text-lg lg:text-xl`}></i>
    <span className="text-[10px] lg:text-sm font-black">{label}</span>
  </button>
);

const Dashboard: React.FC<{ stats: any, sales: SaleRecord[], setSales: any, menuItems: MenuItem[], platforms: PlatformConfig[], darkMode: boolean }> = ({ stats, sales, setSales, menuItems, platforms, darkMode }) => {
  const getPName = (id: string) => platforms.find(p => p.id === id)?.name || id;
  const getMName = (id: string) => menuItems.find(m => m.id === id)?.name || id;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header><h2 className="text-2xl font-black">비즈니스 리포트</h2><p className="text-xs text-gray-400 font-bold">{new Date().toLocaleDateString()} 기준</p></header>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="총 매출액" value={stats.totalRevenue} color="text-blue-500" darkMode={darkMode} />
        <StatCard label="정산 예정액" value={stats.totalSettlement} color="text-indigo-400" darkMode={darkMode} />
        <StatCard label="총 지출(고정+비율)" value={stats.totalCosts} color="text-rose-500" darkMode={darkMode} />
        <StatCard label="최종 순이익" value={stats.totalProfit} color="text-emerald-500" darkMode={darkMode} />
      </div>
      <div className={`apple-card p-6 ${darkMode ? 'bg-[#2C2C2E]' : ''}`}>
        <h3 className="text-sm font-black mb-6 uppercase tracking-widest text-gray-400">최근 7일 실적 추이</h3>
        <div className="h-48 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#3A3A3C" : "#f1f5f9"} />
              <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis hide />
              <Tooltip contentStyle={{backgroundColor: darkMode ? '#1C1C1E' : '#fff', borderRadius: '12px', border: 'none'}} formatter={(v: any) => [`${Math.round(v).toLocaleString()}원`, '']} />
              <Line type="monotone" dataKey="revenue" name="매출" stroke="#2563eb" strokeWidth={4} dot={false} />
              <Line type="monotone" dataKey="settlement" name="정산" stroke="#818cf8" strokeWidth={4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const AdvancedStats: React.FC<{ sales: SaleRecord[], expenses: ExpenseItem[], menuItems: MenuItem[], platforms: PlatformConfig[], setSales: any, darkMode: boolean }> = ({ sales, expenses, menuItems, platforms, setSales, darkMode }) => {
  const [timeUnit, setTimeUnit] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);

  const getPName = (id: string) => platforms.find(p => p.id === id)?.name || id;
  const getMName = (id: string) => menuItems.find(m => m.id === id)?.name || id;

  const filteredSales = useMemo(() => {
    return sales.filter(s => s.date.startsWith(searchDate));
  }, [sales, searchDate]);

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
    <div className="space-y-6 animate-in slide-in-from-bottom-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-black">비즈니스 심층 분석</h2>
        <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-xl">
          {(['daily', 'monthly', 'yearly'] as const).map(u => (
            <button key={u} onClick={() => setTimeUnit(u)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${timeUnit === u ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'}`}>
              {u === 'daily' ? '일간' : u === 'monthly' ? '월간' : '연간'}
            </button>
          ))}
        </div>
      </header>

      <div className={`apple-card p-6 space-y-4 ${darkMode ? 'bg-[#2C2C2E]' : ''}`}>
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">날짜별 이력 조회</h3>
          <input 
            type="date" 
            value={searchDate} 
            onChange={e => setSearchDate(e.target.value)}
            className={`text-xs font-black p-2 rounded-lg border-2 transition-all outline-none ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-orange-50 border-orange-400 text-orange-700 focus:border-orange-600 shadow-sm'
            }`}
          />
        </div>
        
        {filteredSales.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-[10px] font-black text-blue-500 uppercase mb-1">일 매출액</p>
                <p className="font-black text-blue-600 dark:text-blue-400">{searchSummary.revenue.toLocaleString()}원</p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">일 정산액</p>
                <p className="font-black text-emerald-600 dark:text-emerald-400">{searchSummary.settlement.toLocaleString()}원</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase border-b dark:border-gray-700">
                    <th className="py-2">플랫폼</th>
                    <th className="py-2">메뉴</th>
                    <th className="py-2 text-right">매출</th>
                    <th className="py-2 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredSales.map(s => (
                    <tr key={s.id} className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 font-bold text-blue-500">{getPName(s.platformId)}</td>
                      <td className="py-3 font-medium">{getMName(s.menuId)} x{s.quantity}</td>
                      <td className="py-3 font-black text-right">{s.totalPrice.toLocaleString()}원</td>
                      <td className="py-3 text-center">
                        <button onClick={() => setSales(sales.filter((i: any) => i.id !== s.id))} className="text-gray-300 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <i className="fas fa-search text-3xl text-gray-200 dark:text-gray-700 mb-3"></i>
            <p className="text-xs font-bold text-gray-400">선택하신 날짜에 입력된 매출 정보가 없습니다.</p>
          </div>
        )}
      </div>

      <div className={`apple-card p-6 ${darkMode ? 'bg-[#2C2C2E]' : ''}`}>
        <h3 className="text-sm font-black mb-6 uppercase tracking-widest text-gray-400">수익성 흐름 (매출 vs 순이익)</h3>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aggregated}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#3A3A3C" : "#f1f5f9"} />
              <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
              <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{borderRadius: '12px', border: 'none', backgroundColor: darkMode ? '#1C1C1E' : '#fff'}} formatter={(v: any) => `${Math.round(v).toLocaleString()}원`} />
              <Legend verticalAlign="top" height={36} formatter={(v) => <span className="text-[10px] font-bold text-gray-500">{v === 'revenue' ? '총 매출' : '순이익'}</span>} />
              <Bar dataKey="revenue" name="매출" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="profit" name="순이익" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string; darkMode: boolean }> = ({ label, value, color, darkMode }) => (
  <div className={`apple-card p-5 border-b-4 transition-colors ${darkMode ? 'bg-[#2C2C2E] border-b-gray-700' : 'border-b-gray-100'}`}>
    <span className="text-gray-400 text-[10px] font-black uppercase block mb-1 tracking-tighter">{label}</span>
    <span className={`text-lg font-black ${color}`}>{Math.round(value).toLocaleString()}원</span>
  </div>
);

const SalesBulkInput: React.FC<{ menuItems: MenuItem[], platforms: PlatformConfig[], onBulkAddSales: (p: string, s: any[], d?: string) => void, darkMode: boolean }> = ({ menuItems, platforms, onBulkAddSales, darkMode }) => {
  const [platform, setPlatform] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<Record<string, { qty: string, price: string }>>({});
  const [msg, setMsg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const list = (Object.entries(data) as [string, { qty: string, price: string }][])
      .filter(([_, v]) => Number(v.qty) > 0)
      .map(([id, v]) => ({ menuId: id, qty: Number(v.qty), price: Number(v.price) || 0 }));
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
      // 헤더 제외: 날짜, 플랫폼명, 메뉴명, 수량, 총가격
      const parsedData: Record<string, any[]> = {};

      lines.slice(1).forEach(line => {
        const [csvDate, csvPlatform, csvMenu, csvQty, csvPrice] = line.split(',').map(s => s?.trim());
        if (!csvPlatform || !csvMenu) return;

        const targetPlatform = platforms.find(p => p.name === csvPlatform);
        const targetMenu = menuItems.find(m => m.name === csvMenu);

        if (targetPlatform && targetMenu) {
          if (!parsedData[targetPlatform.id]) parsedData[targetPlatform.id] = [];
          parsedData[targetPlatform.id].push({
            date: csvDate,
            menuId: targetMenu.id,
            qty: Number(csvQty),
            price: Number(csvPrice)
          });
        }
      });

      let addedCount = 0;
      Object.entries(parsedData).forEach(([pId, list]) => {
        onBulkAddSales(pId, list);
        addedCount += list.length;
      });

      if (addedCount > 0) {
        alert(`${addedCount}건의 판매 실적이 성공적으로 등록되었습니다.`);
      } else {
        alert('매칭되는 플랫폼이나 메뉴를 찾지 못했습니다. 양식을 확인해주세요.');
      }
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
    link.setAttribute('download', '매출업로드_양식.csv');
    link.click();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in slide-in-from-bottom-8">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black">판매 실적 입력</h2>
        <div className="flex gap-2">
          <button onClick={downloadSampleCsv} className="text-[10px] font-black text-gray-400 hover:text-blue-500 transition-colors">양식 다운로드</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-black text-blue-600 hover:bg-blue-50 transition-all">
            <i className="fas fa-file-excel mr-1"></i> Excel/CSV 업로드
          </button>
          <input type="file" ref={fileInputRef} accept=".csv" onChange={handleCsvUpload} className="hidden" />
        </div>
      </div>
      
      <div className={`apple-card p-6 space-y-6 shadow-2xl ${darkMode ? 'bg-[#2C2C2E]' : ''}`}>
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">수동 입력</p>
          <input 
            type="date" 
            value={date} 
            onChange={e=>setDate(e.target.value)} 
            className={`text-xs font-black p-2 rounded-lg border-2 transition-all outline-none ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-blue-50 border-blue-600 text-blue-700 focus:border-orange-500 shadow-sm'
            }`} 
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {platforms.map(p => (
            <button key={p.id} onClick={()=>setPlatform(p.id)} className={`flex-none px-6 py-3 rounded-xl font-black text-xs border-2 transition-all ${platform === p.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400'}`}>{p.name}</button>
          ))}
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          <div className="grid grid-cols-12 gap-3 px-4 text-[10px] font-black text-gray-400 uppercase">
            <div className="col-span-4">메뉴</div>
            <div className="col-span-3 text-center">수량</div>
            <div className="col-span-5 text-right">총 결제액</div>
          </div>
          {menuItems.map(m => (
            <div key={m.id} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-2xl border ${darkMode?'bg-gray-800/50 border-transparent':'bg-gray-50 border-gray-100'}`}>
              <div className="col-span-4 text-xs font-black truncate">{m.name}</div>
              <input type="number" inputMode="numeric" placeholder="0" value={data[m.id]?.qty||''} onChange={e=>setData({...data,[m.id]:{...data[m.id],qty:e.target.value}})} className={`col-span-3 p-3 rounded-xl border-none font-black text-center text-sm ${darkMode?'bg-gray-900':'bg-white shadow-inner'}`} />
              <div className="col-span-5 relative">
                <input type="number" inputMode="numeric" placeholder="0" value={data[m.id]?.price||''} onChange={e=>setData({...data,[m.id]:{...data[m.id],price:e.target.value}})} className={`w-full p-3 rounded-xl border-none font-black text-right text-sm pr-6 ${darkMode?'bg-gray-900':'bg-white shadow-inner'}`} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₩</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={save} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-all">실적 저장 {msg && '✓'}</button>
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
    setEditId(item.id);
    setName(item.name);
    if (type === 'platform') {
      setV1(String(item.feePercent));
      setV2(String(item.adjustmentPercent));
    } else if (type === 'expense') {
      setV1(String(item.value));
      setType(item.type);
    }
    setShow(true);
  };

  const startNew = () => {
    setEditId(null);
    setName('');
    setV1('0');
    setV2('0');
    setType('fixed');
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
    <div className="space-y-6">
      <h2 className="text-2xl font-black">비즈니스 설정</h2>
      <div className="flex bg-gray-200 dark:bg-gray-800 p-1.5 rounded-2xl gap-1">
        {(['menu', 'platform', 'expense'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${tab === t ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}>{t==='menu'?'메뉴':t==='platform'?'플랫폼':'지출'}</button>
        ))}
      </div>
      <div className={`apple-card p-6 min-h-[300px] ${darkMode ? 'bg-[#2C2C2E]' : ''}`}>
        {show ? (
          <div className="space-y-6 max-w-sm mx-auto animate-in zoom-in-95">
            <h4 className="font-black text-lg">{editId ? '항목 수정' : '새 항목 추가'}</h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase px-1">항목 이름</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="이름" className={`w-full p-4 rounded-xl font-black ${darkMode?'bg-gray-800 text-white':'bg-gray-50 border-none text-gray-900'}`} />
              </div>
              {tab === 'platform' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase px-1">중개 수수료 (%)</label>
                    <input type="number" step="0.1" value={v1} onChange={e=>setV1(e.target.value)} className={`w-full p-4 rounded-xl font-black ${darkMode?'bg-gray-800 text-blue-400':'bg-gray-100 text-blue-600'}`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase px-1">카드/결제/조정 수수료 (%)</label>
                    <input type="number" step="0.1" value={v2} onChange={e=>setV2(e.target.value)} className={`w-full p-4 rounded-xl font-black ${darkMode?'bg-gray-800 text-rose-400':'bg-gray-100 text-rose-600'}`} />
                  </div>
                </div>
              )}
              {tab === 'expense' && (
                <div className="space-y-2">
                  <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
                    <button onClick={()=>setType('fixed')} className={`flex-1 py-2 rounded-lg text-[10px] font-black ${type==='fixed'?'bg-white dark:bg-gray-700 text-blue-600 shadow-sm':'text-gray-500'}`}>고정금(원)</button>
                    <button onClick={()=>setType('percent')} className={`flex-1 py-2 rounded-lg text-[10px] font-black ${type==='percent'?'bg-white dark:bg-gray-700 text-rose-500 shadow-sm':'text-gray-500'}`}>비율(%)</button>
                  </div>
                  <p className="text-[10px] text-gray-400 px-1 font-medium">
                    {type === 'percent' ? '* 월 전체 매출액 대비 설정하신 비율(%)로 지출을 계산합니다.' : '* 매달 고정적으로 발생하는 비용(임대료 등)을 입력하세요.'}
                  </p>
                  <input type="number" value={v1} onChange={e=>setV1(e.target.value)} className={`w-full p-4 rounded-xl font-black ${darkMode?'bg-gray-800 text-emerald-400':'bg-gray-50'}`} />
                </div>
              )}
            </div>
            <button onClick={save} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg">저장하기</button>
            <button onClick={()=>{setShow(false); setEditId(null); setName('');}} className="w-full py-3 text-gray-400 font-black text-xs">취소</button>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={startNew} className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400 font-black text-sm hover:border-blue-300 transition-all">+ 새 항목 추가</button>
            <div className="grid gap-2">
              {tab === 'menu' && menuItems.map(m => (
                <div key={m.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl group">
                  <span className="font-black text-sm">{m.name}</span>
                  <div className="flex gap-4">
                    <button onClick={()=>startEdit(m, 'menu')} className="text-gray-300 hover:text-blue-500 transition-colors"><i className="fas fa-edit"></i></button>
                    <button onClick={()=>setMenuItems(menuItems.filter(i=>i.id!==m.id))} className="text-gray-300 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))}
              {tab === 'platform' && platforms.map(p => (
                <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex justify-between items-center group">
                  <div>
                    <p className="font-black text-sm">{p.name}</p>
                    <p className="text-[9px] font-bold text-gray-400">수수료 {p.feePercent}% / 조정 {p.adjustmentPercent}%</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={()=>startEdit(p, 'platform')} className="text-gray-300 hover:text-blue-500 transition-colors"><i className="fas fa-edit"></i></button>
                    <button onClick={()=>setPlatforms(platforms.filter(i=>i.id!==p.id))} className="text-gray-300 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))}
              {tab === 'expense' && expenses.map(e => (
                <div key={e.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex justify-between items-center group">
                  <div>
                    <p className="font-black text-sm">{e.name}</p>
                    <p className="text-[9px] font-bold text-gray-400">{e.type==='fixed'?'월 고정비':'월 전체 매출 대비 비율(%)'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-sm">{e.value.toLocaleString()}{e.type==='fixed'?'원':'%'}</span>
                    <button onClick={()=>startEdit(e, 'expense')} className="text-gray-300 hover:text-blue-500 transition-colors"><i className="fas fa-edit"></i></button>
                    <button onClick={()=>setExpenses(expenses.filter(i=>i.id!==e.id))} className="text-gray-300 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`apple-card p-6 space-y-4 ${darkMode ? 'bg-[#2C2C2E]' : ''}`}>
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">데이터 관리</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBackup} className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl transition-all active:scale-95 group">
            <i className="fas fa-cloud-download-alt text-2xl text-blue-600 mb-2 group-hover:bounce"></i>
            <span className="text-[10px] font-black text-blue-600">백업 (저장)</span>
          </button>
          <label className="flex flex-col items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl transition-all active:scale-95 cursor-pointer group">
            <i className="fas fa-file-import text-2xl text-emerald-600 mb-2 group-hover:bounce"></i>
            <span className="text-[10px] font-black text-emerald-600">복원 (가져오기)</span>
            <input type="file" accept=".json" onChange={onRestore} className="hidden" />
          </label>
        </div>
      </div>

      <div className={`apple-card p-6 flex justify-between items-center ${darkMode ? 'bg-[#2C2C2E]' : ''}`}>
        <span className="font-black text-sm text-gray-400 uppercase tracking-widest">다크 모드</span>
        <button onClick={()=>setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full relative transition-all ${darkMode?'bg-blue-600':'bg-gray-300'}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode?'left-7':'left-1'}`}></div>
        </button>
      </div>
    </div>
  );
};

export default App;
