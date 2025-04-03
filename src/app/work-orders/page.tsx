'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type WorkOrder = {
  id: number;
  estimate_id: number;
  project_id: number;
  customer_id: number;
  assigned_to: string;
  status: string;
  created_at: string;
  estimate: { description: string };
  project: { name: string };
  customer: { name: string };
};

type Estimate = {
  id: number;
  project_id: number;
  customer_id: number;
  description: string;
  amount: number;
  project: { name: string };
  customer: { name: string };
};

export default function WorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const teamMembers = ['Jacob Walker', 'John Doe', 'Jane Smith']; // Dropdown of 3 users

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError('');
    let query = supabase
      .from('work_orders')
      .select('*, estimate:estimates(description), project:projects(name), customer:customers(name)');
    if (filterStatus) query = query.eq('status', filterStatus);
    const { data, error } = await query;
    if (error) {
      setError('Failed to load work orders. Please try again.');
      console.error('Fetch Work Orders Error:', error.message);
    } else {
      setWorkOrders(data || []);
    }
    setLoading(false);
  };

  const fetchEstimates = async () => {
    const { data, error } = await supabase
      .from('estimates')
      .select('*, project:projects(name), customer:customers(name)');
    if (error) {
      console.error('Fetch Estimates Error:', error.message);
    } else {
      setEstimates(data || []);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchEstimates();
  }, [filterStatus]);

  const handleGenerateWorkOrder = async (estimate: Estimate) => {
    setLoading(true);
    setError('');
    const workOrderData = {
      estimate_id: estimate.id,
      project_id: estimate.project_id,
      customer_id: estimate.customer_id,
      assigned_to: teamMembers[0], // Default to first team member
      status: 'Pending',
    };
    const { data, error } = await supabase.from('work_orders').insert([workOrderData]).select();
    if (error) {
      setError('Failed to generate work order. Please try again.');
      console.error('Generate Work Order Error:', error.message);
    } else {
      console.log('Work Order Generated:', data);
      fetchWorkOrders();
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (workOrderId: number, newStatus: string) => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('work_orders')
      .update({ status: newStatus })
      .eq('id', workOrderId)
      .select();
    if (error) {
      setError('Failed to update work order status. Please try again.');
      console.error('Update Work Order Status Error:', error.message);
    } else {
      console.log('Work Order Updated:', data);
      fetchWorkOrders();
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Work Orders</h1>
      {loading && <p className="text-yellow-500 mb-4 animate-pulse">Loading...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Generate Work Orders from Estimates */}
      <div className="mb-8 bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-yellow-500">Generate Work Orders from Estimates</h2>
        <table className="table w-full">
          <thead>
            <tr>
              <th className="text-left">Project</th>
              <th className="text-left">Customer</th>
              <th className="text-left">Description</th>
              <th className="text-left">Amount</th>
              <th className="text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((estimate) => (
              <tr key={estimate.id} className="hover:bg-gray-700 transition-colors duration-200">
                <td>{estimate.project.name}</td>
                <td>{estimate.customer.name}</td>
                <td>{estimate.description}</td>
                <td>${estimate.amount}</td>
                <td>
                  <button
                    onClick={() => handleGenerateWorkOrder(estimate)}
                    className="btn-yellow"
                    disabled={loading}
                  >
                    Generate Work Order
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Work Orders Table */}
      <div className="mb-8 flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          <option value="">Filter by Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      <table className="table w-full">
        <thead>
          <tr>
            <th className="text-left">Project</th>
            <th className="text-left">Customer</th>
            <th className="text-left">Estimate Description</th>
            <th className="text-left">Assigned To</th>
            <th className="text-left">Status</th>
            <th className="text-left">Created At</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workOrders.map((workOrder) => (
            <tr key={workOrder.id} className="hover:bg-gray-700 transition-colors duration-200">
              <td>{workOrder.project.name}</td>
              <td>{workOrder.customer.name}</td>
              <td>{workOrder.estimate.description}</td>
              <td>
                <select
                  value={workOrder.assigned_to}
                  onChange={(e) => handleUpdateStatus(workOrder.id, workOrder.status)}
                  className="p-1 rounded bg-gray-700 text-white"
                >
                  {teamMembers.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={workOrder.status}
                  onChange={(e) => handleUpdateStatus(workOrder.id, e.target.value)}
                  className="p-1 rounded bg-gray-700 text-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </td>
              <td>{new Date(workOrder.created_at).toLocaleDateString()}</td>
              <td>
                <button
                  onClick={() => handleUpdateStatus(workOrder.id, workOrder.status)}
                  className="btn-yellow"
                  disabled={loading}
                >
                  Update
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}