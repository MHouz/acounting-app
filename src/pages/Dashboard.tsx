import React, { useEffect, useState } from 'react';
import { Users, UserCheck, TrendingUp, AlertCircle, CheckCircle2, Clock, Calendar, ChevronDown } from 'lucide-react';
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

const PRESETS = [
  "Aujourd'hui",
  "Hier",
  "7 derniers jours",
  "30 derniers jours",
  "90 derniers jours",
  "6 derniers mois",
  "Cette année"
];

const formatDateToYMD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  // Date Picker State
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    return {
      from: formatDateToYMD(from),
      to: formatDateToYMD(today)
    };
  });
  const [selectedPreset, setSelectedPreset] = useState("6 derniers mois");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(dateRange);
  const [tempPreset, setTempPreset] = useState(selectedPreset);
  const [clientServiceIds, setClientServiceIds] = useState<string[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const toggleDatePicker = () => {
    if (!showDatePicker) {
      setTempDateRange(dateRange);
      setTempPreset(selectedPreset);
    }
    setShowDatePicker(!showDatePicker);
  };

  const handlePresetClick = (preset: string) => {
    const today = new Date();
    let from = new Date();
    let to = new Date();
    
    switch (preset) {
      case "Aujourd'hui":
        break;
      case "Hier":
        from.setDate(today.getDate() - 1);
        to.setDate(today.getDate() - 1);
        break;
      case "7 derniers jours":
        from.setDate(today.getDate() - 6);
        break;
      case "30 derniers jours":
        from.setDate(today.getDate() - 29);
        break;
      case "90 derniers jours":
        from.setDate(today.getDate() - 89);
        break;
      case "6 derniers mois":
        from.setMonth(today.getMonth() - 5);
        from.setDate(1);
        break;
      case "Cette année":
        from = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        break;
    }
    
    setTempDateRange({
      from: formatDateToYMD(from),
      to: formatDateToYMD(to)
    });
    setTempPreset(preset);
  };

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    setTempDateRange(prev => ({ ...prev, [type]: value }));
    setTempPreset("Personnalisé");
  };

  const handleApply = () => {
    setDateRange(tempDateRange);
    setSelectedPreset(tempPreset);
    setShowDatePicker(false);
  };

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
        setClientServiceIds(csIds);
        
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
        const totalRevenue = clientServices.reduce((sum, cs) => sum + (Number(cs.price) || 0), 0);
        const totalPayments = allPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const remainingPayments = totalRevenue - totalPayments;
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const paidThisMonth = allPayments.reduce((sum, p) => {
          const pDate = new Date(p.payment_date);
          if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
            return sum + (Number(p.amount) || 0);
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

      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session]);

  // Chart Data Effect
  useEffect(() => {
    if (!session?.user?.id || clientServiceIds.length === 0) {
      setChartData([]);
      return;
    }
    
    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        const { data: pmts, error } = await supabase
          .from('payments')
          .select('amount, payment_date')
          .in('client_service_id', clientServiceIds)
          .gte('payment_date', dateRange.from)
          .lte('payment_date', dateRange.to)
          .order('payment_date', { ascending: true });
          
        if (error) throw error;
        
        const payments = pmts || [];
        
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 30) {
          // Group by day
          const grouped: Record<string, number> = {};
          
          for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            grouped[dateStr] = 0;
          }
          
          payments.forEach(p => {
            const dateStr = new Date(p.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            if (grouped[dateStr] !== undefined) {
              grouped[dateStr] += Number(p.amount) || 0;
            } else {
              grouped[dateStr] = Number(p.amount) || 0;
            }
          });
          
          setChartData(Object.entries(grouped).map(([name, revenue]) => ({ name, revenue })));
        } else {
          // Group by month
          const grouped: Record<string, number> = {};
          const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
          
          const startMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
          const endMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
          
          for (let d = new Date(startMonth); d <= endMonth; d.setMonth(d.getMonth() + 1)) {
            const monthStr = `${monthNames[d.getMonth()]} ${d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() : ''}`.trim();
            grouped[monthStr] = 0;
          }
          
          payments.forEach(p => {
            const pd = new Date(p.payment_date);
            const monthStr = `${monthNames[pd.getMonth()]} ${pd.getFullYear() !== new Date().getFullYear() ? pd.getFullYear() : ''}`.trim();
            if (grouped[monthStr] !== undefined) {
              grouped[monthStr] += Number(p.amount) || 0;
            } else {
              grouped[monthStr] = Number(p.amount) || 0;
            }
          });
          
          setChartData(Object.entries(grouped).map(([name, revenue]) => ({ name, revenue })));
        }
      } catch (err) {
        console.error('Error fetching chart data', err);
      } finally {
        setChartLoading(false);
      }
    };
    
    fetchChartData();
  }, [clientServiceIds, dateRange, session]);

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
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
            <h3 className="text-lg font-bold text-white">Évolution des revenus ({selectedPreset})</h3>
            <div className="relative">
              <button 
                onClick={toggleDatePicker}
                className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-slate-600"
              >
                <Calendar className="w-4 h-4" />
                <span>{selectedPreset === "Personnalisé" ? `${dateRange.from} au ${dateRange.to}` : selectedPreset}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
              </button>

              {showDatePicker && (
                <div className="absolute right-0 mt-2 w-[320px] sm:w-[500px] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
                  <div className="flex flex-col sm:flex-row border-b border-slate-700">
                    {/* Left Side: Presets */}
                    <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-700 p-2 bg-slate-800/50 max-h-48 sm:max-h-none overflow-y-auto">
                      {PRESETS.map(preset => (
                        <button
                          key={preset}
                          onClick={() => handlePresetClick(preset)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                            tempPreset === preset 
                              ? 'bg-blue-500 text-white font-medium' 
                              : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    {/* Right Side: Date Inputs */}
                    <div className="w-full sm:w-2/3 p-6 flex flex-col justify-center space-y-6">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Du</label>
                        <input 
                          type="date" 
                          value={tempDateRange.from}
                          onChange={(e) => handleDateChange('from', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Au</label>
                        <input 
                          type="date" 
                          value={tempDateRange.to}
                          onChange={(e) => handleDateChange('to', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Bottom: Actions */}
                  <div className="p-4 bg-slate-900 flex justify-end space-x-3">
                    <button 
                      onClick={() => setShowDatePicker(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={handleApply}
                      className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="h-72 w-full relative">
            {chartLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 z-10 rounded-xl">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
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
                      {Number(payment.amount).toLocaleString()} MAD
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
