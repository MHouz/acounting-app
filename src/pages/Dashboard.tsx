import React, { useEffect, useState } from 'react';
import { Users, UserCheck, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string;
  client_service_id: string;
  client_services: {
    service_id: string;
    services: {
      name: string;
    } | null;
    client_id: string;
    clients: {
      name: string;
    } | null;
  } | null;
};

const Dashboard: React.FC = () => {
  const { session } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalRevenue: 0,
    remainingPayments: 0,
    paidThisMonth: 0,
    pendingInvoices: 0
  });
  
  const [recentPayments, setRecentPayments] = useState<PaymentRow[]>([]);
  const [chartData, setChartData] = useState<{name: string, revenue: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    
    const fetchDashboardData = async () => {
      try {
        const accountantId = session.user.id;

        // Fetch Clients
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('accountant_id', accountantId);

        if (clientsError) throw clientsError;

        // Fetch Services
        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select('id')
          .eq('accountant_id', accountantId);
          
        if (servicesError) throw servicesError;
        const serviceIds = services?.map(s => s.id) || [];

        // Fetch Client Services
        let clientServices: any[] = [];
        if (serviceIds.length > 0) {
          const { data: cs, error: csError } = await supabase
            .from('client_services')
            .select('id, price, status')
            .in('service_id', serviceIds);
            
          if (csError) throw csError;
          clientServices = cs || [];
        }
        
        // Fetch Payments
        let allPayments: any[] = [];
        const csIds = clientServices.map(cs => cs.id);
        
        if (csIds.length > 0) {
          const { data: pmts, error: pmtsError } = await supabase
            .from('payments')
            .select(`
              id,
              amount,
              payment_date,
              client_service_id,
              client_services (
                service_id,
                services (
                  name
                ),
                client_id,
                clients (
                  name
                )
              )
            `)
            .in('client_service_id', csIds)
            .order('payment_date', { ascending: false });
            
          if (pmtsError) throw pmtsError;
          allPayments = pmts || [];
          setRecentPayments(allPayments.slice(0, 5));
        }

        // Calculate Stats
        const totalRevenue = clientServices.reduce((sum, cs) => sum + (cs.price || 0), 0);
        const totalPayments = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const remainingPayments = totalRevenue - totalPayments;
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const paidThisMonth = allPayments.reduce((sum, p) => {
          const pDate = new Date(p.payment_date);
          if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
            return sum + (p.amount || 0);
          }
          return sum;
        }, 0);
        
        const pendingInvoices = clientServices.filter(cs => cs.status !== 'paid').length;

        setStats({
          totalClients: clients?.length || 0,
          activeClients: clients?.filter(c => c.status === 'active').length || 0,
          totalRevenue,
          remainingPayments: remainingPayments > 0 ? remainingPayments : 0,
          paidThisMonth,
          pendingInvoices
        });
        
        // Prepare Chart Data (Last 6 months)
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const last6Months: { monthIndex: number, year: number, name: string, revenue: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          last6Months.push({
            monthIndex: d.getMonth(),
            year: d.getFullYear(),
            name: monthNames[d.getMonth()],
            revenue: 0
          });
        }
        
        allPayments.forEach(p => {
          const pDate = new Date(p.payment_date);
          const monthIdx = pDate.getMonth();
          const year = pDate.getFullYear();
          
          const monthData = last6Months.find(m => m.monthIndex === monthIdx && m.year === year);
          if (monthData) {
            monthData.revenue += Number(p.amount) || 0;
          }
        });
        
        setChartData(last6Months.map(m => ({ name: m.name, revenue: m.revenue })));

      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Tableau de bord</h2>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Clients" 
          value={stats.totalClients} 
          icon={Users} 
          colorClass="bg-blue-500/10 text-blue-500" 
        />
        <StatCard 
          title="Clients Actifs" 
          value={stats.activeClients} 
          icon={UserCheck} 
          colorClass="bg-emerald-500/10 text-emerald-500" 
        />
        <StatCard 
          title="Chiffre d'affaires total" 
          value={`${stats.totalRevenue.toLocaleString()} MAD`} 
          icon={TrendingUp} 
          colorClass="bg-purple-500/10 text-purple-500" 
        />
        <StatCard 
          title="Paiements restants" 
          value={`${stats.remainingPayments.toLocaleString()} MAD`} 
          icon={AlertCircle} 
          colorClass="bg-orange-500/10 text-orange-500" 
        />
        <StatCard 
          title="Payé ce mois" 
          value={`${stats.paidThisMonth.toLocaleString()} MAD`} 
          icon={CheckCircle2} 
          colorClass="bg-teal-500/10 text-teal-500" 
        />
        <StatCard 
          title="Factures en attente" 
          value={stats.pendingInvoices} 
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
                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={(value) => `${value} MAD`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value) => [`${value} MAD`, 'Revenus']}
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
            {stats.remainingPayments > 0 ? (
               <div className="text-center">
                  <AlertCircle className="w-12 h-12 mb-4 text-orange-500 mx-auto" />
                  <p className="text-white text-xl font-bold">{stats.remainingPayments.toLocaleString()} MAD</p>
                  <p className="text-sm mt-2">restant à percevoir</p>
               </div>
            ) : (
              <>
                <CheckCircle2 className="w-12 h-12 mb-4 text-emerald-500" />
                <p>Aucun paiement en attente</p>
              </>
            )}
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
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    Aucun paiement
                  </td>
                </tr>
              ) : (
                recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-700/50 text-white hover:bg-slate-700/30">
                    <td className="py-4">
                      {/* @ts-ignore */}
                      {payment.client_services?.clients?.name || 'Client inconnu'}
                    </td>
                    <td className="py-4">
                      {/* @ts-ignore */}
                      {payment.client_services?.services?.name || 'Service inconnu'}
                    </td>
                    <td className="py-4 font-medium text-emerald-400">
                      {payment.amount.toLocaleString()} MAD
                    </td>
                    <td className="py-4 text-slate-300">
                      {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
