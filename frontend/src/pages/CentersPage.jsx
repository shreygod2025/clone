import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, MapPin, Phone, Mail, ExternalLink, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CentersPage = () => {
  const navigate = useNavigate();
  const [centers, setCenters] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [centersRes, citiesRes] = await Promise.all([
        axios.get(`${API}/centers`),
        axios.get(`${API}/cities`)
      ]);
      setCenters(centersRes.data.filter(c => c.is_active));
      setCities(citiesRes.data.filter(c => c.is_active && c.has_center));
    } catch (error) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const filteredCenters = selectedCity === 'all' 
    ? centers 
    : centers.filter(c => c.city === selectedCity);

  // Group by city
  const centersByCity = filteredCenters.reduce((acc, center) => {
    if (!acc[center.city]) acc[center.city] = [];
    acc[center.city].push(center);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar showBookDemo onBookDemo={() => navigate('/student')} />

      {/* Hero */}
      <section className="pt-12 pb-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#D63031]/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-[#D63031]" />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            OLL Learning Centers
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Visit our centers for hands-on learning experience. Meet our educators and explore our labs.
          </p>
        </div>
      </section>

      {/* City Filter */}
      {cities.length > 1 && (
        <section className="px-4 mb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setSelectedCity('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCity === 'all'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                All Cities
              </button>
              {cities.map(city => (
                <button
                  key={city.id}
                  onClick={() => setSelectedCity(city.name)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCity === city.name
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Centers List */}
      <section className="px-4 pb-16">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
            </div>
          ) : centers.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-3xl">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#1E3A5F] mb-2">No Centers Yet</h3>
              <p className="text-slate-500 mb-6">We're expanding! Check back soon for new locations.</p>
              <Link to="/student" className="btn-primary inline-flex items-center gap-2">
                Book Online Demo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(centersByCity).map(([city, cityCenters]) => (
                <div key={city}>
                  <h2 className="text-xl font-bold text-[#1E3A5F] mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#D63031]" />
                    {city}
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {cityCenters.map(center => (
                      <div 
                        key={center.id} 
                        className="glass-card rounded-2xl p-6 hover:shadow-lg transition-shadow"
                        data-testid={`center-card-${center.id}`}
                      >
                        <h3 className="font-semibold text-[#1E3A5F] text-lg mb-1">{center.name}</h3>
                        <p className="text-[#D63031] font-medium text-sm mb-3">{center.area}</p>
                        <p className="text-slate-600 text-sm mb-4">{center.address}</p>
                        
                        <div className="space-y-2 mb-4">
                          <a 
                            href={`tel:${center.contact_phone}`}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#1E3A5F]"
                          >
                            <Phone className="w-4 h-4" />
                            {center.contact_phone}
                          </a>
                          {center.contact_email && (
                            <a 
                              href={`mailto:${center.contact_email}`}
                              className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#1E3A5F]"
                            >
                              <Mail className="w-4 h-4" />
                              {center.contact_email}
                            </a>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Link 
                            to="/student"
                            className="btn-primary flex-1 text-center text-sm py-2"
                          >
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Book Demo
                          </Link>
                          {center.google_maps_link && (
                            <a 
                              href={center.google_maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm flex items-center gap-1"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Map
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#1E3A5F] py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Can't Visit a Center?
          </h2>
          <p className="text-white/70 mb-6">
            No problem! We offer online classes with the same quality education.
          </p>
          <Link to="/student" className="bg-white text-[#1E3A5F] px-6 py-3 rounded-full font-semibold inline-flex items-center gap-2 hover:bg-white/90 transition-colors">
            Book Online Demo <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Growth Partner CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Want to Open Your Own OLL Center?
          </h2>
          <p className="text-white/90 mb-8 text-lg max-w-2xl mx-auto">
            Become an OLL Growth Partner and bring quality skill education to your city. 
            Low investment, high impact, full support from OLL team.
          </p>
          <Link 
            to="/growth-partner" 
            className="bg-white text-orange-600 px-8 py-4 rounded-full font-bold text-lg inline-flex items-center gap-2 hover:bg-orange-50 transition-colors shadow-lg hover:shadow-xl"
          >
            Become a Growth Partner <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CentersPage;
