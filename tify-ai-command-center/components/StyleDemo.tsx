import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  MoreHorizontal, 
  ChevronRight,
  Bell,
  Search,
  LayoutGrid,
  PieChart,
  Settings,
  LogOut,
  Play,
  Pause,
  Plus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// --- DESIGN TOKENS & MOCK DATA ---

const COLORS = {
  primary: '#7DD3FC', // sky-300
  primaryDark: '#0EA5E9', // sky-500
  secondary: '#6B7280', // gray-500
  background: '#F8F9FA', // gray-50
  surface: '#FFFFFF',
  text: '#1F2937', // gray-800
  success: '#34D399', // emerald-400
  warning: '#FBBF24', // amber-400
  danger: '#F87171', // red-400
  info: '#818CF8', // indigo-400
};

const MOCK_DATA = {
  metrics: [
    { label: 'Total Employees', value: '245', change: 12.5, trend: 'up', icon: Users, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'New Hires', value: '42', change: -2.4, trend: 'down', icon: Plus, color: 'bg-purple-100 text-purple-600' },
    { label: 'Resigned', value: '12', change: 0.8, trend: 'up', icon: LogOut, color: 'bg-sky-100 text-sky-600' },
  ],
  attendance: [
    { day: 'Mon', present: 85, absent: 15 },
    { day: 'Tue', present: 88, absent: 12 },
    { day: 'Wed', present: 92, absent: 8 },
    { day: 'Thu', present: 85, absent: 15 },
    { day: 'Fri', present: 80, absent: 20 },
  ],
  schedule: [
    { id: 1, title: 'Team Meeting', time: '10:00 AM', type: 'meeting', members: 12 },
    { id: 2, title: 'Interview with Sarah', time: '11:30 AM', type: 'interview', members: 3 },
    { id: 3, title: 'Lunch Break', time: '01:00 PM', type: 'break', members: 0 },
    { id: 4, title: 'Project Review', time: '02:30 PM', type: 'meeting', members: 8 },
  ],
  projects: [
    { name: 'Website Redesign', progress: 75, team: 4 },
    { name: 'Mobile App', progress: 45, team: 6 },
    { name: 'Marketing Campaign', progress: 90, team: 3 },
  ]
};

// --- COMPONENTS ---

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) => {
  const colorClasses: {[key: string]: string} = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[color] || colorClasses.blue}`}>
      {children}
    </span>
  );
};

const MetricCard = ({ data }: { data: any }) => (
  <Card className="flex flex-col justify-between h-full">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-full ${data.color}`}>
        <data.icon size={20} />
      </div>
      <div className={`flex items-center text-sm font-medium ${data.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
        {data.trend === 'up' ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
        {Math.abs(data.change)}%
      </div>
    </div>
    <div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{data.value}</h3>
      <p className="text-gray-500 text-sm">{data.label}</p>
    </div>
  </Card>
);

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
    <div 
      className="h-full bg-sky-400 rounded-full" 
      style={{ width: `${progress}%` }}
    />
    <div 
      className="h-full bg-gray-200 flex-1 opacity-50" 
      style={{ 
        backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', 
        backgroundSize: '1rem 1rem' 
      }} 
    />
  </div>
);

// --- MAIN DEMO PAGE ---

const StyleDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-800 font-sans p-8">
      
      {/* HEADER & NAV */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR Dashboard Style Demo</h1>
          <p className="text-gray-500">Reference implementation based on new design system</p>
        </div>
        <div className="flex items-center space-x-4">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Search..." 
               className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 w-64 text-sm"
             />
           </div>
           <button className="p-2 bg-white rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 relative">
             <Bell size={20} />
             <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
           </button>
           <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm overflow-hidden">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
           </div>
        </div>
      </header>

      {/* TABS */}
      <div className="bg-white rounded-2xl p-2 inline-flex mb-8 shadow-sm">
        {['Dashboard', 'Employees', 'Recruitment', 'Schedule'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.toLowerCase()
                ? 'bg-sky-100 text-sky-700'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_DATA.metrics.map((metric, idx) => (
              <MetricCard key={idx} data={metric} />
            ))}
          </div>

          {/* CHART */}
          <Card className="h-96">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Employee Attendance</h3>
              <select className="bg-gray-50 border-none text-sm text-gray-500 rounded-lg px-3 py-1 focus:ring-0">
                <option>This Week</option>
                <option>Last Week</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_DATA.attendance} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9CA3AF', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9CA3AF', fontSize: 12}} 
                />
                <Tooltip 
                  cursor={{fill: '#F9FAFB'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                />
                <Bar dataKey="present" fill="url(#colorGradient)" radius={[6, 6, 6, 6]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7DD3FC" />
                    <stop offset="100%" stopColor="#0EA5E9" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* PROJECTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MOCK_DATA.projects.map((project, idx) => (
              <Card key={idx}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-gray-900">{project.name}</h4>
                    <span className="text-xs text-gray-500">Due in 3 days</span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium text-sky-600">{project.progress}%</span>
                  </div>
                  <ProgressBar progress={project.progress} />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex -space-x-2">
                    {[...Array(project.team)].map((_, i) => (
                       <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                         {String.fromCharCode(65 + i)}
                       </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-sky-50 flex items-center justify-center text-xs font-medium text-sky-600">
                      +
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* TIME TRACKER */}
          <Card className="flex flex-col items-center py-8">
            <h3 className="font-bold text-gray-900 mb-6">Work Time</h3>
            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
               {/* Simplified Circular Progress for Demo */}
               <svg className="w-full h-full transform -rotate-90">
                 <circle cx="96" cy="96" r="88" fill="none" stroke="#F3F4F6" strokeWidth="12" />
                 <circle cx="96" cy="96" r="88" fill="none" stroke="#38BDF8" strokeWidth="12" strokeDasharray="552" strokeDashoffset="100" strokeLinecap="round" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-4xl font-bold text-gray-900">05:23</span>
                 <span className="text-sm text-gray-400 mt-1">Hrs worked</span>
               </div>
            </div>
            <div className="flex space-x-4">
               <button 
                 onClick={() => setIsPlaying(!isPlaying)}
                 className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${isPlaying ? 'bg-rose-100 text-rose-500' : 'bg-sky-500 text-white'}`}
               >
                 {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
               </button>
            </div>
          </Card>

          {/* CALENDAR / SCHEDULE */}
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">My Schedule</h3>
              <button className="text-sky-500 text-sm font-medium hover:underline">View All</button>
            </div>
            
            {/* Calendar Strip */}
            <div className="flex justify-between mb-8 text-center">
              {['M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className={`flex flex-col items-center justify-center w-10 h-12 rounded-xl text-sm ${i === 2 ? 'bg-sky-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <span className="text-xs mb-1 opacity-80">{day}</span>
                  <span className="font-bold">{12 + i}</span>
                </div>
              ))}
            </div>

            {/* Events */}
            <div className="space-y-4">
              {MOCK_DATA.schedule.map((event) => (
                <div key={event.id} className="group flex items-start space-x-4 p-3 rounded-xl hover:bg-sky-50 transition-colors cursor-pointer">
                  <div className="w-12 text-center pt-1">
                     <span className="text-xs font-bold text-gray-500">{event.time.split(' ')[0]}</span>
                     <span className="text-[10px] text-gray-400 block">{event.time.split(' ')[1]}</span>
                  </div>
                  <div className="flex-1 border-l-2 border-sky-200 pl-4 py-1">
                    <h4 className="font-bold text-gray-900 text-sm">{event.title}</h4>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <Users size={12} className="mr-1" />
                      <span>{event.members} members</span>
                      {event.type === 'meeting' && (
                        <span className="ml-3 px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">Zoom</span>
                      )}
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default StyleDemo;
