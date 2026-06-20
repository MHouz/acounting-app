import React, { useState, useEffect } from 'react';
import { Download, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateReceipt } from '../lib/pdfGenerator';
import type { Database } from '../lib/database.types';

type PaymentRow = Database['public']['Tables']['payments']['Row'] & {
  client_services: {
    service_id: string;
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
  const [accountantName, setAccountantName] = useState('');
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    fetchPayments();
    fetchAccountantProfile();
  }, [session]);

  const fetchAccountantProfile = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('accountants')
        .select('full_name, business_name')
        .eq('id', session.user.id)
        .single();
      
      if (data) {
        setAccountantName(data.full_name || 'Comptable');
        setBusinessName(data.business_name || '');
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
            service_id,
            services (name),
            client_id,
            clients!inner (name, company, accountant_id)
          )
        `)
        .eq('client_services.clients.accountant_id', session.user.id)
        .order('payment_date', { ascending: false });
        
      if (error) throw error;
      setPayments((data as any) || []);
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      alert('Erreur lors du chargement des paiements: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = (payment: PaymentRow) => {
    generateReceipt({
      receiptNumber: payment.receipt_number || payment.id.substring(0, 8).toUpperCase(),
      paymentDate: payment.payment_date,
      amount: payment.amount,
      method: payment.method || 'virement',
      // @ts-ignore
      clientName: payment.client_services?.clients?.name || 'Client',
      // @ts-ignore
      companyName: payment.client_services?.clients?.company || undefined,
      // @ts-ignore
      serviceName: payment.client_services?.services?.name || 'Service',
      accountantName,
      businessName
    });
  };

  const filteredPayments = payments.filter(p => {
    // @ts-ignore
    const clientName = p.client_services?.clients?.name?.toLowerCase() || '';
    // @ts-ignore
    const serviceName = p.client_services?.services?.name?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return clientName.includes(search) || serviceName.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold text-white">Historique des paiements</h2>
        
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Rechercher (client, service)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {searchTerm ? 'Aucun paiement ne correspond à votre recherche.' : 'Aucun paiement enregistré.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-white">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="p-4 font-medium text-slate-400 border-b border-slate-700">Client</th>
                  <th className="p-4 font-medium text-slate-400 border-b border-slate-700">Service</th>
                  <th className="p-4 font-medium text-slate-400 border-b border-slate-700">Montant</th>
                  <th className="p-4 font-medium text-slate-400 border-b border-slate-700">Date</th>
                  <th className="p-4 font-medium text-slate-400 border-b border-slate-700">Méthode</th>
                  <th className="p-4 font-medium text-slate-400 border-b border-slate-700 text-right">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(payment => (
                  <tr key={payment.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-4 font-medium">
                      {/* @ts-ignore */}
                      {payment.client_services?.clients?.name || '-'}
                    </td>
                    <td className="p-4 text-slate-300">
                      {/* @ts-ignore */}
                      {payment.client_services?.services?.name || '-'}
                    </td>
                    <td className="p-4 font-medium text-emerald-400">
                      {Number(payment.amount).toLocaleString()} MAD
                    </td>
                    <td className="p-4 text-slate-300">
                      {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-700 px-2 py-1 rounded text-sm text-slate-300 capitalize">
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
