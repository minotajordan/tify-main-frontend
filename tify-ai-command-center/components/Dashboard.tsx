import React from 'react';
import { GitMerge, FileText, Ticket, QrCode, ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';

interface DashboardProps {
  onChangeView: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onChangeView }) => {
  const { t } = useI18n();

  const tools = [
    {
      id: 'channels',
      title: t('nav.channels'),
      description: 'Gestiona tus canales de comunicación, audiencias y mensajes.',
      icon: GitMerge,
      color: 'bg-blue-500',
      view: 'channels'
    },
    {
      id: 'forms',
      title: t('nav.forms'),
      description: 'Crea formularios dinámicos para recolectar datos.',
      icon: FileText,
      color: 'bg-emerald-500',
      view: 'forms'
    },
    {
      id: 'events',
      title: t('nav.events'),
      description: 'Administra eventos, tickets y listas de invitados.',
      icon: Ticket,
      color: 'bg-purple-500',
      view: 'events'
    },
    {
      id: 'shortlinks',
      title: t('nav.shortlinks'),
      description: 'Genera enlaces cortos y códigos QR trackeables.',
      icon: QrCode,
      color: 'bg-amber-500',
      view: 'shortlinks'
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Bienvenido a Tify Command Center</h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Tu ecosistema centralizado para gestionar comunicaciones, datos y experiencias.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {tools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onChangeView(tool.view)}
            className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${tool.color} opacity-5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
            
            <div className="flex items-start gap-6 relative z-10">
              <div className={`p-4 rounded-xl ${tool.color} text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                <tool.icon size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  {tool.description}
                </p>
                <div className="flex items-center text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                  <span>Acceder</span>
                  <ArrowRight size={16} className="ml-2" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
