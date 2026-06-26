import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, DollarSign, Building, Phone, Mail, MapPin, X, Bell, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type ClientServiceRow = Database['public']['Tables']['client_services']['Row'] & {
  services: { name: string } | null;
  payments: { amount: number }[];
};

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  
  const [client, setClient] = useState<Client | null>(null);
  const [clientServices, setClientServices] = useState<ClientServiceRow[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  
  // Notification state
  const [newNotificationTimer, setNewNotificationTimer] = useState('1');
  
  // Assign Service state
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [customPriceHt, setCustomPriceHt] = useState('');
  const [hasTva, setHasTva] = useState(false);
  const [tvaRate, setTvaRate] = useState('20');
  
  // Log Payment state
  const [selectedClientServiceId, setSelectedClientServiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('virement');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const [submitting, setSubmitting] = useState(false);

  const fetchClientData = async () => {
    if (!id || !session?.user?.id) return;
    try {
      // Get client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('accountant_id', session.user.id)
        .single();
        
      if (clientError) throw clientError;
      setClient(clientData);
      setNewNotificationTimer((clientData.notification_timer || 1).toString());

      // Get assigned services with payments
      const { data: servicesData, error: servicesError } = await supabase
        .from('client_services')
        .select(`
          *,
          services (name),
          payments (amount)
        `)
        .eq('client_id', id);

      if (servicesError) throw servicesError;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setClientServices((servicesData as any) || []);
      
    } catch (err: unknown) {
      console.error('Error fetching client data:', err);
      toast.error('Erreur lors du chargement des données: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableServices = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('accountant_id', session.user.id)
        .order('name');
        
      if (error) throw error;
      setAvailableServices(data || []);
    } catch (err: unknown) {
      console.error('Error fetching services:', err);
      toast.error('Erreur lors du chargement des services: ' + (err as Error).message);
    }
  };

  useEffect(() => {
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchClientData();
      fetchAvailableServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session?.user?.id]);

  const handleAssignService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedServiceId) return;
    
    setSubmitting(true);
    try {
      const ht = parseFloat(customPriceHt) || 0;
      const rate = parseFloat(tvaRate) || 0;
      const ttc = hasTva ? ht * (1 + rate / 100) : ht;

      const { error } = await supabase
        .from('client_services')
        .insert({
          client_id: id,
          service_id: selectedServiceId || null,
          custom_name: customServiceName || null,
          price: ttc,
          has_tva: hasTva,
          tva_rate: hasTva ? rate : null,
          status: 'pending'
        });

      if (error) throw error;
      
      setIsServiceModalOpen(false);
      setSelectedServiceId('');
      setCustomServiceName('');
      setCustomPriceHt('');
      setHasTva(false);
      setTvaRate('20');
      await fetchClientData();
    } catch (err: unknown) {
      console.error('Error assigning service:', err);
      toast.error('Erreur lors de l\'assignation du service: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateNotificationTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ notification_timer: parseInt(newNotificationTimer) || 1 })
        .eq('id', id);

      if (error) throw error;
      
      await fetchClientData();
      setIsNotificationModalOpen(false);
      toast.success('Délai de notification mis à jour');
    } catch (err: unknown) {
      console.error('Error updating notification timer:', err);
      toast.error('Erreur: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientServiceId || !paymentAmount) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          client_service_id: selectedClientServiceId,
          amount: parseFloat(paymentAmount),
          method: paymentMethod,
          notes: paymentNotes || null,
          payment_date: paymentDate
        });

      if (error) throw error;

      // Update client_service status based on total paid vs price
      const cs = clientServices.find(c => c.id === selectedClientServiceId);
      if (cs) {
        const totalPaidPreviously = cs.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const newTotalPaid = totalPaidPreviously + parseFloat(paymentAmount);
        
        if (newTotalPaid >= cs.price) {
          await supabase
            .from('client_services')
            .update({ status: 'paid' })
            .eq('id', selectedClientServiceId);
        } else if (cs.status === 'pending') {
          await supabase
            .from('client_services')
            .update({ status: 'partial' })
            .eq('id', selectedClientServiceId);
        }
      }

      setIsPaymentModalOpen(false);
      setSelectedClientServiceId('');
      setPaymentAmount('');
      setPaymentNotes('');
      await fetchClientData();
    } catch (err: unknown) {
      console.error('Error logging payment:', err);
      toast.error('Erreur lors de l\'enregistrement du paiement: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedServiceId(sId);
    const service = availableServices.find(s => s.id === sId);
    if (service) {
      setCustomPriceHt(service.default_price.toString());
      setHasTva(service.has_tva);
      setTvaRate((service.tva_rate || 20).toString());
      setCustomServiceName(service.name);
    } else {
      setCustomPriceHt('');
      setHasTva(false);
      setTvaRate('20');
      setCustomServiceName('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!client) {
    return <div className="text-foreground">Client introuvable</div>;
  }

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/clients')}
        className="flex items-center text-muted-foreground hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour aux clients
      </button>

      {/* Client Header Info */}
      <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">{client.name}</h2>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <span className={`px-2 py-1 rounded text-xs ${
                client.status === 'active' 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'bg-slate-600/20 text-muted-foreground'
              }`}>
                {client.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsServiceModalOpen(true)}
              className="bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg flex items-center transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Assigner un service
            </button>
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-lg flex items-center transition-colors"
            >
              <DollarSign className="w-5 h-5 mr-2" />
              Nouveau paiement
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {client.company && (
            <div className="flex items-center text-muted-foreground">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
                <Building className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Entreprise</div>
                <div className="font-medium">{client.company}</div>
              </div>
            </div>
          )}
          {client.email && (
            <div className="flex items-center text-muted-foreground">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="font-medium">{client.email}</div>
              </div>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center text-muted-foreground">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Téléphone</div>
                <div className="font-medium">{client.phone}</div>
              </div>
            </div>
          )}
          {client.address && (
            <div className="flex items-center text-muted-foreground">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Adresse</div>
                <div className="font-medium">{client.address}</div>
              </div>
            </div>
          )}
          {client.notification_timer && (
            <div className="flex items-center text-muted-foreground">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Délai de notification</div>
                <div className="font-medium flex items-center">
                  {client.notification_timer} mois
                  <button onClick={() => setIsNotificationModalOpen(true)} className="ml-2 text-blue-500 hover:text-blue-400 p-1" title="Modifier le délai">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Services List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden mt-8">
        <div className="p-6 border-b border-border">
          <h3 className="text-xl font-bold text-foreground">Services & Paiements</h3>
        </div>
        
        {clientServices.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Aucun service assigné à ce client.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-foreground">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Service</th>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Date d'assignation</th>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Prix total</th>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Montant payé</th>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Reste à payer</th>
                  <th className="p-4 font-medium text-muted-foreground border-b border-border">Statut</th>
                </tr>
              </thead>
              <tbody>
                {clientServices.map(cs => {
                  const totalPaid = cs.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                  const remaining = cs.price - totalPaid;
                  
                  return (
                    <tr key={cs.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="p-4 font-medium">{cs.custom_name || cs.services?.name || 'Service sur mesure'}</td>
                      <td className="p-4 text-muted-foreground">
                        {cs.created_at ? new Date(cs.created_at).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="p-4 font-medium text-blue-400">{Number(cs.price).toLocaleString()} MAD</td>
                      <td className="p-4 text-emerald-400">{totalPaid.toLocaleString()} MAD</td>
                      <td className="p-4 text-orange-400">{remaining > 0 ? remaining.toLocaleString() : 0} MAD</td>
                      <td className="p-4">
                        {cs.status === 'paid' ? (
                          <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-sm">Payé</span>
                        ) : cs.status === 'partial' ? (
                          <span className="bg-orange-500/10 text-orange-400 px-2 py-1 rounded text-sm">Partiel</span>
                        ) : (
                          <span className="bg-slate-600/20 text-muted-foreground px-2 py-1 rounded text-sm">En attente</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Assign Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md max-h-[90vh] flex flex-col relative">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h3 className="text-xl font-bold text-foreground">Assigner un service</h3>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-muted-foreground hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleAssignService} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Service du catalogue (Optionnel)</label>
                <select 
                  value={selectedServiceId}
                  onChange={handleServiceSelect}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
                >
                  <option value="">Nouveau service sur mesure (Aucun modèle)</option>
                  {availableServices.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Nom du service</label>
                <input 
                  type="text" 
                  required
                  value={customServiceName}
                  onChange={e => setCustomServiceName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Tenue de comptabilité mensuelle"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Prix personnalisé HT (MAD)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  value={customPriceHt}
                  onChange={e => setCustomPriceHt(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="hasTva"
                  checked={hasTva}
                  onChange={e => setHasTva(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-background text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <label htmlFor="hasTva" className="text-sm font-medium text-muted-foreground">
                  Appliquer la TVA
                </label>
              </div>

              {hasTva && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Taux de TVA (%)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={tvaRate}
                    onChange={e => setTvaRate(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Show calculated TTC */}
              {customPriceHt && (
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Prix HT :</span>
                    <span>{Number(customPriceHt).toLocaleString()} MAD</span>
                  </div>
                  {hasTva && (
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>TVA ({tvaRate}%) :</span>
                      <span>{(Number(customPriceHt) * (Number(tvaRate) / 100)).toLocaleString()} MAD</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
                    <span>Total TTC :</span>
                    <span>{(hasTva ? Number(customPriceHt) * (1 + Number(tvaRate) / 100) : Number(customPriceHt)).toLocaleString()} MAD</span>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !customServiceName}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Assignation...' : 'Assigner'}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Log Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md max-h-[90vh] flex flex-col relative">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h3 className="text-xl font-bold text-foreground">Nouveau paiement</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-muted-foreground hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleLogPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Service concerné</label>
                <select 
                  required
                  value={selectedClientServiceId}
                  onChange={e => setSelectedClientServiceId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
                >
                  <option value="">Sélectionnez un service...</option>
                  {clientServices.filter(cs => cs.status !== 'paid').map(cs => {
                    const totalPaid = cs.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                    const remaining = cs.price - totalPaid;
                    return (
                      <option key={cs.id} value={cs.id}>
                        {cs.custom_name || cs.services?.name || 'Service sur mesure'} (Reste: {remaining.toLocaleString()} MAD)
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Montant (MAD)</label>
                <input 
                  type="number" 
                  required
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Date du paiement</label>
                <input 
                  type="date" 
                  required
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Méthode</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
                >
                  <option value="virement">Virement bancaire</option>
                  <option value="espece">Espèces</option>
                  <option value="cheque">Chèque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Notes (Optionnel)</label>
                <textarea 
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
                  rows={2}
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedClientServiceId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Notification Timer Modal */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm max-h-[90vh] flex flex-col relative">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h3 className="text-xl font-bold text-foreground">Modifier le délai</h3>
              <button onClick={() => setIsNotificationModalOpen(false)} className="text-muted-foreground hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleUpdateNotificationTimer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Délai de notification (mois)</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={newNotificationTimer}
                    onChange={e => setNewNotificationTimer(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="pt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsNotificationModalOpen(false)}
                    className="px-4 py-2 text-muted-foreground hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
