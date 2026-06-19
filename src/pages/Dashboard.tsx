import React from 'react';
import { Users, UserCheck, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { name: 'Jan', revenue: 0 },
  { name: 'Fév', revenue: 0 },
  { name: 'Mar', revenue: 0 },
  { name: 'Avr', revenue: 0 },
  { name: 'Mai', revenue: 0 },
  { name: 'Juin', revenue: 0 },
];

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: string | number, icon: any, colorClass: string }) => (
  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-slate-400 font-medium">{title}</h3>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
  </div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Tableau de bord</h2>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Clients" 
          value="0" 
          icon={Users} 
          colorClass="bg-blue-500/10 text-blue-500" 
        />
        <StatCard 
          title="Clients Actifs" 
          value="0" 
          icon={UserCheck} 
          colorClass="bg-emerald-500/10 text-emerald-500" 
        />
        <StatCard 
          title="Chiffre d'affaires total" 
          value="0 €" 
          icon={TrendingUp} 
          colorClass="bg-purple-500/10 text-purple-500" 
        />
        <StatCard 
          title="Paiements restants" 
          value="0 €" 
          icon={AlertCircle} 
          colorClass="bg-orange-500/10 text-orange-500" 
        />
        <StatCard 
          title="Payé ce mois" 
          value="0 €" 
          icon={CheckCircle2} 
          colorClass="bg-teal-500/10 text-teal-500" 
        />
        <StatCard 
          title="Factures en attente" 
          value="0" 
          icon={Clock} 
          colorClass="bg-rose-500/10 text-rose-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Line Chart Panel */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-6">Évolution des revenus (6 derniers mois)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={(value) => `${value}€`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outstanding Balances Panel */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6">Paiements en attente</h3>
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
            <AlertCircle className="w-12 h-12 mb-4 text-slate-600" />
            <p>Aucun paiement en attente</p>
          </div>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mt-8">
        <h3 className="text-lg font-bold text-white mb-6">Paiements récents</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="pb-4 font-medium">Client</th>
                <th className="pb-4 font-medium">Service</th>
                <th className="pb-4 font-medium">Montant</th>
                <th className="pb-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500">
                  Aucun paiement
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
