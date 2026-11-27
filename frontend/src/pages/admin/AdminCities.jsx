import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, MapPin, GripVertical, Building2, Check, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminCities = () => {
  const { getAuthHeaders } = useAuth();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    is_active: true,
    has_center: false,
    order: 0
  });

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/cities`, {
        headers: getAuthHeaders()
      });
      setCities(response.data);
    } catch (error) {
      toast.error('Failed to fetch cities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('City name is required');
      return;
    }

    try {
      if (editingCity) {
        await axios.patch(`${API}/cities/${editingCity.id}`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('City updated successfully');
      } else {
        await axios.post(`${API}/cities`, {
          ...formData,
          order: cities.length
        }, {
          headers: getAuthHeaders()
        });
        toast.success('City added successfully');
      }
      setShowForm(false);
      setEditingCity(null);
      resetForm();
      fetchCities();
    } catch (error) {
      toast.error('Failed to save city');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this city?')) return;
    try {
      await axios.delete(`${API}/cities/${id}`, {
        headers: getAuthHeaders()
      });
      toast.success('City deleted');
      fetchCities();
    } catch (error) {
      toast.error('Failed to delete city');
    }
  };

  const moveCity = async (index, direction) => {
    const newCities = [...cities];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cities.length) return;
    
    [newCities[index], newCities[targetIndex]] = [newCities[targetIndex], newCities[index]];
    
    const reorderData = newCities.map((city, i) => ({ id: city.id, order: i }));
    
    try {
      await axios.post(`${API}/cities/reorder`, reorderData, {
        headers: getAuthHeaders()
      });
      setCities(newCities);
      toast.success('Order updated');
    } catch (error) {
      toast.error('Failed to reorder');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      state: '',
      is_active: true,
      has_center: false,
      order: 0
    });
  };

  const openEditForm = (city) => {
    setEditingCity(city);
    setFormData({
      name: city.name,
      state: city.state || '',
      is_active: city.is_active,
      has_center: city.has_center,
      order: city.order
    });
    setShowForm(true);
  };

  return (
    <AdminLayout title="Manage Cities">
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-500">{cities.length} cities configured</p>
        <Button 
          onClick={() => {
            resetForm();
            setEditingCity(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
          data-testid="add-city-btn"
        >
          <Plus className="w-4 h-4" /> Add City
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : cities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No cities configured yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 text-sm font-medium text-slate-500 border-b">
            <div className="col-span-1">Order</div>
            <div className="col-span-4">City Name</div>
            <div className="col-span-2">State</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Has Center</div>
            <div className="col-span-1">Actions</div>
          </div>
          
          {cities.map((city, index) => (
            <div 
              key={city.id} 
              className="grid grid-cols-12 gap-4 p-4 items-center border-b last:border-b-0 hover:bg-slate-50"
              data-testid={`city-row-${city.id}`}
            >
              <div className="col-span-1 flex items-center gap-1">
                <div className="flex flex-col">
                  <button 
                    onClick={() => moveCity(index, 'up')}
                    disabled={index === 0}
                    className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button 
                    onClick={() => moveCity(index, 'down')}
                    disabled={index === cities.length - 1}
                    className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <span className="text-slate-400 text-sm">{index + 1}</span>
              </div>
              <div className="col-span-4 font-medium text-[#1E3A5F] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                {city.name}
              </div>
              <div className="col-span-2 text-slate-500">{city.state || '-'}</div>
              <div className="col-span-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  city.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {city.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="col-span-2">
                {city.has_center ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <Building2 className="w-4 h-4" /> Yes
                  </span>
                ) : (
                  <span className="text-slate-400 text-sm">No</span>
                )}
              </div>
              <div className="col-span-1 flex gap-1">
                <button
                  onClick={() => openEditForm(city)}
                  className="p-1.5 rounded hover:bg-slate-100"
                  data-testid={`edit-city-${city.id}`}
                >
                  <Edit2 className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  onClick={() => handleDelete(city.id)}
                  className="p-1.5 rounded hover:bg-red-50"
                  data-testid={`delete-city-${city.id}`}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* City Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCity ? 'Edit City' : 'Add New City'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">City Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Mumbai"
                data-testid="city-name-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                placeholder="e.g., Maharashtra"
                data-testid="city-state-input"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Active (visible in forms)</label>
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
                {editingCity ? 'Update' : 'Add City'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCities;
