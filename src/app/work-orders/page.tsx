'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type WorkOrder = {
  id: number;
  estimate_id: number;
  project_name: string;
  customer_id: number;
  description: string;
  assigned_to: string;
  status: string;
};

function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-1/2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-yellow-500">Edit Work Order</h2>
          <button onClick={onClose} className="text-red-500 hover:text-red-700 transition-colors duration-200">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function WorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [editWorkOrder, setEditWorkOrder] = useState<WorkOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('work_orders').select('*');
    if (error) {
      setError('Failed to load work orders. Please try again.');
      console.error('Fetch Work Orders Error:', error);
    } else {
      setWorkOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleEditWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWorkOrder) return;
    setError('');
    if (!editWorkOrder.assigned_to) {
      setError('Assigned To is required.');
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('work_orders')
      .update({
        assigned_to: editWorkOrder.assigned_to,
        status: editWorkOrder.status,
      })
      .eq('id', editWorkOrder.id);
    if (error) {
      setError('Failed to update work order. Please try again.');
      console.error('Work Order Update Error:', error);
    } else {
      setEditWorkOrder(null);
      setIsModalOpen(false);
      fetchWorkOrders();
    }
    setLoading(false);
  };

  const handleDeleteWorkOrder = async (workOrderId: number) => {
    setError('');
    setLoading(true);
    const { error } = await supabase.from('work_orders').delete().eq('id', workOrderId);
    if (error) {
      setError('Failed to delete work order. Please try again.');
      console.error('Work Order Delete Error:', error);
    } else {
      fetchWorkOrders();
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Work Orders</h1>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {editWorkOrder && (
          <form onSubmit={handleEditWorkOrder}>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Assigned To"
                value={editWorkOrder.assigned_to}
                onChange={(e) => setEditWorkOrder({ ...editWorkOrder, assigned_to: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <select
                value={editWorkOrder.status}
                onChange={(e) => setEditWorkOrder({ ...editWorkOrder, status: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <button type="submit" className="btn-yellow" disabled={loading}>
                {loading ? 'Updating...' : 'Update Work Order'}
              </button>
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </form>
        )}
      </Modal>
      {loading && <p className="text-yellow-500 mb-4 animate-pulse">Loading...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <table className="table w-full">
        <thead>
          <tr>
            <th className="text-left">Project Name</th>
            <th className="text-left">Description</th>
            <th className="text-left">Assigned To</th>
            <th className="text-left">Status</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workOrders.map((workOrder) => (
            <tr key={workOrder.id} className="hover:bg-gray-700 transition-colors duration-200">
              <td>{workOrder.project_name}</td>
              <td>{workOrder.description}</td>
              <td>{workOrder.assigned_to}</td>
              <td>{workOrder.status}</td>
              <td>
                <button
                  onClick={() => {
                    setEditWorkOrder(workOrder);
                    setIsModalOpen(true);
                  }}
                  className="btn-yellow mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteWorkOrder(workOrder.id)}
                  className="btn-yellow bg-red-500 hover:bg-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}