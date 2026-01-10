import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Building2, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';

const LandingPage = () => {
  const navigate = useNavigate();

  const userTypes = [
    {
      id: 'student',
      title: 'Student / Parent',
      subtitle: 'Learn Future-Ready Skills',
      description: 'Robotics, Coding, AI & more',
      icon: GraduationCap,
      path: '/student',
      gradient: 'from-[#1E3A5F] to-[#2C5282]'
    },
    {
      id: 'educator',
      title: 'Educator',
      subtitle: 'Join Our Network',
      description: 'Teach & grow with OLL',
      icon: Users,
      path: '/educator',
      gradient: 'from-[#D63031] to-[#e84142]'
    },
    {
      id: 'school',
      title: 'School',
      subtitle: 'Partner With Us',
      description: 'Complete skill programs',
      icon: Building2,
      path: '/school',
      gradient: 'from-[#1E3A5F] to-[#D63031]'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 py-4 md:py-6">
        {/* Tagline */}
        <div className="text-center mb-4 md:mb-6 shrink-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Leading a Skill Learning Revolution
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">
            Choose your path
          </p>
        </div>

        {/* User Type Cards - Flexible Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 max-w-7xl mx-auto w-full">
          {userTypes.map((type) => (
            <div
              key={type.id}
              onClick={() => navigate(type.path)}
              className={`relative rounded-2xl md:rounded-3xl bg-gradient-to-br ${type.gradient} p-4 md:p-6 lg:p-8 flex flex-col cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl`}
              data-testid={`${type.id}-card`}
            >
              {/* Icon */}
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 md:mb-auto">
                <type.icon className="w-5 h-5 md:w-7 md:h-7 text-white" />
              </div>
              
              {/* Content */}
              <div>
                <p className="text-white/70 text-xs md:text-sm font-medium">{type.subtitle}</p>
                <h2 className="text-lg md:text-2xl lg:text-3xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {type.title}
                </h2>
                <p className="text-white/60 text-xs md:text-sm mt-1">{type.description}</p>
              </div>
              
              {/* Arrow positioned at bottom right */}
              <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
