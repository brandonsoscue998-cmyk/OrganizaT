import React from "react";
import { LayoutDashboard, Users, Calendar, LogOut, ArrowRight, Activity, CreditCard } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Noviembre", total: 1200 },
  { name: "Diciembre", total: 980 },
  { name: "Enero", total: 1450 },
  { name: "Febrero", total: 1800 },
  { name: "Marzo", total: 2200 },
  { name: "Abril", total: 2840 },
];

const recentSessions = [
  { id: 1, client: "María López", date: "22 abr 2026", time: "16:00", status: "Pendiente", price: "90,00 €", paid: false },
  { id: 2, client: "Carlos Ruiz", date: "22 abr 2026", time: "10:00", status: "Completada", price: "120,00 €", paid: true },
  { id: 3, client: "Pedro Jiménez", date: "21 abr 2026", time: "11:00", status: "Completada", price: "120,00 €", paid: true },
  { id: 4, client: "Sofia Martínez", date: "20 abr 2026", time: "09:30", status: "Completada", price: "80,00 €", paid: true },
  { id: 5, client: "David García", date: "18 abr 2026", time: "15:00", status: "Completada", price: "100,00 €", paid: true },
];

export function Dashboard() {
  return (
    <div className="flex h-screen bg-[#f7f9fc] overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between shadow-sm z-10">
        <div>
          <div className="p-6">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Practitioner</h1>
          </div>
          <nav className="px-3 space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-md font-medium text-sm transition-colors">
              <LayoutDashboard className="w-4 h-4" />
              Panel
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md font-medium text-sm transition-colors">
              <Users className="w-4 h-4" />
              Clientes
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md font-medium text-sm transition-colors">
              <Calendar className="w-4 h-4" />
              Sesiones
            </a>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs">
              AG
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">Ana García</p>
              <p className="text-xs text-slate-500 truncate">Profesional</p>
            </div>
          </div>
          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <header>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Panel</h2>
            <p className="text-sm text-slate-500 mt-1">Resumen de tu consulta</p>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clientes totales</p>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">24</p>
              <p className="text-xs text-slate-500 mt-1">Activos esta semana</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sesiones esta semana</p>
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">8</p>
              <p className="text-xs text-slate-500 mt-1">2 quedan pendientes</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ingresos del mes</p>
                <Activity className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">2.840,00 €</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">+12% vs mes anterior</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendiente de cobro</p>
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">360,00 €</p>
              <p className="text-xs text-slate-500 mt-1">De 4 sesiones</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col">
              <h3 className="text-sm font-semibold text-slate-900 mb-6 uppercase tracking-wider">Evolución de ingresos</h3>
              <div className="flex-1 min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `${value}€`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value} €`, 'Ingresos']}
                      labelStyle={{ color: '#0f172a', fontWeight: 600, marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Sesiones recientes</h3>
                <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                  Ver todas <ArrowRight className="w-3 h-3" />
                </a>
              </div>
              <div className="space-y-4 flex-1">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-start justify-between p-3 -mx-3 hover:bg-slate-50/80 rounded-lg transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{session.client}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{session.date} • {session.time}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase ${
                        session.status === 'Completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        session.status === 'Pendiente' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {session.status}
                      </span>
                      <p className="text-sm font-medium text-slate-900">{session.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
