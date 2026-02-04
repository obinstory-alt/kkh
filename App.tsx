
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend, AreaChart, Area 
} from 'recharts';
import * as XLSX from 'xlsx';
import { MenuItem, PlatformConfig, SaleRecord, ExpenseItem, DailyMemo } from './types';

const DEFAULT_PLATFORMS: PlatformConfig[] = [
  { id: 'baemin', name: '배민', feePercent: 6.8, adjustmentPercent: 0 },
  { id: 'coupang', name: '쿠팡', feePercent: 9.8, adjustmentPercent: 0 },
  { id: 'yogiyo', name: '요기요', feePercent: 12.5, adjustmentPercent: 0 },
  { id: 'naver', name: '네이버', feePercent: 3.5, adjustmentPercent: 0 },
  { id: 'store', name: '매장(현장)', feePercent: 1.5, adjustmentPercent: 0 },
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

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55'];

const App: React.FC = () => {
  const CURRENT_VERSION = 'v19.3';
  const STORAGE_PREFIX = 'biz_total_stable_';
  const STORAGE_KEYS = {
    MENU: `${STORAGE_PREFIX}menu`,
    PLATFORMS: `${STORAGE_PREFIX}platforms`,
    SALES: `${STORAGE_PREFIX}sales`,
    THEME: `${STORAGE_PREFIX}theme`,
    BACKUPS: `${STORAGE_PREFIX}internal_backups`
  };

  const [view, setView] = useState<'dashboard' | 'sales' | 'stats' | 'settings'>('dashboard');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [internalBackups, setInternalBackups] = useState<InternalBackup[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const migrateAndLoad = () => {
      let allSales: SaleRecord[] = [];
      let lastMenu = INITIAL_MENU;
      let lastPlat = DEFAULT_PLATFORMS;

      // 이전 모든 버전 데이터 통합
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('biz_total_') || key.startsWith(STORAGE_PREFIX))) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            if (key.endsWith('_sales')) allSales = [...allSales, ...(Array.isArray(data) ? data : [])];
            else if (key.endsWith('_menu')) lastMenu = Array.isArray(data) && data.length > 0 ? data : lastMenu;
            else if (key.endsWith('_platforms')) lastPlat = Array.isArray(data) && data.length > 0 ? data : lastPlat;
          } catch (e) {}
        }
      }

      setSales(Array.from(new Map(allSales.map(s => [s.id, s])).values()));
      setMenuItems(lastMenu);
      setPlatforms(lastPlat);
      
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      setDarkMode(savedTheme !== 'light');
      const savedBackups = localStorage.getItem(STORAGE_KEYS.BACKUPS);
      if (savedBackups) setInternalBackups(JSON.parse(savedBackups));
    };
    migrateAndLoad();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menuItems));
    localStorage.setItem(STORAGE_KEYS.PLATFORMS, JSON.stringify(platforms));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(internalBackups));
    localStorage.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', darkMode);
  }, [menuItems, platforms, sales, internalBackups, darkMode]);

  const dashboardStats = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const mtdSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    });
    const lastMonthDate = new Date(curYear, curMonth - 1, 1);
    const lmdSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    });

    return {
      mtdRevenue: mtdSales.reduce((acc, s) => acc + s.totalPrice, 0),
      lastMonthRevenue: lmdSales.reduce((acc, s) => acc + s.totalPrice, 0),
      mtdSettlement: mtdSales.reduce((acc, s) => acc + s.settlementAmount, 0),
      curMonthName: curMonth + 1,
      lastMonthName: lastMonthDate.getMonth() + 1
    };
  }, [sales]);

  const handleFinalSubmit = (newRecords: SaleRecord[]) => {
    const updated = [...newRecords, ...sales];
    setSales(updated);
    const backup = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), data: JSON.stringify({ sales: updated, menu: menuItems }) };
    setInternalBackups(prev => [backup, ...prev].slice(0, 15));
    alert('오늘의 모든 정산이 안전하게 기록되었습니다!');
    setView('dashboard');
  };

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 lg:pl-64 transition-colors duration-500 ${darkMode ? 'bg-black text-[#F2F2F7]' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}>
      <nav className={`fixed bottom-0 left-0 right-0 lg:top-0 lg:w-64 lg:h-full border-t lg:border-t-0 lg:border-r z-50 px-2 py-2 lg:p-6 flex lg:flex-col justify-around lg:justify-start gap-1 lg:gap-6 ${darkMode ? 'bg-[#1C1C1E]/80 border-white/5' : 'bg-white/80 border-black/5'} backdrop-blur-xl`}>
        <div className="hidden lg:block mb-10 px-2">
          <h1 className="text-2xl font-black bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent italic">경희장부</h1>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1 uppercase">PREMIUM {CURRENT_VERSION}</p>
        </div>
        <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-house-chimney" label="홈" />
        <NavItem active={view === 'sales'} onClick={() => setView('sales')} icon="fa-plus-circle" label="판매입력" />
        <NavItem active={view === 'stats'} onClick={() => setView('stats')} icon="fa-chart-column" label="정밀통계" />
        <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon="fa-gear" label="설정" />
      </nav>

      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        {view === 'dashboard' && <Dashboard stats={dashboardStats} darkMode={darkMode} />}
        {view === 'sales' && <SalesInputV17 menuItems={menuItems} platforms={platforms} onFinalSubmit={handleFinalSubmit} />}
        {view === 'stats' && <StatsContainer sales={sales} menuItems={menuItems} platforms={platforms} darkMode={darkMode} />}
        {view === 'settings' && (
          <Settings 
            internalBackups={internalBackups} 
            onRestore={(b) => { const p = JSON.parse(b.data); if(p.sales) setSales(p.sales); alert('복원되었습니다.'); }} 
            darkMode={darkMode} setDarkMode={setDarkMode}
            onReset={() => { if(confirm('모든 데이터를 초기화할까요?')) { localStorage.clear(); window.location.reload(); } }}
          />
        )}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 px-3 py-3 lg:px-5 lg:py-4 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg scale-105 active-tab-glow' : 'text-gray-400 hover:bg-white/5'}`}>
    <i className={`fas ${icon} text-lg`}></i>
    <span className="text-[10px] lg:text-sm font-bold">{label}</span>
  </button>
);

const Dashboard: React.FC<{ stats: any, darkMode: boolean }> = ({ stats, darkMode }) => (
  <div className="space-y-6 animate-in fade-in duration-700">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label={`${stats.lastMonthName}월 전월 매출`} value={stats.lastMonthRevenue} color="text-gray-500" />
      <StatCard label={`${stats.curMonthName}월 당월 매출`} value={stats.mtdRevenue} color="text-blue-500" />
      <StatCard label="실시간 정산액" value={stats.mtdSettlement} color="text-indigo-500" />
      <StatCard label="순이익 추정(30%)" value={stats.mtdRevenue * 0.3} color="text-emerald-500" />
    </div>
    <div className="apple-card p-10 flex flex-col items-center justify-center text-center gap-4 bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/10">
      <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
        <i className="fas fa-chart-line text-2xl text-blue-500"></i>
      </div>
      <div>
        <h3 className="text-xl font-black">심층 분석이 새로워졌습니다</h3>
        <p className="text-sm text-gray-500 mt-1">이제 연간, 월간, 일별 매출 추이를<br/>정밀하게 비교할 수 있습니다.</p>
      </div>
    </div>
  </div>
);

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="apple-card p-5 border-l-4 border-l-blue-500/30">
    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-tight">{label}</p>
    <p className={`text-xl font-black ${color}`}>{Math.round(value).toLocaleString()}원</p>
  </div>
);

// --- 2단계 판매 입력 (엑셀 기능 강화) ---
const SalesInputV17: React.FC<{ menuItems: MenuItem[], platforms: PlatformConfig[], onFinalSubmit: (r: SaleRecord[]) => void }> = ({ menuItems, platforms, onFinalSubmit }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [platform, setPlatform] = useState('');
  const [formData, setFormData] = useState<Record<string, { qty: string, price: string }>>({});
  const [tempQueue, setTempQueue] = useState<SaleRecord[]>([]);

  const addToQueue = () => {
    const plat = platforms.find(p => p.id === platform);
    if (!plat) return alert('플랫폼을 선택하세요.');
    const newRecords: SaleRecord[] = [];
    Object.entries(formData).forEach(([menuId, data]) => {
      const q = Number(data.qty);
      const p = Number(data.price);
      if (q > 0 && p > 0) {
        const fee = p * (plat.feePercent / 100);
        newRecords.push({
          id: crypto.randomUUID(), date: new Date(date).toISOString(), platformId: platform, menuId,
          quantity: q, totalPrice: p, settlementAmount: p - fee, netProfit: p - fee
        });
      }
    });
    if (newRecords.length === 0) return alert('수량/금액을 입력하세요.');
    setTempQueue([...tempQueue, ...newRecords]);
    setFormData({});
  };

  const downloadTemplate = () => {
    const wsData = [['날짜(YYYY-MM-DD)', '플랫폼ID(baemin/coupang/yogiyo/naver/store)', '메뉴명', '수량', '판매총액']];
    menuItems.forEach(m => wsData.push([new Date().toISOString().split('T')[0], 'baemin', m.name, '1', '15000']));
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesTemplate");
    XLSX.writeFile(wb, "경희장부_입력양식.xlsx");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
        const newRecords: SaleRecord[] = data.map(row => {
          const plat = platforms.find(p => p.id === String(row['플랫폼ID(baemin/coupang/yogiyo/naver/store)']));
          const menu = menuItems.find(m => m.name === row['메뉴명']);
          if (!plat || !menu) return null;
          const p = Number(row['판매총액']);
          const fee = p * (plat.feePercent / 100);
          return {
            id: crypto.randomUUID(), date: new Date(row['날짜(YYYY-MM-DD)']).toISOString(),
            platformId: plat.id, menuId: menu.id, quantity: Number(row['수량']),
            totalPrice: p, settlementAmount: p - fee, netProfit: p - fee
          };
        }).filter(Boolean) as SaleRecord[];
        setTempQueue([...tempQueue, ...newRecords]);
        alert(`${newRecords.length}건이 대기 목록에 로드되었습니다.`);
      } catch (err) { alert('파일 형식이 잘못되었습니다.'); }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20 animate-in slide-in-from-bottom-10 duration-500">
      <div className="apple-card p-6 border-t-4 border-blue-600 shadow-2xl space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-blue-500">플랫폼별 임시저장</h2>
          <div className="flex gap-2">
            <button onClick={downloadTemplate} className="text-[10px] font-bold px-3 py-2 bg-gray-500/10 rounded-xl hover:bg-gray-500/20 transition-colors">양식다운</button>
            <label className="text-[10px] font-bold px-3 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl cursor-pointer hover:bg-emerald-500/20 transition-colors">
              엑셀업로드
              <input type="file" hidden accept=".xlsx, .xls" onChange={handleExcelUpload} />
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="flex-1 p-4 bg-white/5 rounded-2xl font-bold outline-none border border-white/5 focus:border-blue-500/50" />
          <select value={platform} onChange={e=>setPlatform(e.target.value)} className="flex-1 p-4 bg-white/5 rounded-2xl font-bold outline-none border border-white/5 focus:border-blue-500/50">
            <option value="">플랫폼 선택</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {menuItems.map(m => (
            <div key={m.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-white/5 rounded-2xl border border-white/5">
              <span className="col-span-4 text-xs font-bold text-gray-400">{m.name}</span>
              <input type="number" placeholder="수량" value={formData[m.id]?.qty || ''} onChange={e=>setFormData({...formData, [m.id]: {...(formData[m.id]||{qty:'',price:''}), qty: e.target.value}})} className="col-span-3 p-2 bg-white/10 rounded-xl text-center text-xs font-bold outline-none" />
              <input type="number" placeholder="총금액" value={formData[m.id]?.price || ''} onChange={e=>setFormData({...formData, [m.id]: {...(formData[m.id]||{qty:'',price:''}), price: e.target.value}})} className="col-span-5 p-2 bg-white/10 rounded-xl text-right text-xs font-bold outline-none" />
            </div>
          ))}
        </div>
        <button onClick={addToQueue} className="w-full py-4 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-2xl font-black transition-all">
          대기 목록에 추가 (임시저장)
        </button>
      </div>

      {tempQueue.length > 0 && (
        <div className="apple-card p-6 border-t-4 border-emerald-500 space-y-6 animate-in zoom-in-95 duration-300">
          <h2 className="text-xl font-black">오늘 정산 마감 전 목록 ({tempQueue.length}건)</h2>
          <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
            {tempQueue.map((q, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl text-[10px]">
                <div className="flex gap-2 items-center">
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded-md font-bold uppercase">{platforms.find(p=>p.id===q.platformId)?.name}</span>
                  <span className="font-bold text-gray-400">{menuItems.find(m=>m.id===q.menuId)?.name}</span>
                </div>
                <span className="font-black text-gray-200">{q.totalPrice.toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="font-bold text-gray-500">정산 마감 합계</span>
            <span className="text-2xl font-black text-blue-500">{tempQueue.reduce((acc,q)=>acc+q.totalPrice, 0).toLocaleString()}원</span>
          </div>
          <button onClick={() => onFinalSubmit(tempQueue)} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xl shadow-2xl active:scale-95 transition-all">
            오늘 정산 마감하기
          </button>
          <button onClick={()=>setTempQueue([])} className="w-full text-[10px] text-gray-600 font-bold uppercase tracking-widest hover:text-gray-400 transition-colors">데이터 모두 비우기</button>
        </div>
      )}
    </div>
  );
};

// --- 다차원 심층 분석 (일/월/연별 통계) ---
const StatsContainer: React.FC<{ sales: SaleRecord[], menuItems: MenuItem[], platforms: PlatformConfig[], darkMode: boolean }> = ({ sales, menuItems, platforms, darkMode }) => {
  const [tab, setTab] = useState<'time' | 'menu' | 'platform'>('time');
  const [timeUnit, setTimeUnit] = useState<'day' | 'month' | 'year'>('day');

  const stats = useMemo(() => {
    const menuMap: Record<string, number> = {};
    const platMap: Record<string, number> = {};
    const timeMap: Record<string, number> = {};

    sales.forEach(s => {
      menuMap[s.menuId] = (menuMap[s.menuId] || 0) + s.totalPrice;
      platMap[s.platformId] = (platMap[s.platformId] || 0) + s.totalPrice;
      
      const d = new Date(s.date);
      let k = '';
      if (timeUnit === 'day') k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      else if (timeUnit === 'month') k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      else k = `${d.getFullYear()}년`;
      
      timeMap[k] = (timeMap[k] || 0) + s.totalPrice;
    });

    return {
      menu: Object.entries(menuMap).map(([id, val]) => ({ name: menuItems.find(m=>m.id===id)?.name || '기타', value: val })),
      plat: Object.entries(platMap).map(([id, val]) => ({ name: platforms.find(p=>p.id===id)?.name || id, value: val })),
      time: Object.entries(timeMap).sort().map(([k, v]) => ({ date: k, revenue: v }))
    };
  }, [sales, menuItems, platforms, timeUnit]);

  const exportStatsToExcel = () => {
    const wb = XLSX.utils.book_new();
    const timeHeaders = timeUnit === 'day' ? "날짜" : timeUnit === 'month' ? "연월" : "연도";
    const timeSheet = XLSX.utils.json_to_sheet(stats.time.map(t => ({ [timeHeaders]: t.date, "매출총액": t.revenue })));
    const menuSheet = XLSX.utils.json_to_sheet(stats.menu.map(m => ({ "메뉴명": m.name, "누적매출": m.value })));
    const platSheet = XLSX.utils.json_to_sheet(stats.plat.map(p => ({ "플랫폼": p.name, "누적매출": p.value })));
    
    XLSX.utils.book_append_sheet(wb, timeSheet, `${timeUnit}별_추이`);
    XLSX.utils.book_append_sheet(wb, menuSheet, "메뉴별_누적");
    XLSX.utils.book_append_sheet(wb, platSheet, "플랫폼별_누적");
    XLSX.writeFile(wb, `경희장부_통계보고서_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">정밀 심층 분석</h2>
        <button onClick={exportStatsToExcel} className="px-5 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-xl hover:scale-105 transition-transform active:scale-95">
          <i className="fas fa-file-export mr-2"></i>보고서 엑셀 저장
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
          {(['time', 'menu', 'platform'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
              {t === 'time' ? '기간별 추이' : t === 'menu' ? '메뉴별 순위' : '플랫폼 비중'}
            </button>
          ))}
        </div>
        {tab === 'time' && (
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
            {(['day', 'month', 'year'] as const).map(u => (
              <button key={u} onClick={()=>setTimeUnit(u)} className={`px-4 py-3 rounded-xl text-[10px] font-black transition-all ${timeUnit === u ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}>
                {u === 'day' ? '일별' : u === 'month' ? '월별' : '연별'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="apple-card p-6 h-[400px] border border-white/5">
        {tab === 'time' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.time}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
              <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip contentStyle={{borderRadius:'20px', border:'none', backgroundColor: darkMode?'#2C2C2E':'#fff', fontSize: '12px', fontWeight: 'bold'}} />
              <Area type="monotone" dataKey="revenue" name="매출" stroke="#007AFF" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {(tab === 'menu' || tab === 'platform') && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tab === 'menu' ? stats.menu : stats.plat} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:'20px', border:'none', backgroundColor: darkMode?'#2C2C2E':'#fff'}} />
              <Bar dataKey="value" name="매출액" radius={[0, 15, 15, 0]}>
                {(tab === 'menu' ? stats.menu : stats.plat).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="apple-card p-8 space-y-6">
          <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">실적 순위 데이터</h3>
          <div className="space-y-4">
            {(tab === 'menu' ? stats.menu : stats.plat).sort((a,b)=>b.value-a.value).slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${idx === 0 ? 'bg-amber-400 text-black' : 'bg-gray-500/10 text-gray-400'}`}>{idx+1}</span>
                  <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{item.name}</span>
                </div>
                <span className="text-sm font-black text-gray-200">{item.value.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </div>
        <div className="apple-card p-8 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">분석 리포트</p>
          <div className="text-3xl font-black text-emerald-500">
            {stats.time.length > 1 ? (stats.time[stats.time.length-1].revenue > stats.time[stats.time.length-2].revenue ? '매출 상승세 📈' : '매출 보합세 📊') : '데이터 누적 중'}
          </div>
          <p className="text-xs text-gray-500 font-bold mt-2">이전 기간 대비 흐름을 추적하고 있습니다.</p>
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC<{ internalBackups: InternalBackup[], onRestore: (b: InternalBackup) => void, darkMode: boolean, setDarkMode: any, onReset: () => void }> = ({ internalBackups, onRestore, darkMode, setDarkMode, onReset }) => (
  <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black italic">설정 / 타임머신</h2>
      <button onClick={()=>setDarkMode(!darkMode)} className="p-4 bg-white/5 rounded-2xl text-xs font-bold border border-white/10 hover:bg-white/10 transition-colors">
        {darkMode ? '🌙 다크 모드 ON' : '☀️ 라이트 모드 ON'}
      </button>
    </div>
    <div className="apple-card p-6 space-y-6">
      <h3 className="text-sm font-black text-blue-500">자동 타임머신 복구</h3>
      <p className="text-[11px] text-gray-500 leading-relaxed font-bold">판매 입력을 마감할 때마다 저장되는 기록입니다. 실수로 삭제하거나 데이터가 꼬였을 때 해당 시점으로 돌아갈 수 있습니다.</p>
      <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
        {internalBackups.length > 0 ? internalBackups.map(b => (
          <div key={b.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors">
            <span className="text-[10px] font-bold text-gray-400">{new Date(b.timestamp).toLocaleString()}</span>
            <button onClick={() => onRestore(b)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all">복구</button>
          </div>
        )) : <div className="py-16 text-center text-gray-600 text-xs font-bold">생성된 백업이 없습니다.</div>}
      </div>
    </div>
    <div className="pt-10 flex flex-col gap-4">
      <button onClick={onReset} className="w-full py-4 text-[10px] font-black text-rose-500/30 uppercase tracking-[0.3em] hover:text-rose-500 transition-colors">전체 데이터 영구 삭제</button>
    </div>
  </div>
);

export default App;
