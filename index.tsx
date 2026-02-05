
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend
} from 'recharts';
import * as XLSX from 'xlsx';

// --- Types ---
interface MenuItem {
  id: string;
  name: string;
}

interface PlatformConfig {
  id: string;
  name: string;
  feePercent: number;
}

interface SaleRecord {
  id: string;
  date: string; // ISO string
  platformId: string;
  menuId: string;
  quantity: number;
  totalPrice: number;
  settlementAmount: number;
}

// --- Constants ---
const DEFAULT_PLATFORMS: PlatformConfig[] = [
  { id: 'baemin', name: '배민', feePercent: 6.8 },
  { id: 'coupang', name: '쿠팡', feePercent: 9.8 },
  { id: 'yogiyo', name: '요기요', feePercent: 12.5 },
  { id: 'naver', name: '네이버', feePercent: 3.5 },
  { id: 'store', name: '매장(현장)', feePercent: 1.5 },
];

const INITIAL_MENU: MenuItem[] = [
  { id: 'menu-1', name: '닭강정' },
  { id: 'menu-2', name: '국밥' },
  { id: 'menu-3', name: '냉면' },
];

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55'];

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'sales' | 'stats' | 'settings'>('dashboard');
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [backups, setBackups] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const s = localStorage.getItem('kh_sales');
    const b = localStorage.getItem('kh_backups');
    if (s) setSales(JSON.parse(s));
    if (b) setBackups(JSON.parse(b));
  }, []);

  useEffect(() => {
    localStorage.setItem('kh_sales', JSON.stringify(sales));
    localStorage.setItem('kh_backups', JSON.stringify(backups));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [sales, backups, darkMode]);

  const stats = useMemo(() => {
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
      mtdSettlement: mtdSales.reduce((acc, s) => acc + s.settlementAmount, 0),
      lmdRevenue: lmdSales.reduce((acc, s) => acc + s.totalPrice, 0),
      lmdName: lastMonthDate.getMonth() + 1,
      mtdName: curMonth + 1
    };
  }, [sales]);

  const handleFinalSubmit = (newRecords: SaleRecord[]) => {
    const updatedSales = [...newRecords, ...sales];
    setSales(updatedSales);
    const newBackup = {
      id: generateId(),
      timestamp: new Date().toLocaleString(),
      count: newRecords.length
    };
    setBackups(prev => [newBackup, ...prev].slice(0, 10));
    alert('🎉 정산 마감 완료! 분석 탭에서 확인하세요.');
    setView('stats');
  };

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 lg:pl-72 transition-colors duration-500 ${darkMode ? 'bg-black text-[#f2f2f7]' : 'bg-[#F5F5F7] text-[#1d1d1f]'}`}>
      <nav className={`fixed bottom-0 left-0 right-0 lg:top-0 lg:w-72 lg:h-full z-50 p-4 lg:p-8 flex lg:flex-col gap-2 lg:gap-6 ${darkMode ? 'bg-[#111112]/90 border-t border-white/5' : 'bg-white/90 border-t border-black/5'} lg:border-t-0 lg:border-r backdrop-blur-3xl`}>
        <div className="hidden lg:block mb-8">
          <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent">경희장부</h1>
          <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Premium v23.0</p>
        </div>
        <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-house" label="홈" />
        <NavItem active={view === 'sales'} onClick={() => setView('sales')} icon="fa-plus-circle" label="정산입력" />
        <NavItem active={view === 'stats'} onClick={() => setView('stats')} icon="fa-chart-pie" label="정밀분석" />
        <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon="fa-shield-halved" label="장부관리" />
      </nav>

      <main className="p-4 md:p-12 max-w-6xl mx-auto space-y-8">
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <header>
              <h2 className="text-3xl font-black tracking-tight">비즈니스 리포트</h2>
              <p className="text-gray-500 font-bold mt-1 text-sm">실시간 매출 현황입니다.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label={`${stats.lmdName}월 매출 (전월)`} value={stats.lmdRevenue} color="text-gray-400" />
              <StatCard label={`${stats.mtdName}월 매출 (당월)`} value={stats.mtdRevenue} color="text-blue-500" />
              <StatCard label="정산 예정액" value={stats.mtdSettlement} color="text-indigo-500" />
              <StatCard label="추정 순이익" value={stats.mtdRevenue * 0.3} color="text-emerald-500" />
            </div>
            <div className="apple-card p-10 flex flex-col md:flex-row items-center justify-between gap-6 border-l-8 border-blue-600 bg-gradient-to-r from-blue-600/5 to-transparent">
               <div className="space-y-2">
                 <h3 className="text-xl font-black italic">신규 기능안내</h3>
                 <p className="text-sm text-gray-500 font-bold">이제 엑셀 업로드로 수십 개의 정산을 한 번에 마감하고,<br/>일별/월별/연별 통계를 엑셀로 내려받을 수 있습니다.</p>
               </div>
               <button onClick={() => setView('sales')} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:scale-105 transition-all">지금 정산하기</button>
            </div>
          </div>
        )}

        {view === 'sales' && <SalesInputComponent menuItems={menuItems} platforms={platforms} onFinalSubmit={handleFinalSubmit} />}
        {view === 'stats' && <StatsComponent sales={sales} menuItems={menuItems} platforms={platforms} darkMode={darkMode} />}
        {view === 'settings' && (
          <div className="max-w-xl mx-auto space-y-8">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-black">설정</h2>
               <button onClick={()=>setDarkMode(!darkMode)} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs font-black">{darkMode ? '🌙 다크 모드' : '☀️ 라이트 모드'}</button>
             </div>
             <div className="apple-card p-8 border-t-8 border-rose-500/30 space-y-4">
                <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest">데이터 초기화</h3>
                <button onClick={()=>{if(confirm('전체 삭제하시겠습니까?')) {localStorage.clear(); window.location.reload();}}} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em]">전체 초기화</button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-5 px-3 py-4 lg:px-8 lg:py-5 rounded-[24px] transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-2xl scale-105' : 'text-gray-500 hover:bg-white/5'}`}>
    <i className={`fas ${icon} text-lg lg:text-xl`}></i>
    <span className="text-[10px] lg:text-base font-black tracking-tight">{label}</span>
  </button>
);

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="apple-card p-8 transition-all duration-300">
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{label}</p>
    <p className={`text-2xl font-black ${color} tracking-tighter`}>{Math.round(value).toLocaleString()}원</p>
  </div>
);

const SalesInputComponent: React.FC<{ menuItems: MenuItem[], platforms: PlatformConfig[], onFinalSubmit: (r: SaleRecord[]) => void }> = ({ menuItems, platforms, onFinalSubmit }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [formData, setFormData] = useState<Record<string, { qty: string, price: string }>>({});
  const [queue, setQueue] = useState<SaleRecord[]>([]);

  const addToQueue = () => {
    const plat = platforms.find(p => p.id === selectedPlatform);
    if (!plat) return alert('플랫폼을 선택하세요.');
    const newRecords: SaleRecord[] = [];
    (Object.entries(formData) as [string, { qty: string, price: string }][]).forEach(([menuId, item]) => {
      const q = Number(item.qty);
      const p = Number(item.price);
      if (q > 0 && p > 0) {
        const fee = p * (plat.feePercent / 100);
        newRecords.push({ id: generateId(), date: new Date(date).toISOString(), platformId: selectedPlatform, menuId, quantity: q, totalPrice: p, settlementAmount: p - fee });
      }
    });
    if (newRecords.length === 0) return alert('내역이 없습니다.');
    setQueue([...queue, ...newRecords]);
    setFormData({});
  };

  const handleExcelTemplateDownload = () => {
    const wsData = [
      ['날짜(YYYY-MM-DD)', '플랫폼ID(baemin/coupang/yogiyo/naver/store)', '메뉴명', '수량', '판매총액'],
      [new Date().toISOString().split('T')[0], 'baemin', menuItems[0].name, '1', '15000']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "정산양식");
    XLSX.writeFile(wb, "경희장부_판매입력양식.xlsx");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname], { header: 1 }) as any[][];
        
        const newRecords: SaleRecord[] = [];
        data.slice(1).forEach(row => {
          if (!row[0] || !row[1] || !row[2]) return;
          const rDate = String(row[0]);
          const rPlatId = String(row[1]);
          const rMenuName = String(row[2]);
          const rQty = Number(row[3]);
          const rPrice = Number(row[4]);
          
          const plat = platforms.find(p => p.id === rPlatId);
          const menu = menuItems.find(m => m.name === rMenuName);
          
          if (plat && menu && rQty > 0 && rPrice > 0) {
            const fee = rPrice * (plat.feePercent / 100);
            newRecords.push({
              id: generateId(),
              date: new Date(rDate).toISOString(),
              platformId: plat.id,
              menuId: menu.id,
              quantity: rQty,
              totalPrice: rPrice,
              settlementAmount: rPrice - fee
            });
          }
        });
        
        if (newRecords.length > 0) {
          setQueue([...queue, ...newRecords]);
          alert(`🎉 ${newRecords.length}건의 판매 내역을 불러왔습니다.`);
        } else {
          alert('❌ 올바른 데이터가 없습니다. 양식을 확인해 주세요.');
        }
      } catch (err) {
        alert('❌ 엑셀 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20">
      <div className="apple-card p-10 border-t-8 border-blue-600 shadow-2xl space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">판매 정산 입력</h2>
          <div className="flex gap-2">
            <button onClick={handleExcelTemplateDownload} className="p-3 bg-gray-500/10 rounded-xl text-[10px] font-black uppercase tracking-tight">양식 다운</button>
            <label className="p-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-tight cursor-pointer">
              엑셀 업로드
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
            </label>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="p-4 bg-white/5 rounded-2xl font-bold border border-white/5 outline-none" />
          <select value={selectedPlatform} onChange={e=>setSelectedPlatform(e.target.value)} className="p-4 bg-white/5 rounded-2xl font-bold border border-white/5 outline-none">
            <option value="">플랫폼 선택</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {menuItems.map(m => {
            const val = formData[m.id];
            return (
              <div key={m.id} className="grid grid-cols-12 gap-3 items-center p-4 bg-white/5 rounded-2xl">
                <span className="col-span-4 text-xs font-bold text-gray-400">{m.name}</span>
                <input type="number" placeholder="수량" value={val?.qty || ''} onChange={e=>setFormData({...formData, [m.id]: {...(val||{qty:'',price:''}), qty: e.target.value}})} className="col-span-3 p-3 bg-black/20 rounded-xl text-center text-xs font-black outline-none" />
                <input type="number" placeholder="금액" value={val?.price || ''} onChange={e=>setFormData({...formData, [m.id]: {...(val||{qty:'',price:''}), price: e.target.value}})} className="col-span-5 p-3 bg-black/20 rounded-xl text-right text-xs font-black outline-none" />
              </div>
            );
          })}
        </div>
        <button onClick={addToQueue} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[22px] font-black">대기 목록 추가</button>
      </div>

      {queue.length > 0 && (
        <div className="apple-card p-10 border-t-8 border-emerald-500 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black">대기 목록 ({queue.length}건)</h2>
            <button onClick={()=>setQueue([])} className="text-[10px] font-black text-rose-500 uppercase tracking-widest">목록 삭제</button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
            {queue.map((q, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-[18px] text-xs">
                <div className="flex flex-col">
                  <span className="font-black">{platforms.find(p=>p.id===q.platformId)?.name}</span>
                  <span className="text-[10px] text-gray-500">{menuItems.find(m=>m.id===q.menuId)?.name}</span>
                </div>
                <div className="text-right">
                   <span className="font-black text-blue-400 block">{q.totalPrice.toLocaleString()}원</span>
                   <span className="text-[10px] text-gray-500">{new Date(q.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => onFinalSubmit(queue)} className="w-full py-6 bg-emerald-500 text-white rounded-[24px] font-black text-xl shadow-2xl">오늘 정산 최종 마감</button>
        </div>
      )}
    </div>
  );
};

const StatsComponent: React.FC<{ sales: SaleRecord[], menuItems: MenuItem[], platforms: PlatformConfig[], darkMode: boolean }> = ({ sales, menuItems, platforms, darkMode }) => {
  const [tab, setTab] = useState<'time' | 'menu' | 'platform'>('time');
  const [timeGrain, setTimeGrain] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  const chartData = useMemo(() => {
    const menuMap: Record<string, number> = {};
    const platMap: Record<string, number> = {};
    const timeMap: Record<string, number> = {};

    sales.forEach(s => {
      // Menu Map
      menuMap[s.menuId] = (menuMap[s.menuId] || 0) + s.totalPrice;
      // Platform Map
      platMap[s.platformId] = (platMap[s.platformId] || 0) + s.totalPrice;
      
      // Time Map based on Grain
      const d = new Date(s.date);
      let key = "";
      if (timeGrain === 'daily') key = d.toLocaleDateString();
      else if (timeGrain === 'monthly') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      else if (timeGrain === 'yearly') key = `${d.getFullYear()}년`;
      
      timeMap[key] = (timeMap[key] || 0) + s.totalPrice;
    });

    return {
      menu: Object.entries(menuMap).map(([id, val]) => ({ name: menuItems.find(m=>m.id===id)?.name || '기타', value: val })).sort((a, b) => b.value - a.value),
      plat: Object.entries(platMap).map(([id, val]) => ({ name: platforms.find(p=>p.id===id)?.name || id, value: val })).sort((a, b) => b.value - a.value),
      time: Object.entries(timeMap).sort().map(([label, revenue]) => ({ label, revenue }))
    };
  }, [sales, menuItems, platforms, timeGrain]);

  const handleExportStats = () => {
    let exportData: any[] = [];
    let fileName = "";
    if (tab === 'menu') {
      exportData = chartData.menu.map(i => ({ "메뉴명": i.name, "총 매출액": i.value }));
      fileName = "메뉴별_매출통계.xlsx";
    } else if (tab === 'platform') {
      exportData = chartData.plat.map(i => ({ "플랫폼명": i.name, "총 매출액": i.value }));
      fileName = "플랫폼별_매출통계.xlsx";
    } else {
      exportData = chartData.time.map(i => ({ "기간": i.label, "매출액": i.revenue }));
      fileName = `매출추이_${timeGrain}.xlsx`;
    }
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "통계데이터");
    XLSX.writeFile(wb, fileName);
  };

  if (sales.length === 0) {
    return (
      <div className="apple-card p-20 text-center space-y-4 animate-in fade-in">
        <i className="fas fa-chart-line text-6xl text-gray-200"></i>
        <h3 className="text-xl font-black">데이터가 없습니다.</h3>
        <p className="text-sm text-gray-500 font-bold">판매 정산을 마감하면 실시간 분석 리포트가 생성됩니다.</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/5 rounded-xl text-xs font-black">새로고침</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-black">정밀 분석 리포트</h2>
        <button onClick={handleExportStats} className="p-4 bg-blue-600/10 text-blue-600 rounded-2xl text-[10px] font-black border border-blue-500/10 hover:bg-blue-600 hover:text-white transition-all">
          <i className="fas fa-file-excel mr-2"></i> 통계 엑셀 다운로드
        </button>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-[22px] border border-white/5">
          {(['time', 'menu', 'platform'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 rounded-[16px] text-[11px] font-black transition-all ${tab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>
              {t === 'time' ? '기간별 추이' : t === 'menu' ? '메뉴별 랭킹' : '플랫폼 점유율'}
            </button>
          ))}
        </div>

        {tab === 'time' && (
          <div className="flex gap-2 justify-end px-2">
            {(['daily', 'monthly', 'yearly'] as const).map(g => (
              <button key={g} onClick={()=>setTimeGrain(g)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${timeGrain === g ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                {g === 'daily' ? '일별' : g === 'monthly' ? '월별' : '연별'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="apple-card p-10 h-[500px] border-t-8 border-indigo-600">
        <ResponsiveContainer width="100%" height="100%">
          {tab === 'time' ? (
            <AreaChart data={chartData.time}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
              <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} stroke="#8E8E93" dy={10} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#8E8E93" />
              <Tooltip contentStyle={{borderRadius:'24px', border:'none', backgroundColor: darkMode?'#1C1C1E':'#fff', fontSize: '12px', fontWeight: 'bold'}} />
              <Area type="monotone" dataKey="revenue" name="매출액" stroke="#007AFF" fill="url(#colorRev)" strokeWidth={4} />
            </AreaChart>
          ) : (
            <BarChart data={tab === 'menu' ? chartData.menu : chartData.plat} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} fontSize={11} tickLine={false} axisLine={false} stroke="#8E8E93" />
              <Tooltip contentStyle={{borderRadius:'24px', border:'none', backgroundColor: darkMode?'#1C1C1E':'#fff', fontSize: '12px', fontWeight: 'bold'}} />
              <Bar dataKey="value" name="총 매출액" radius={[0, 15, 15, 0]} animationDuration={1000}>
                {(tab === 'menu' ? chartData.menu : chartData.plat).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="apple-card p-8 space-y-4 border-l-8 border-emerald-500">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">베스트 {tab === 'menu' ? '메뉴' : '플랫폼'}</h4>
            <div className="flex justify-between items-end">
               <span className="text-2xl font-black">{tab === 'menu' ? chartData.menu[0]?.name : chartData.plat[0]?.name}</span>
               <span className="text-lg font-black text-emerald-500">{tab === 'menu' ? chartData.menu[0]?.value.toLocaleString() : chartData.plat[0]?.value.toLocaleString()}원</span>
            </div>
         </div>
         <div className="apple-card p-8 space-y-4 border-l-8 border-blue-500">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">분석 기준</h4>
            <div className="flex justify-between items-end">
               <span className="text-2xl font-black">{tab === 'time' ? (timeGrain === 'daily' ? '일간' : timeGrain === 'monthly' ? '월간' : '연간') : (tab === 'menu' ? '품목별' : '채널별')}</span>
               <span className="text-sm font-bold text-gray-500">{sales.length}건의 데이터 기준</span>
            </div>
         </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
