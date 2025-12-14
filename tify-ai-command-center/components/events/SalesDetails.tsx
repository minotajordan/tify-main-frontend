import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { api } from '../../services/api';
import dayjs from 'dayjs';

interface Ticket {
  id: string;
  customerName: string;
  customerEmail: string;
  price: number;
  status: 'VALID' | 'USED' | 'REFUNDED' | 'CANCELLED';
  purchaseDate: string;
  checkInTime?: string;
  zone?: { name: string };
  seat?: { rowLabel: string; colLabel: string };
  qrCode?: string;
}

interface SalesDetailsProps {
  eventId: string;
}

export default function SalesDetails({ eventId }: SalesDetailsProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getEventTickets(eventId);
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [eventId]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.customerName.toLowerCase().includes(filter.toLowerCase()) ||
      ticket.customerEmail.toLowerCase().includes(filter.toLowerCase()) ||
      ticket.id.toLowerCase().includes(filter.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Detalles de Ventas</h2>
        <button 
          onClick={fetchTickets}
          className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
          title="Actualizar"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o ID..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos los estados</option>
            <option value="VALID">Válidos</option>
            <option value="USED">Ingresados (Used)</option>
            <option value="REFUNDED">Reembolsados</option>
            <option value="CANCELLED">Cancelados</option>
          </select>

          <div className="ml-auto">
             <div className="text-sm text-gray-500">
               Total: <span className="font-semibold text-gray-900">{filteredTickets.length}</span>
             </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">ID Ticket</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Comprador</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Ubicación</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Estado</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Fecha Compra</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Cargando ventas...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron tickets.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-gray-500 truncate max-w-[120px]" title={ticket.id}>
                      {ticket.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{ticket.customerName}</div>
                      <div className="text-sm text-gray-500">{ticket.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div>{ticket.zone?.name || 'General'}</div>
                      {ticket.seat && (
                        <div className="text-xs text-gray-500">
                          Fila {ticket.seat.rowLabel}, Asiento {ticket.seat.colLabel}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${ticket.status === 'VALID' ? 'bg-green-100 text-green-800' : 
                          ticket.status === 'USED' ? 'bg-blue-100 text-blue-800' : 
                          ticket.status === 'REFUNDED' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {ticket.status === 'VALID' && 'Válido'}
                        {ticket.status === 'USED' && 'Ingresado'}
                        {ticket.status === 'REFUNDED' && 'Reembolsado'}
                        {ticket.status === 'CANCELLED' && 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {dayjs(ticket.purchaseDate).format('DD MMM YYYY HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {ticket.checkInTime ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={14} />
                          {dayjs(ticket.checkInTime).format('HH:mm:ss')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock size={14} />
                          Pendiente
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
