import React from "react";
import { LayoutDashboard, Users, Calendar, LogOut, Search, Plus, Trash2, MoreHorizontal } from "lucide-react";

const clients = [
  { id: 1, name: "María López", initials: "ML", color: "bg-pink-100 text-pink-700", phone: "+34 612 345 678", sessions: 12, lastSession: "18 abr 2026" },
  { id: 2, name: "Carlos Ruiz", initials: "CR", color: "bg-blue-100 text-blue-700", phone: "+34 623 456 789", sessions: 8, lastSession: "20 abr 2026" },
  { id: 3, name: "Sofia Martínez", initials: "SM", color: "bg-emerald-100 text-emerald-700", phone: "+34 634 567 890", sessions: 5, lastSession: "15 abr 2026" },
  { id: 4, name: "David García", initials: "DG", color: "bg-amber-100 text-amber-700", phone: "+34 645 678 901", sessions: 3, lastSession: "10 abr 2026" },
  { id: 5, name: "Laura Sánchez", initials: "LS", color: "bg-purple-100 text-purple-700", phone: "—", sessions: 1, lastSession: "5 abr 2026" },
  { id: 6, name: "Pedro Jiménez", initials: "PJ", color: "bg-indigo-100 text-indigo-700", phone: "+34 667 890 123", sessions: 7, lastSession: "22 abr 2026" },
];

export function Clients() {
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
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-md font-medium text-sm transition-colors">
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
          <header className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Clientes</h2>
              <p className="text-sm text-slate-500 mt-1">Gestiona tu lista de clientes</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <Plus className="w-4 h-4" />
              Añadir cliente
            </button>
          </header>

          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o teléfono..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 text-slate-900"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200 font-medium uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4">Sesiones</th>
                    <th className="px-6 py-4">Última sesión</th>
                    <th className="px-6 py-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs ${client.color}`}>
                            {client.initials}
                          </div>
                          <span className="font-medium text-slate-900">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{client.phone}</td>
                      <td className="px-6 py-4 text-slate-600">{client.sessions} {client.sessions === 1 ? 'sesión' : 'sesiones'}</td>
                      <td className="px-6 py-4 text-slate-600">{client.lastSession}</td>
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
