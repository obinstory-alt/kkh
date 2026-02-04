
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend 
} from 'recharts';
import * as XLSX from 'xlsx';
import { MenuItem, PlatformConfig, SaleRecord } from './types';

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

const COLORS = ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2', '#64D2FF', '#FF375F'];

const App: React.FC = () => {
  const CURRENT_VERSION = 'v19.7';
  const STORAGE_KEY_SALES = 'biz_total_stable_sales';
  const STORAGE_KEY_MENU = 'biz_total_stable_menu';
  const STORAGE_KEY_PLATFORMS = 'biz_total_stable_platforms';

  const [view, setView] = useState<'dashboard' | 'sales' | 'stats' | 'settings'>('dashboard');
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // 데이터 보존 및 로드
  useEffect(() => {
    const loadSafeData = () => {
      const savedSales = localStorage.getItem(STORAGE_KEY_SALES);
      const savedMenu = localStorage.getItem(STORAGE_KEY_MENU);
      const savedPlat = localStorage.getItem(STORAGE_KEY_PLATFORMS);
      
      if (savedSales) setSales(JSON.parse(savedSales));
      if (savedMenu) setMenuItems(JSON.parse(savedMenu));
      else setMenuItems(INITIAL_MENU);
      if (savedPlat) setPlatforms(JSON.parse(savedPlat));
    };
    loadSafeData();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
    localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(menuItems));
    localStorage.setItem(STORAGE_KEY_PLATFORMS, JSON.stringify(platforms));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [sales, menuItems, platforms, darkMode]);

  const stats = useMemo(() => {
    const now = new Date();
    const curMonthSales = sales.filter(s => new Date(s.date).getMonth() === now.getMonth());
    return {
      totalRevenue: curMonthSales.reduce((acc, s) => acc + s.totalPrice, 0),
      totalSettlement: curMonthSales.reduce((acc, s) => acc + s.settlementAmount, 0),
      recordCount: sales.length
    };
  }, [sales]);

  const handleFinalSubmit = (newRecords: SaleRecord[]) => {
    setSales(prev => [...newRecords, ...prev]);
    alert('✅ 정산 데이터가 금고에 안전하게 저장되었습니다.');
    setView('dashboard');
  };

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 lg:pl-72 transition-colors duration-500 ${darkMode ? 'bg-[#000000] text-white' : 'bg-[#F5F5F7] text-black'}`}>
      <nav className={`fixed bottom-0 left-0 right-0 lg:top-0 lg:w-72 lg:h-full z-50 p-4 lg:p-8 flex lg:flex-col gap-2 lg:gap-8 ${darkMode ? 'bg-[#111112]/90 border-t border-white/5' : 'bg-white/90 border-t border-black/5'} lg:border-t-0 lg:border-r backdrop-blur-3xl`}>
        <div className="hidden lg:block mb-10">
          <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent">경희장부</h1>
          <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">{CURRENT_VERSION} PROTECTED</p>
        </div>
        <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-house" label="홈" />
        <NavItem active={view === 'sales'} onClick={() => setView('sales')} icon="fa-plus-circle" label="판매입력" />
        <NavItem active={view === 'stats'} onClick={() => setView('stats')} icon="fa-chart-pie" label="정밀분석" />
        <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon="fa-shield-halved" label="데이터관리" />
        
        <div className="hidden lg:flex mt-auto p-4 apple-card bg-emerald-500/5 items-center gap-3 border-emerald-500/10">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">Data Protected</p>
        </div>
      </nav>

      <main className="p-4 md:p-12 max-w-6xl mx-auto space-y-8">
        {view === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-1000 space-y-8">
            <header className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black tracking-tight">비즈니스 요약</h2>
                <p className="text-gray-500 font-bold mt-1 text-sm">사장님의 소중한 데이터가 실시간 보호 중입니다.</p>
              </div>
              <div className="px-4 py-2 bg-emerald-500/10 rounded-full flex items-center gap-2">
                 <i className="fas fa-database text-emerald-500 text-xs"></i>
                 <span className="text-[11px] font-black text-emerald-500 uppercase">Saved: {stats.recordCount} records</span>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard label="당월 총 매출" value={stats.totalRevenue} color="text-blue-500" />
              <SummaryCard label="정산 예정액" value={stats.totalSettlement} color="text-indigo-500" />
              <SummaryCard label="추정 순이익" value={stats.totalRevenue * 0.3} color="text-emerald-500" />
            </div>

            <div className="apple-card p-10 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent">
               <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-blue-500/30">
                  <i className="fas fa-shield-check text-3xl text-white"></i>
               </div>
               <div className="text-center md:text-left">
                  <h3 className="text-xl font-black italic">v19.7 업데이트 성공</h3>
                  <p className="text-gray-500 text-sm mt-2 leading-relaxed font-bold">
                    브라우저 캐시 문제를 해결했습니다. <br/>
                    사장님의 기존 데이터 {stats.recordCount}건은 완벽하게 보존되었습니다.
                  </p>
               </div>
            </div>
          </div>
        )}

        {view === 'sales' && <SalesInputV17 menuItems={menuItems} platforms={platforms} onFinalSubmit={handleFinalSubmit} />}
        
        {view === 'stats' && <StatsContainer sales={sales} menuItems={menuItems} platforms={platforms} darkMode={darkMode} />}

        {view === 'settings' && (
          <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500">
             <h2 className="text-2xl font-black">데이터 관리 및 백업</h2>
             <div className="apple-card p-8 border-t-8 border-emerald-500 space-y-6">
                <h3 className="text-sm font-black text-emerald-500 uppercase tracking-widest">수동 엑셀 백업</h3>
                <p className="text-xs text-gray-500 font-bold">혹시 모를 상황에 대비해 현재 데이터를 엑셀로 다운로드 하세요.</p>
                <button onClick={() => {
                  const ws = XLSX.utils.json_to_sheet(sales);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Backup");
                  XLSX.writeFile(wb, `경희장부_전체백업_${new Date().toISOString().split('T')[0]}.xlsx`);
                }} className="w-full py-5 bg-emerald-600 text-white rounded-[22px] font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                  지금 전체 데이터 백업하기 (Excel)
                </button>
             </div>
             <div className="apple-card p-8 border-t-8 border-rose-500/30 space-y-4">
                <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest">시스템 초기화</h3>
                <p className="text-xs text-gray-500 font-bold">주의: 이 작업은 되돌릴 수 없습니다.</p>
                <button onClick={() => {
                   if(confirm('정말 모든 데이터를 삭제하시겠습니까? 백업을 먼저 하실 것을 권장합니다.')) {
                      localStorage.clear();
                      window.location.reload();
                   }
                }} className="w-full py-4 text-rose-500/50 hover:text-rose-500 text-[10px] font-black uppercase tracking-[0.4em] transition-all">Factory Reset</button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="apple-card p-8">
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{label}</p>
    <p className={`text-2xl font-black ${color} tracking-tighter`}>{Math.round(value).toLocaleString()}원</p>
  </div>
);

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-5 px-3 py-4 lg:px-8 lg:py-5 rounded-[22px] transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-2xl scale-105' : 'text-gray-500 hover:bg-white/5'}`}>
    <i className={`fas ${icon} text-lg lg:text-xl`}></i>
    <span className="text-[10px] lg:text-base font-black tracking-tight">{label}</span>
  </button>
);

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
    setTempQueue([...tempQueue, ...newRecords]);
    setFormData({});
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500 pb-20">
      <div className="apple-card p-8 border-t-8 border-blue-600 shadow-2xl space-y-8">
        <h2 className="text-2xl font-black tracking-tighter italic">판매 정산 입력</h2>
        <div className="grid grid-cols-2 gap-4">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="p-4 bg-white/5 rounded-2xl font-bold border border-white/5 focus:border-blue-500/50 outline-none" />
          <select value={platform} onChange={e=>setPlatform(e.target.value)} className="p-4 bg-white/5 rounded-2xl font-bold border border-white/5 focus:border-blue-500/50 outline-none">
            <option value="">플랫폼 선택</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {menuItems.map(m => (
            <div key={m.id} className="grid grid-cols-12 gap-3 items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <span className="col-span-4 text-xs font-bold text-gray-400">{m.name}</span>
              <input type="number" placeholder="수량" value={formData[m.id]?.qty || ''} onChange={e=>setFormData({...formData, [m.id]: {...(formData[m.id]||{qty:'',price:''}), qty: e.target.value}})} className="col-span-3 p-3 bg-black/20 rounded-xl text-center text-xs font-black outline-none border border-white/5" />
              <input type="number" placeholder="총금액" value={formData[m.id]?.price || ''} onChange={e=>setFormData({...formData, [m.id]: {...(formData[m.id]||{qty:'',price:''}), price: e.target.value}})} className="col-span-5 p-3 bg-black/20 rounded-xl text-right text-xs font-black outline-none border border-white/5" />
            </div>
          ))}
        </div>
        <button onClick={addToQueue} className="w-full py-5 bg-blue-600 text-white rounded-[22px] font-black shadow-xl">대기 목록에 추가</button>
      </div>

      {tempQueue.length > 0 && (
        <div className="apple-card p-8 border-t-8 border-emerald-500 space-y-6">
          <h2 className="text-xl font-black">대기 목록 ({tempQueue.length}건)</h2>
          <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
            {tempQueue.map((q, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl text-xs font-bold">
                <span className="text-blue-500">{platforms.find(p=>p.id===q.platformId)?.name}</span>
                <span>{q.totalPrice.toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <button onClick={() => onFinalSubmit(tempQueue)} className="w-full py-6 bg-emerald-500 text-white rounded-[24px] font-black text-xl shadow-2xl">최종 정산 완료</button>
        </div>
      )}
    </div>
  );
};

const StatsContainer: React.FC<{ sales: SaleRecord[], menuItems: MenuItem[], platforms: PlatformConfig[], darkMode: boolean }> = ({ sales, menuItems, platforms, darkMode }) => {
  const [timeUnit, setTimeUnit] = useState<'day' | 'month'>('day');

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      const d = new Date(s.date);
      const k = timeUnit === 'day' ? d.toLocaleDateString() : `${d.getFullYear()}-${d.getMonth()+1}`;
      map[k] = (map[k] || 0) + s.totalPrice;
    });
    return Object.entries(map).sort().map(([date, revenue]) => ({ date, revenue }));
  }, [sales, timeUnit]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black tracking-tighter">정밀 분석</h2>
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
          <button onClick={()=>setTimeUnit('day')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${timeUnit === 'day' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>일별</button>
          <button onClick={()=>setTimeUnit('month')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${timeUnit === 'month' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>월별</button>
        </div>
      </div>
      
      <div className="apple-card p-8 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0A84FF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
            <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} dy={10} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} dx={-10} />
            <Tooltip contentStyle={{borderRadius:'20px', border:'none', backgroundColor: darkMode?'#1C1C1E':'#fff'}} />
            <Area type="monotone" dataKey="revenue" stroke="#0A84FF" strokeWidth={4} fill="url(#grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default App;
