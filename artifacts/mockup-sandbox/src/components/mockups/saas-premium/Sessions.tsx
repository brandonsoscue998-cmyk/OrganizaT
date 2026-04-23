import React from "react";
import { LayoutDashboard, Users, Calendar, LogOut, Plus, Trash2, Filter } from "lucide-react";

const sessions = [
  { id: 1, client: "Carlos Ruiz", date: "22 abr 2026", time: "10:00", status: "Completada", price: "120,00 €", paid: "Pagado" },
  { id: 2, client: "María López", date: "22 abr 2026", time: "16:00", status: "Pendiente", price: "90,00 €", paid: "Pendiente" },
  { id: 3, client: "Pedro Jiménez", date: "21 abr 2026", time: "11:00", status: "Completada", price: "120,00 €", paid: "Pagado" },
  { id: 4, client: "Sofia Martínez", date: "20 abr 2026", time: "09:30", status: "Completada", price: "80,00 €", paid: "Pagado" },
  { id: 5, client: "Carlos Ruiz", date: "19 abr 2026", time: "10:00", status: "Cancelada", price: "120,00 €", paid: "—" },
  { id: 6, client: "David García", date: "18 abr 2026", time: "15:00", status: "Completada", price: "100,00 €", paid: "Pagado" },
  { id: 7, client: "María López", date: "17 abr 2026", time: "10:00", status: "Completada", price: "90,00 €", paid: "Pagado" },
  { id: 8, client: "Pedro Jiménez", date: "16 abr 2026", time: "11:00", status: "Pendiente", price: "120,00 €", paid: "Pendiente" },
];

export function Sessions() {
  return (
    <div className="flex h-screen bg-[#f7f9fc] overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between shadow-sm z-10">
        <div>
          <div className="p-6">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Practitioner</h1>
          </div>
          <nav className="px-3 space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md font-medium text-sm transition-colors">
              <LayoutDashboard className="w-4 h-4" />
              Panel
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md font-medium text-sm transition-colors">
              <Users className="w-4 h-4" />
              Clientes
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-md font-medium text-sm transition-colors">
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
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sesiones</h2>
              <p className="text-sm text-slate-500 mt-1">Registra todas las sesiones con tus clientes</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <Plus className="w-4 h-4" />
              Nueva sesión
            </button>
          </header>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-lg border border-slate-200/60">
              <button className="px-3 py-1.5 text-sm font-medium bg-white text-slate-900 rounded-md shadow-sm border border-slate-200/50">Todas</button>
              <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md transition-colors">Pendiente</button>
              <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md transition-colors">Completada</button>
              <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md transition-colors">Cancelada</button>
            </div>
            <p className="text-sm font-medium text-slate-500">8 sesiones</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200 font-medium uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Fecha y Hora</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Importe</th>
                    <th className="px-6 py-4">Pago</th>
                    <th className="px-6 py-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900">{session.client}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {session.date} <span className="text-slate-400 mx-1">•</span> {session.time}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium tracking-wide uppercase ${
                          session.status === 'Completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' :
                          session.status === 'Pendiente' ? 'bg-amber-50 text-amber-700 border border-amber-100/50' :
                          'bg-slate-100 text-slate-700 border border-slate-200/50'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900">{session.price}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${
                          session.paid === 'Pagado' ? 'text-emerald-600 font-medium' :
                          session.paid === 'Pendiente' ? 'text-amber-600 font-medium' :
                          'text-slate-400'
                        }`}>
                          {session.paid}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
