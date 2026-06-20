import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Service = Database['public']['Tables']['services']['Row'];

const Services: React.FC = () => {
  const { session } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [hasTva, setHasTva] = useState(false);
  const [tvaRate, setTvaRate] = useState('20');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [session]);

  const fetchServices = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('accountant_id', session.user.id)
        .order('name');
      
      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setName(service.name);
      setDefaultPrice(service.default_price.toString());
      setHasTva(service.has_tva);
      setTvaRate(service.tva_rate.toString());
    } else {
      setEditingService(null);
      setName('');
      setDefaultPrice('');
      setHasTva(false);
      setTvaRate('20');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    
    setSubmitting(true);
    try {
      const payload = {
        name,
        default_price: parseFloat(defaultPrice),
        has_tva: hasTva,
        tva_rate: hasTva ? parseFloat(tvaRate) : 0,
        accountant_id: session.user.id
      };

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('services')
          .insert(payload);
        if (error) throw error;
      }

      await fetchServices();
      closeModal();
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) return;
    
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
        
      if (error) {
        if (error.code === '23503') {
           alert('Impossible de supprimer ce service car il est assigné à des clients.');
        } else {
           throw error;
        }
        return;
      }
      
      setServices(services.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting service:', err);
      alert('Erreur lors de la suppression.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Catalogue des Services</h2>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau Service
        </button>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Aucun service dans le catalogue. Cliquez sur "Nouveau Service" pour commencer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-white">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="p-4 font-medium text-slate-400 border-b border-slate-700">Nom du Service</th>
                  <th className="p-4 font-medium text-slate-400 border-b border-slate-700">Prix par défaut</th>
                  <th className="p-4 font-medium text-slate-400 border-b border-slate-700">TVA</th>
                  <th className="p-4 font-medium text-slate-400 border-b border-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(service => (
                  <tr key={service.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-4 font-medium">{service.name}</td>
                    <td className="p-4">{service.default_price.toLocaleString()} MAD</td>
                    <td className="p-4">
                      {service.has_tva ? (
                        <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-sm">
                          {service.tva_rate}%
                        </span>
                      ) : (
                        <span className="bg-slate-600/20 text-slate-400 px-2 py-1 rounded text-sm">
                          Sans TVA
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openModal(service)}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(service.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors ml-2"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {editingService ? 'Modifier le service' : 'Nouveau service'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nom du service</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="ex: Tenue de comptabilité"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Prix par défaut (MAD)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  value={defaultPrice}
                  onChange={e => setDefaultPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="ex: 1500"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input 
                  type="checkbox"
                  id="hasTva"
                  checked={hasTva}
                  onChange={e => setHasTva(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <label htmlFor="hasTva" className="text-sm font-medium text-slate-300">
                  Appliquer la TVA
                </label>
              </div>

              {hasTva && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Taux de TVA (%)</label>
                  <select
                    value={tvaRate}
                    onChange={e => setTvaRate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="20">20%</option>
                    <option value="10">10%</option>
                    <option value="7">7%</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
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
      )}
    </div>
  );
};

export default Services;
