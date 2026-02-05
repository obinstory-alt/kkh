
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell
} from 'recharts';
import * as XLSX from 'xlsx';

// --- 플랫폼 설정 ---
const PLATFORMS = [
  { id: 'baemin', name: '배민', fee: 6.8 },
  { id: 'coupang', name: '쿠팡', fee: 9.8 },
  { id: 'yogiyo', name: '요기요', fee: 12.5 },
  { id: 'naver', name: '네이버', fee: 3.5 },
  { id: 'store', name: '매장(현장)', fee: 1.5 },
];

const INITIAL_MENU = [
  { id: 'm1', name: '닭강정' },
  { id: 'm2', name: '국밥' },
  { id: 'm3', name: '냉면' },
];

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55'];

const generateId = () => Math.random().toString(36).substr(2, 9);

const App = () => {
  const [view, setView] = useState('dashboard');
  const [sales, setSales] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('kh_sales_v24_final');
    if (saved) setSales(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('kh_sales_v24_final', JSON.stringify(sales));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [sales, darkMode]);

  const summary = useMemo(() => {
    const now = new Date();
    const thisMonthSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      revenue: thisMonthSales.reduce((acc, s) => acc + s.totalPrice, 0),
      settlement: thisMonthSales.reduce((acc, s) => acc + s.settlementAmount, 0),
      count: thisMonthSales.length
    };
  }, [sales]);

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 lg:pl-72 transition-all ${darkMode ? 'bg-black text-white' : 'bg-[#F5F5F7] text-black'}`}>
      
      <nav className={`fixed bottom-0 left-0 right-0 lg:top-0 lg:w-72 lg:h-full z-50 p-4 lg:p-8 flex lg:flex-col gap-2 ${darkMode ? 'bg-[#111112]/90 border-t border-white/5' : 'bg-white/90 border-t border-black/5'} lg:border-t-0 lg:border-r backdrop-blur-xl`}>
        <div className="hidden lg:block mb-8">
          <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">경희장부</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Premium v24.1</p>
        </div>
        <NavBtn active={view === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-house" label="홈" />
        <NavBtn active={view === 'sales'} onClick={() => setView('sales')} icon="fa-plus-circle" label="정산입력" />
        <NavBtn active={view === 'stats'} onClick={() => setView('stats')} icon="fa-chart-pie" label="정밀분석" />
        <NavBtn active={view === 'settings'} onClick={() => setView('settings')} icon="fa-gear" label="설정" />
      </nav>

      <main className="p-4 md:p-10 max-w-6xl mx-auto space-y-10">
        {view === 'dashboard' && <DashboardView summary={summary} setView={setView} />}
        {view === 'sales' && <SalesInputView sales={sales} onSave={(newItems) => {setSales([...newItems, ...sales]); setView('stats');}} />}
        {view === 'stats' && <StatsView sales={sales} darkMode={darkMode} />}
        {view === 'settings' && <SettingsView darkMode={darkMode} setDarkMode={setDarkMode} setSales={setSales} />}
      </main>
    </div>
  );
};

const NavBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center gap-2 lg:gap-5 px-4 py-4 lg:px-6 lg:py-5 rounded-[22px] transition-all ${active ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-gray-500 hover:bg-white/5'}`}>
    <i className={`fas ${icon} text-lg`}></i>
    <span className="text-[10px] lg:text-sm font-black tracking-tight">{label}</span>
  </button>
);

const DashboardView = ({ summary, setView }: any) => (
  <div className="space-y-10 animate-in fade-in duration-500">
    <header><h2 className="text-4xl font-black">비즈니스 리포트</h2><p className="text-gray-500 font-bold mt-2">이달의 실시간 운영 현황입니다.</p></header>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="apple-card p-8 border-l-8 border-blue-600"><p className="text-[11px] font-black text-gray-400 mb-2">당월 매출</p><p className="text-3xl font-black text-blue-500">{summary.revenue.toLocaleString()}원</p></div>
      <div className="apple-card p-8 border-l-8 border-indigo-500"><p className="text-[11px] font-black text-gray-400 mb-2">정산 예정</p><p className="text-3xl font-black text-indigo-500">{summary.settlement.toLocaleString()}원</p></div>
      <div className="apple-card p-8 border-l-8 border-emerald-500"><p className="text-[11px] font-black text-gray-400 mb-2">주문 건수</p><p className="text-3xl font-black text-emerald-500">{summary.count.toLocaleString()}건</p></div>
    </div>
    <div className="apple-card p-10 bg-gradient-to-br from-blue-600/10 to-transparent flex flex-col md:flex-row justify-between items-center gap-6">
      <div><h3 className="text-xl font-black mb-2">장부가 깨끗해졌습니다 ✨</h3><p className="text-sm text-gray-500 font-bold">이제 엑셀 업로드로 정산을 한 번에 끝내세요.</p></div>
      <button onClick={() => setView('sales')} className="px-10 py-5 bg-blue-600 text-white rounded-3xl font-black shadow-xl hover:scale-105 transition-all">정산 시작하기</button>
    </div>
  </div>
);

const SalesInputView = ({ onSave }: any) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [platId, setPlatId] = useState('');
  const [inputs, setInputs] = useState<any>({});
  const [queue, setQueue] = useState<any[]>([]);

  const addToQueue = () => {
    if (!platId) return alert('플랫폼을 선택하세요.');
    const plat = PLATFORMS.find(p => p.id === platId);
    const newItems: any[] = [];
    Object.entries(inputs).forEach(([menuId, data]: any) => {
      const q = Number(data.qty);
      const p = Number(data.price);
      if (q > 0 && p > 0) {
        newItems.push({
          id: generateId(), date: new Date(date).toISOString(), platformId: platId, 
          menuId, quantity: q, totalPrice: p, settlementAmount: p - (p * (plat?.fee || 0) / 100)
        });
      }
    });
    if (newItems.length === 0) return alert('수량을 입력하세요.');
    setQueue([...queue, ...newItems]);
    setInputs({});
  };

  const handleExcelTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([['날짜', '플랫폼ID', '메뉴명', '수량', '금액'], [date, 'baemin', '닭강정', 1, 15000]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "경희장부_양식.xlsx");
  };

  const handleUpload = (e: any) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt: any) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const data: any = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const loaded: any[] = [];
      data.slice(1).forEach((row: any) => {
        const plat = PLATFORMS.find(p => p.id === row[1]);
        if (plat) {
          const p = Number(row[4]);
          loaded.push({ id: generateId(), date: new Date(row[0]).toISOString(), platformId: row[1], menuId: row[2], quantity: Number(row[3]), totalPrice: p, settlementAmount: p - (p * plat.fee / 100)});
        }
      });
      setQueue([...queue, ...loaded]);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
      <div className="apple-card p-10 border-t-8 border-blue-600 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black italic">판매 정산 입력</h2>
          <div className="flex gap-2">
            <button onClick={handleExcelTemplate} className="p-3 bg-white/5 rounded-xl text-[10px] font-black border border-white/10">양식 다운</button>
            <label className="p-3 bg-blue-600 text-white rounded-xl text-[10px] font-black cursor-pointer">엑셀 업로드<input type="file" hidden onChange={handleUpload} /></label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-4 bg-white/5 rounded-2xl border border-white/10 font-bold" />
          <select value={platId} onChange={e => setPlatId(e.target.value)} className="p-4 bg-white/5 rounded-2xl border border-white/10 font-bold outline-none">
            <option value="">플랫폼 선택</option>
            {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {INITIAL_MENU.map(m => (
            <div key={m.id} className="grid grid-cols-12 gap-3 items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <span className="col-span-4 text-xs font-bold text-gray-500">{m.name}</span>
              <input type="number" placeholder="수량" value={inputs[m.id]?.qty || ''} onChange={e => setInputs({...inputs, [m.id]: {...(inputs[m.id]||{}), qty: e.target.value}})} className="col-span-3 p-3 bg-black/20 rounded-xl text-center text-xs font-black border border-white/5" />
              <input type="number" placeholder="금액" value={inputs[m.id]?.price || ''} onChange={e => setInputs({...inputs, [m.id]: {...(inputs[m.id]||{}), price: e.target.value}})} className="col-span-5 p-3 bg-black/20 rounded-xl text-right text-xs font-black border border-white/5" />
            </div>
          ))}
        </div>
        <button onClick={addToQueue} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl font-black shadow-xl">항목 추가</button>
      </div>

      {queue.length > 0 && (
        <div className="apple-card p-10 border-t-8 border-emerald-500 space-y-6">
          <h2 className="text-xl font-black">정산 대기 ({queue.length}건)</h2>
          <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
            {queue.map((q, i) => (
              <div key={i} className="flex justify-between p-4 bg-white/5 rounded-2xl text-xs border border-white/5">
                <span>{PLATFORMS.find(p=>p.id===q.platformId)?.name} - {q.menuId}</span>
                <span className="font-black text-blue-400">{q.totalPrice.toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <button onClick={() => onSave(queue)} className="w-full py-6 bg-emerald-500 text-white rounded-[28px] font-black text-xl shadow-2xl">오늘 정산 마감하기</button>
        </div>
      )}
    </div>
  );
};

const StatsView = ({ sales, darkMode }: any) => {
  const [tab, setTab] = useState<'time' | 'menu' | 'platform'>('time');
  const [grain, setGrain] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  const data = useMemo(() => {
    const timeM: Record<string, number> = {};
    const menuM: Record<string, number> = {};
    const platM: Record<string, number> = {};

    sales.forEach(s => {
      const d = new Date(s.date);
      let k = grain === 'daily' ? d.toLocaleDateString() : grain === 'monthly' ? `${d.getFullYear()}-${d.getMonth()+1}` : `${d.getFullYear()}년`;
      timeM[k] = (timeM[k] || 0) + s.totalPrice;
      menuM[s.menuId] = (menuM[s.menuId] || 0) + s.totalPrice;
      platM[s.platformId] = (platM[s.platformId] || 0) + s.totalPrice;
    });

    return {
      time: Object.entries(timeM).sort((a,b)=>new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([label, revenue]) => ({ label, revenue })),
      menu: Object.entries(menuM).sort((a,b)=>b[1]-a[1]).map(([name, value]) => ({ name, value })),
      plat: Object.entries(platM).sort((a,b)=>b[1]-a[1]).map(([id, value]) => ({ name: PLATFORMS.find(p=>p.id===id)?.name || id, value }))
    };
  }, [sales, grain]);

  const exportStats = () => {
    const target = tab === 'time' ? data.time : (tab === 'menu' ? data.menu : data.plat);
    const ws = XLSX.utils.json_to_sheet(target);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stats");
    XLSX.writeFile(wb, `경희장부_통계_${tab}.xlsx`);
  };

  if (sales.length === 0) return <div className="apple-card p-20 text-center font-black">데이터를 먼저 입력해주세요.</div>;

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-black">정밀 분석</h2>
        <button onClick={exportStats} className="px-6 py-4 bg-blue-600/10 text-blue-600 rounded-2xl text-xs font-black border border-blue-500/20"><i className="fas fa-file-excel mr-2"></i>통계 엑셀 다운</button>
      </div>
      <div className="flex gap-2 p-1.5 bg-white/5 rounded-[24px] border border-white/5">
        {(['time', 'menu', 'platform'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-4 rounded-[18px] text-[11px] font-black transition-all ${tab===t?'bg-blue-600 text-white shadow-lg':'text-gray-500'}`}>
            {t==='time'?'매출 추이':t==='menu'?'메뉴 순위':'플랫폼 점유'}
          </button>
        ))}
      </div>
      {tab === 'time' && (
        <div className="flex gap-2 justify-end">
          {(['daily', 'monthly', 'yearly'] as const).map(g => (
            <button key={g} onClick={()=>setGrain(g)} className={`px-5 py-2 rounded-xl text-[10px] font-black border ${grain===g?'bg-blue-600 border-blue-600 text-white':'bg-white/5 border-white/10 text-gray-500'}`}>{g==='daily'?'일별':g==='monthly'?'월별':'연별'}</button>
          ))}
        </div>
      )}
      <div className="apple-card p-10 border-t-8 border-indigo-600 min-h-[450px]">
        <ResponsiveContainer width="100%" height={400}>
          {tab === 'time' ? (
            <AreaChart data={data.time}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode?"#333":"#ddd"} />
              <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{borderRadius:'20px', border:'none'}} />
              <Area type="monotone" dataKey="revenue" stroke="#007AFF" fill="#007AFF" fillOpacity={0.1} strokeWidth={4} />
            </AreaChart>
          ) : (
            <BarChart data={tab === 'menu' ? data.menu : data.plat} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{borderRadius:'20px', border:'none'}} />
              <Bar dataKey="value" radius={[0, 15, 15, 0]}>
                {data.menu.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SettingsView = ({ darkMode, setDarkMode, setSales }: any) => (
  <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
    <h2 className="text-3xl font-black">설정</h2>
    <div className="apple-card p-8 space-y-6">
      <div className="flex justify-between items-center"><span>화면 모드</span><button onClick={()=>setDarkMode(!darkMode)} className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-xs font-black">{darkMode?'🌙 다크':'☀️ 라이트'}</button></div>
      <div className="pt-6 border-t border-white/5">
        <button onClick={()=>{if(confirm('데이터를 초기화할까요?')){setSales([]); localStorage.clear(); window.location.reload();}}} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-xs font-black">데이터 전체 삭제</button>
      </div>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
