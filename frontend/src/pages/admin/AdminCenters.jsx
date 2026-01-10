import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, Building2, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminCenters = () => {
  const { getAuthHeaders } = useAuth();
  const [centers, setCenters] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    area: '',
    address: '',
    contact_phone: '',
    contact_email: '',
    google_maps_link: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [centersRes, citiesRes] = await Promise.all([
        axios.get(`${API}/centers`, { headers: getAuthHeaders() }),
        axios.get(`${API}/cities`, { headers: getAuthHeaders() })
      ]);
      setCenters(centersRes.data);
      setCities(citiesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.city || !formData.area || !formData.contact_phone) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingCenter) {
        await axios.patch(`${API}/centers/${editingCenter.id}`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Center updated successfully');
      } else {
        await axios.post(`${API}/centers`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Center added successfully');
      }
      setShowForm(false);
      setEditingCenter(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save center');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this center?')) return;
    try {
      await axios.delete(`${API}/centers/${id}`, {
        headers: getAuthHeaders()
      });
      toast.success('Center deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete center');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      city: '',
      area: '',
      address: '',
      contact_phone: '',
      contact_email: '',
      google_maps_link: '',
      is_active: true
    });
  };

  const openEditForm = (center) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      city: center.city,
      area: center.area,
      address: center.address,
      contact_phone: center.contact_phone,
      contact_email: center.contact_email || '',
      google_maps_link: center.google_maps_link || '',
      is_active: center.is_active
    });
    setShowForm(true);
  };

  // Group centers by city
  const centersByCity = centers.reduce((acc, center) => {
    if (!acc[center.city]) acc[center.city] = [];
    acc[center.city].push(center);
    return acc;
  }, {});

  return (
    <AdminLayout title="OLL Centers">
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-500">{centers.length} centers across {Object.keys(centersByCity).length} cities</p>
        <Button 
          onClick={() => {
            resetForm();
            setEditingCenter(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
          data-testid="add-center-btn"
        >
          <Plus className="w-4 h-4" /> Add Center
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : centers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No centers added yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(centersByCity).map(([city, cityCenters]) => (
            <div key={city} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="bg-[#1E3A5F] text-white px-6 py-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span className="font-semibold">{city}</span>
                <span className="text-white/70 text-sm">({cityCenters.length} centers)</span>
              </div>
              <div className="divide-y">
                {cityCenters.map(center => (
                  <div key={center.id} className="p-6 hover:bg-slate-50" data-testid={`center-${center.id}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-[#1E3A5F] text-lg">{center.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            center.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {center.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[#D63031] font-medium text-sm mb-2">{center.area}</p>
                        <p className="text-slate-600 text-sm mb-3">{center.address}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Phone className="w-4 h-4" /> {center.contact_phone}
                          </span>
                          {center.contact_email && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Mail className="w-4 h-4" /> {center.contact_email}
                            </span>
                          )}
                          {center.google_maps_link && (
                            <a 
                              href={center.google_maps_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" /> View on Map
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditForm(center)}
                          data-testid={`edit-center-${center.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(center.id)}
                          className="text-red-500 hover:text-red-700"
                          data-testid={`delete-center-${center.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Center Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCenter ? 'Edit Center' : 'Add New Center'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Center Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., OLL Learning Center"
                data-testid="center-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City *</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="center-city"
                >
                  <option value="">Select City</option>
                  {cities.filter(c => c.is_active).map(city => (
                    <option key={city.id} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Area *</label>
                <Input
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                  placeholder="e.g., Andheri West"
                  data-testid="center-area"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Address *</label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Complete address with landmark..."
                className="min-h-[80px]"
                data-testid="center-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contact Phone *</label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  placeholder="e.g., +91 9876543210"
                  data-testid="center-phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contact Email</label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  placeholder="e.g., center@oll.co"
                  data-testid="center-email"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Google Maps Link</label>
              <Input
                value={formData.google_maps_link}
                onChange={(e) => setFormData({...formData, google_maps_link: e.target.value})}
                placeholder="https://maps.google.com/..."
                data-testid="center-maps"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Active (visible on website)</label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="btn-primary flex-1">
                {editingCenter ? 'Update' : 'Add Center'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCenters;
