import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Download, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateReceipt } from '../lib/pdfGenerator';
import { generateIncomeReport } from '../lib/pdfReportGenerator';
import type { Database } from '../lib/database.types';

type PaymentRow = Database['public']['Tables']['payments']['Row'] & {
  client_services: {
    custom_name?: string | null;
    service_id: string | null;
    services: {
      name: string;
    } | null;
    client_id: string;
    clients: {
      name: string;
      company: string | null;
    } | null;
  } | null;
};

const Payments: React.FC = () => {
  const { session } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportPeriod, setExportPeriod] = useState('tout');
  
  // TODO: Hardcoded accountant details for PDF receipt generation
  // Replace these later when missing columns (like phone) are added to the database
  const accountantName = "Ali Alaoui";
  const businessName = "Cabinet Ali Alaoui Comptabilité";
  const accountantEmail = "contact@alialaoui.ma";
  const accountantPhone = "+212 661-225797";

  const fetchAccountantProfile = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('accountants')
        .select('full_name, business_name, email')
        .eq('id', session.user.id)
        .single();
      
      if (data) {
        // Values are currently hardcoded above for PDF generation
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchPayments = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          client_services!inner (
            custom_name,
            service_id,
            services (name),
            client_id,
            clients!inner (name, company, accountant_id)
          )
        `)
        .eq('client_services.clients.accountant_id', session.user.id)
        .order('payment_date', { ascending: false });
        
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPayments((data as any) || []);
    } catch (err: unknown) {
      console.error('Error fetching payments:', err);
      toast.error('Erreur lors du chargement des paiements: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPayments();
    fetchAccountantProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const handleDownloadReceipt = (payment: PaymentRow) => {
    console.log('STEP 1 - Button clicked (handleDownloadReceipt)');
    generateReceipt({
      receiptNumber: payment.receipt_number || payment.id.substring(0, 8).toUpperCase(),
      paymentDate: payment.payment_date,
      amount: payment.amount,
      method: payment.method || 'virement',

      clientName: payment.client_services?.clients?.name || 'Client',

      companyName: payment.client_services?.clients?.company || undefined,

      serviceName: payment.client_services?.custom_name || payment.client_services?.services?.name || 'Service sur mesure',
      accountantName,
      businessName,
      accountantEmail,
      accountantPhone
    });
  };

  const handleExportPDF = async () => {
    console.log('STEP 1 - Button clicked (handleExportPDF)');
    try {
      const now = new Date();
      let filteredForExport = [...payments];
      let periodLabel = "Tout";

      if (exportPeriod === 'semaine') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredForExport = payments.filter(p => new Date(p.payment_date) >= lastWeek);
        periodLabel = "7 derniers jours";
      } else if (exportPeriod === 'mois') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filteredForExport = payments.filter(p => new Date(p.payment_date) >= lastMonth);
        periodLabel = "30 derniers jours";
      } else if (exportPeriod === 'annee') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        filteredForExport = payments.filter(p => new Date(p.payment_date) >= startOfYear);
        periodLabel = "Cette année";
      }

      const paymentsList = filteredForExport.map(p => ({
        date: p.payment_date,
        clientName: p.client_services?.clients?.name || 'Client',
        serviceName: p.client_services?.custom_name || p.client_services?.services?.name || 'Service sur mesure',
        amount: Number(p.amount),
        method: p.method || 'non spécifié'
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const totalIncome = paymentsList.reduce((sum, p) => sum + p.amount, 0);

      await generateIncomeReport({
        periodLabel,
        totalIncome,
        pendingIncome: 0, // Since this is a payments view, pending isn't directly calculated here
        payments: paymentsList
      });
      toast.success('Rapport PDF généré avec succès');
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'exportation : " + e.message);
    }
  };

  const filteredPayments = payments.filter(p => {
    const clientName = p.client_services?.clients?.name?.toLowerCase() || '';
    const serviceName = (p.client_services?.custom_name || p.client_services?.services?.name || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return clientName.includes(search) || serviceName.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold text-foreground">Historique des paiements</h2>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={exportPeriod}
              onChange={(e) => setExportPeriod(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500"
            >
              <option value="tout">Tous les paiements</option>
              <option value="semaine">7 derniers jours</option>
              <option value="mois">30 derniers jours</option>
              <option value="annee">Cette année</option>
            </select>
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Exporter PDF</span>
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Rechercher (client, service)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
            />
            <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {searchTerm ? 'Aucun paiement ne correspond à votre recherche.' : 'Aucun paiement enregistré.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-foreground">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Client</th>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Service</th>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Montant</th>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Date</th>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Méthode</th>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border text-right">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(payment => (
                  <tr key={payment.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-4 font-medium">

                      {payment.client_services?.clients?.name || '-'}
                    </td>
                    <td className="p-4 text-muted-foreground">

                      {payment.client_services?.custom_name || payment.client_services?.services?.name || 'Service sur mesure'}
                    </td>
                    <td className="p-4 font-medium text-emerald-400">
                      {Number(payment.amount).toLocaleString()} MAD
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-4">
                      <span className="bg-muted px-2 py-1 rounded text-sm text-muted-foreground capitalize">
                        {payment.method === 'espece' ? 'Espèces' : payment.method}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDownloadReceipt(payment)}
                        className="bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg flex items-center justify-end ml-auto transition-colors"
                        title="Télécharger le reçu"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
