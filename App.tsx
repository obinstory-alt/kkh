
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

const COLORS = ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2', '#64D2FF', '#FF375F'];

const App: React.FC = () => {
  const CURRENT_VERSION = 'v19.5';
  const STORAGE_PREFIX = 'biz_total_stable_';
  const STORAGE_KEYS = {
    MENU: `${STORAGE_PREFIX}menu`,
    PLATFORMS: `${STORAGE_PREFIX}platforms`,
    SALES: `${STORAGE_PREFIX}sales`,
    THEME: `${STORAGE_PREFIX}theme`,
    BACKUPS: `${STORAGE_PREFIX}internal_backups`,
    APP_VERSION: `${STORAGE_PREFIX}app_version`
  };

  const [view, setView] = useState<'dashboard' | 'sales' | 'stats' | 'settings'>('dashboard');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [internalBackups, setInternalBackups] = useState<InternalBackup[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // 자동 버전 체크 및 강제 새로고침 로직
  useEffect(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.APP_VERSION);
    if (savedVersion !== CURRENT_VERSION) {
      console.log(`Version mismatch: ${savedVersion} -> ${CURRENT_VERSION}. Force reloading...`);
      localStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
      // 최초 1회 강제 새로고침 (쿼리스트링 추가)
      if (!window.location.search.includes('updated=true')) {
        window.location.href = window.location.pathname + '?v=' + new Date().getTime() + '&updated=true';
      }
    }
  }, []);

  useEffect(() => {
    const migrateAndLoad = () => {
      let allSales: SaleRecord[] = [];
      let lastMenu = INITIAL_MENU;
      let lastPlat = DEFAULT_PLATFORMS;

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
    alert('✅ 오늘 정산이 안전하게 저장되었습니다!');
    setView('dashboard');
  };

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 lg:pl-64 transition-colors duration-500 ${darkMode ? 'bg-[#09090B] text-[#F2F2F7]' : 'bg-[#F4F4F7] text-[#1D1D1F]'}`}>
      <nav className={`fixed bottom-0 left-0 right-0 lg:top-0 lg:w-64 lg:h-full border-t lg:border-t-0 lg:border-r z-50 px-2 py-2 lg:p-6 flex lg:flex-col justify-around lg:justify-start gap-1 lg:gap-6 ${darkMode ? 'bg-[#121214]/90 border-white/5' : 'bg-white/90 border-black/5'} backdrop-blur-2xl`}>
        <div className="hidden lg:block mb-8 px-2">
          <h1 className="text-2xl font-black bg-gradient-to-br from-blue-400 to-indigo-600 bg-clip-text text-transparent italic tracking-tighter">경희장부</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{CURRENT_VERSION} STABLE</span>
          </div>
        </div>
        <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-house" label="홈" />
        <NavItem active={view === 'sales'} onClick={() => setView('sales')} icon="fa-circle-plus" label="판매입력" />
        <NavItem active={view === 'stats'} onClick={() => setView('stats')} icon="fa-chart-pie" label="정밀분석" />
        <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon="fa-sliders" label="관리" />
      </nav>

      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        {view === 'dashboard' && <Dashboard stats={dashboardStats} darkMode={darkMode} version={CURRENT_VERSION} />}
        {view === 'sales' && <SalesInputV17 menuItems={menuItems} platforms={platforms} onFinalSubmit={handleFinalSubmit} />}
        {view === 'stats' && <StatsContainer sales={sales} menuItems={menuItems} platforms={platforms} darkMode={darkMode} />}
        {view === 'settings' && (
          <Settings 
            internalBackups={internalBackups} 
            onRestore={(b) => { const p = JSON.parse(b.data); if(p.sales) setSales(p.sales); alert('복원되었습니다.'); }} 
            darkMode={darkMode} setDarkMode={setDarkMode}
            onReset={() => { if(confirm('⚠️ 모든 데이터를 영구 삭제할까요?')) { localStorage.clear(); window.location.reload(); } }}
            version={CURRENT_VERSION}
          />
        )}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 px-3 py-3 lg:px-6 lg:py-4 rounded-[20px] transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-xl active-tab-glow scale-[1.02]' : 'text-gray-400 hover:bg-white/5'}`}>
    <i className={`fas ${icon} text-lg`}></i>
    <span className="text-[10px] lg:text-sm font-bold tracking-tight">{label}</span>
  </button>
);

const Dashboard: React.FC<{ stats: any, darkMode: boolean, version: string }> = ({ stats, darkMode, version }) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-1000">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-black tracking-tight">비즈니스 대시보드</h2>
      <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black">{version} NEW</span>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label={`${stats.lastMonthName}월 매출`} value={stats.lastMonthRevenue} color="text-gray-500" />
      <StatCard label={`${stats.curMonthName}월 현재`} value={stats.mtdRevenue} color="text-blue-500" />
      <StatCard label="정산 예정액" value={stats.mtdSettlement} color="text-indigo-500" />
      <StatCard label="추정 순이익" value={stats.mtdRevenue * 0.3} color="text-emerald-500" />
    </div>
    <div className="apple-card p-10 flex flex-col items-center justify-center text-center gap-4 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent">
      <div className="w-16 h-16 bg-blue-500/20 rounded-[22px] flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-500">
        <i className="fas fa-rocket text-2xl text-blue-500"></i>
      </div>
      <div>
        <h3 className="text-xl font-black tracking-tight">v19.5 업데이트 반영됨</h3>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">캐시 방지 로직이 강화되었습니다.<br/>이제 수정한 내용이 즉시 반영됩니다.</p>
      </div>
    </div>
  </div>
);

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="apple-card p-6 border-b-4 border-b-transparent hover:border-b-blue-500/50 transition-all duration-500">
    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">{label}</p>
    <p className={`text-xl font-black ${color} tracking-tighter`}>{Math.round(value).toLocaleString()}원</p>
  </div>
);

const SalesInputV17: React.FC<{ menuItems: MenuItem[], platforms: PlatformConfig[], onFinalSubmit: (r: SaleRecord[]) => void }> = ({ menuItems, platforms, onFinalSubmit }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [platform, setPlatform] = useState('');
  const [formData, setFormData] = useState<Record<string, { qty: string, price: string }>>({});
  const [tempQueue, setTempQueue] = useState<SaleRecord[]>([]);

  const addToQueue = () => {
    const plat = platforms.find(p => p.id === platform);
    if (!plat) return alert('플랫폼을 먼저 선택해 주세요!');
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
    if (newRecords.length === 0) return alert('판매 수량과 금액을 입력해 주세요.');
    setTempQueue([...tempQueue, ...newRecords]);
    setFormData({});
  };

  const downloadTemplate = () => {
    const wsData = [['날짜(YYYY-MM-DD)', '플랫폼ID(baemin/coupang/yogiyo/naver/store)', '메뉴명', '수량', '판매총액']];
    menuItems.forEach(m => wsData.push([new Date().toISOString().split('T')[0], 'baemin', m.name, '1', '15000']));
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesTemplate");
    XLSX.writeFile(wb, "경희장부_입력양식_v19.5.xlsx");
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
        alert(`🎉 ${newRecords.length}건을 성공적으로 불러왔습니다!`);
      } catch (err) { alert('❌ 엑셀 형식이 올바르지 않습니다.'); }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20 animate-in slide-in-from-bottom-10 duration-700">
      <div className="apple-card p-8 border-t-8 border-blue-600 shadow-2xl space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black tracking-tighter">판매 내역 입력</h2>
          <div className="flex gap-2">
            <button onClick={downloadTemplate} className="text-[10px] font-black px-4 py-2 bg-gray-500/10 rounded-xl hover:bg-gray-500/20 transition-all uppercase tracking-widest">Template</button>
            <label className="text-[10px] font-black px-4 py-2 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 transition-all uppercase tracking-widest">
              Excel Upload
              <input type="file" hidden accept=".xlsx, .xls" onChange={handleExcelUpload} />
            </label>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase ml-1">Date</p>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl font-bold border border-white/5 focus:border-blue-500/50 outline-none" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase ml-1">Platform</p>
            <select value={platform} onChange={e=>setPlatform(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl font-bold border border-white/5 focus:border-blue-500/50 outline-none appearance-none">
              <option value="">플랫폼 선택</option>
              {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-3">
          {menuItems.map(m => (
            <div key={m.id} className="grid grid-cols-12 gap-3 items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
              <span className="col-span-4 text-xs font-bold text-gray-400">{m.name}</span>
              <input type="number" placeholder="수량" value={formData[m.id]?.qty || ''} onChange={e=>setFormData({...formData, [m.id]: {...(formData[m.id]||{qty:'',price:''}), qty: e.target.value}})} className="col-span-3 p-3 bg-black/20 rounded-xl text-center text-xs font-black outline-none border border-white/5 focus:border-blue-500/50" />
              <input type="number" placeholder="총금액" value={formData[m.id]?.price || ''} onChange={e=>setFormData({...formData, [m.id]: {...(formData[m.id]||{qty:'',price:''}), price: e.target.value}})} className="col-span-5 p-3 bg-black/20 rounded-xl text-right text-xs font-black outline-none border border-white/5 focus:border-blue-500/50" />
            </div>
          ))}
        </div>
        <button onClick={addToQueue} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[22px] font-black shadow-xl active:scale-95 transition-all text-sm">
          임시저장 목록에 추가
        </button>
      </div>

      {tempQueue.length > 0 && (
        <div className="apple-card p-8 border-t-8 border-emerald-500 space-y-6 animate-in zoom-in-95 duration-500 shadow-2xl">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-black tracking-tight">대기 중인 정산 건 ({tempQueue.length})</h2>
            <button onClick={()=>setTempQueue([])} className="text-[10px] text-rose-500 font-bold uppercase tracking-widest hover:underline">Clear All</button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
            {tempQueue.map((q, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-[18px] border border-white/5 group">
                <div className="flex gap-3 items-center">
                  <span className="px-2 py-1 bg-blue-500 text-[9px] text-white rounded-md font-black uppercase tracking-tighter">{platforms.find(p=>p.id===q.platformId)?.name}</span>
                  <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{menuItems.find(m=>m.id===q.menuId)?.name}</span>
                </div>
                <span className="text-sm font-black text-blue-400">{q.totalPrice.toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-white/10 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Settlement</span>
            <span className="text-3xl font-black text-white">{tempQueue.reduce((acc,q)=>acc+q.totalPrice, 0).toLocaleString()}원</span>
          </div>
          <button onClick={() => onFinalSubmit(tempQueue)} className="w-full py-6 bg-emerald-500 text-white rounded-[24px] font-black text-xl shadow-2xl active:scale-95 transition-all">
            오늘 정산 최종 마감
          </button>
        </div>
      )}
    </div>
  );
};

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

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black tracking-tighter">정밀 분석 리포트</h2>
        <div className="flex gap-2">
           <button className="p-3 bg-white/5 rounded-2xl text-[10px] font-bold border border-white/5 uppercase tracking-widest hover:bg-white/10 transition-colors">Excel Report</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-2 p-1.5 bg-white/5 rounded-[22px] border border-white/5 shadow-inner">
          {(['time', 'menu', 'platform'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 rounded-[16px] text-[11px] font-black transition-all duration-300 ${tab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
              {t === 'time' ? '트렌드' : t === 'menu' ? '메뉴순위' : '점유율'}
            </button>
          ))}
        </div>
        {tab === 'time' && (
          <div className="flex gap-2 p-1.5 bg-white/5 rounded-[22px] border border-white/5">
            {(['day', 'month', 'year'] as const).map(u => (
              <button key={u} onClick={()=>setTimeUnit(u)} className={`px-5 py-3 rounded-[16px] text-[10px] font-black transition-all ${timeUnit === u ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500'}`}>
                {u === 'day' ? '일별' : u === 'month' ? '월별' : '연별'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="apple-card p-8 h-[450px] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
           <i className="fas fa-chart-line text-blue-500/20 text-7xl -rotate-12"></i>
        </div>
        {tab === 'time' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.time}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0A84FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} />
              <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} dy={15} stroke="#8E8E93" />
              <YAxis fontSize={10} tickLine={false} axisLine={false} dx={-10} stroke="#8E8E93" />
              <Tooltip contentStyle={{borderRadius:'24px', border:'none', backgroundColor: darkMode?'#1C1C1E':'#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', fontSize: '12px', fontWeight: 'bold'}} />
              <Area type="monotone" dataKey="revenue" name="매출" stroke="#0A84FF" strokeWidth={5} fillOpacity={1} fill="url(#colorRevenue)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {(tab === 'menu' || tab === 'platform') && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tab === 'menu' ? stats.menu : stats.plat} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} fontSize={11} tickLine={false} axisLine={false} stroke="#8E8E93" />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{borderRadius:'24px', border:'none', backgroundColor: darkMode?'#1C1C1E':'#fff'}} />
              <Bar dataKey="value" name="누적액" radius={[0, 20, 20, 0]} animationDuration={1500}>
                {(tab === 'menu' ? stats.menu : stats.plat).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="apple-card p-8 space-y-6">
          <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">Top Performance</h3>
          <div className="space-y-4">
            {(tab === 'menu' ? stats.menu : stats.plat).sort((a,b)=>b.value-a.value).slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-[12px] text-xs font-black ${idx === 0 ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 group-hover:bg-white/10 transition-all'}`}>{idx+1}</span>
                  <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{item.name}</span>
                </div>
                <span className="text-sm font-black text-gray-200">{item.value.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </div>
        <div className="apple-card p-8 flex flex-col items-center justify-center text-center gap-4">
          <div className="p-4 bg-emerald-500/10 rounded-full">
            <i className="fas fa-check-double text-emerald-500 text-2xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Trend Analysis</p>
            <div className="text-3xl font-black text-white tracking-tighter">
              {stats.time.length > 1 ? (stats.time[stats.time.length-1].revenue > stats.time[stats.time.length-2].revenue ? '매출 성장 중 📈' : '안정세 유지 중 📊') : '데이터 분석 중'}
            </div>
            <p className="text-xs text-gray-500 font-bold mt-4 leading-relaxed">최근 데이터를 바탕으로<br/>영업 흐름이 분석되고 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC<{ internalBackups: InternalBackup[], onRestore: (b: InternalBackup) => void, darkMode: boolean, setDarkMode: any, onReset: () => void, version: string }> = ({ internalBackups, onRestore, darkMode, setDarkMode, onReset, version }) => {
  const handleForceUpdate = () => {
    if (confirm('캐시를 무시하고 v19.5 최신 엔진으로 즉시 업데이트할까요?')) {
      window.location.href = window.location.pathname + '?v=' + new Date().getTime();
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black tracking-tighter">시스템 설정</h2>
        <button onClick={()=>setDarkMode(!darkMode)} className="p-4 bg-white/5 rounded-2xl text-xs font-bold border border-white/5 hover:bg-white/10 transition-all">
          {darkMode ? '🌙 다크 모드' : '☀️ 라이트 모드'}
        </button>
      </div>

      <div className="apple-card p-8 border-t-8 border-indigo-600 bg-indigo-600/5 space-y-6">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
              <i className="fas fa-arrows-rotate text-indigo-500"></i>
           </div>
           <div>
              <h3 className="text-lg font-black tracking-tight">버전 최신화 엔진</h3>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Active Version: {version}</p>
           </div>
        </div>
        <button onClick={handleForceUpdate} className="w-full py-5 bg-indigo-600 text-white rounded-[22px] font-black text-sm shadow-xl active:scale-95 transition-all">
          <i className="fas fa-bolt mr-2"></i>강제 업데이트 수행 (캐시 제거)
        </button>
        <p className="text-[10px] text-gray-500 leading-relaxed italic text-center">수정한 화면이 보이지 않을 때 이 버튼을 누르시면 캐시를 강제로 비우고 새로 불러옵니다.</p>
      </div>

      <div className="apple-card p-8 space-y-6">
        <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest">타임머신 백업</h3>
        <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
          {internalBackups.length > 0 ? internalBackups.map(b => (
            <div key={b.id} className="flex justify-between items-center p-5 bg-white/5 rounded-[20px] border border-white/5 hover:border-blue-500/40 transition-all">
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-bold text-gray-500">{new Date(b.timestamp).toLocaleDateString()}</span>
                 <span className="text-xs font-black text-gray-200">{new Date(b.timestamp).toLocaleTimeString()}</span>
              </div>
              <button onClick={() => onRestore(b)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black shadow-lg hover:scale-105 transition-all">복구</button>
            </div>
          )) : <div className="py-12 text-center text-gray-600 text-xs font-bold italic tracking-widest">NO BACKUPS AVAILABLE</div>}
        </div>
      </div>
      
      <div className="pt-10">
        <button onClick={onReset} className="w-full py-4 text-[10px] font-black text-rose-500/20 uppercase tracking-[0.4em] hover:text-rose-500 transition-colors underline decoration-dotted">Factory Reset</button>
      </div>
    </div>
  );
};

export default App;
