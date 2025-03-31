'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Customer = {
  id: number;
  name: string;
  email: string;
  status: string;
  tags: string[] | null | undefined; // Allow null/undefined
};

function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-1/2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-yellow-500">Edit Customer</h2>
          <button onClick={onClose} className="text-red-500 hover:text-red-700 transition-colors duration-200">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CRM() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', status: 'Lead', tags: [] as string[] });
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    let query = supabase.from('customers').select('*');
    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }
    if (filterTags.length > 0) {
      query = query.contains('tags', filterTags);
    }
    const { data, error } = await query;
    if (error) {
      setError('Failed to load customers. Please try again.');
      console.error('Fetch Customers Error:', error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers, filterStatus, filterTags]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newCustomer.name || !newCustomer.email) {
      setError('Name and email are required.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from('customers').insert([newCustomer]).select();
    if (error) {
      setError('Failed to add customer. Please try again.');
      console.error('Customer Insert Error:', error);
    } else {
      console.log('Customer Added:', data);
      setNewCustomer({ name: '', email: '', status: 'Lead', tags: [] });
      fetchCustomers();
    }
    setLoading(false);
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setError('');
    if (!editCustomer.name || !editCustomer.email) {
      setError('Name and email are required.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .update(editCustomer)
      .eq('id', editCustomer.id)
      .select();
    if (error) {
      setError('Failed to update customer. Please try again.');
      console.error('Customer Update Error:', error);
    } else {
      console.log('Customer Updated:', data);
      setEditCustomer(null);
      setIsModalOpen(false);
      fetchCustomers();
    }
    setLoading(false);
  };

  const handleDeleteCustomer = async (customerId: number) => {
    setError('');
    setLoading(true);
    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) {
      setError('Failed to delete customer. Please try again.');
      console.error('Customer Delete Error:', error);
    } else {
      fetchCustomers();
    }
    setLoading(false);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">CRM</h1>
      <form onSubmit={handleAddCustomer} className="mb-8 bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="grid grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <select
            value={newCustomer.status}
            onChange={(e) => setNewCustomer({ ...newCustomer, status: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="Lead">Lead</option>
            <option value="Pending">Pending</option>
            <option value="Sold">Sold</option>
            <option value="Lost">Lost</option>
            <option value="In Production">In Production</option>
            <option value="Complete">Complete</option>
          </select>
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={newCustomer.tags.join(', ')}
            onChange={(e) => setNewCustomer({ ...newCustomer, tags: e.target.value.split(',').map((tag) => tag.trim()) })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button type="submit" className="btn-yellow" disabled={loading}>
            {loading ? 'Adding...' : 'Add Customer'}
          </button>
        </div>
      </form>
      <div className="mb-8 flex gap-4">
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white w-1/3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          <option value="">Filter by Status</option>
          <option value="Lead">Lead</option>
          <option value="Pending">Pending</option>
          <option value="Sold">Sold</option>
          <option value="Lost">Lost</option>
          <option value="In Production">In Production</option>
          <option value="Complete">Complete</option>
        </select>
        <input
          type="text"
          placeholder="Filter by tags (comma-separated)"
          value={filterTags.join(', ')}
          onChange={(e) => setFilterTags(e.target.value.split(',').map((tag) => tag.trim()))}
          className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {editCustomer && (
          <form onSubmit={handleEditCustomer}>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Name"
                value={editCustomer.name}
                onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={editCustomer.email}
                onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <select
                value={editCustomer.status}
                onChange={(e) => setEditCustomer({ ...editCustomer, status: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="Lead">Lead</option>
                <option value="Pending">Pending</option>
                <option value="Sold">Sold</option>
                <option value="Lost">Lost</option>
                <option value="In Production">In Production</option>
                <option value="Complete">Complete</option>
              </select>
              <input
                type="text"
                placeholder="Tags (comma-separated)"
                value={editCustomer.tags?.join(', ') ?? ''}
                onChange={(e) => setEditCustomer({ ...editCustomer, tags: e.target.value.split(',').map((tag) => tag.trim()) })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button type="submit" className="btn-yellow" disabled={loading}>
                {loading ? 'Updating...' : 'Update Customer'}
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
            <th className="text-left">Name</th>
            <th className="text-left">Email</th>
            <th className="text-left">Status</th>
            <th className="text-left">Tags</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map((customer) => (
            <tr key={customer.id} className="hover:bg-gray-700 transition-colors duration-200">
              <td>{customer.name}</td>
              <td>{customer.email}</td>
              <td>{customer.status}</td>
              <td>{Array.isArray(customer.tags) ? customer.tags.join(', ') : customer.tags ?? ''}</td> {/* Handle non-array tags */}
              <td>
                <button
                  onClick={() => {
                    setEditCustomer(customer);
                    setIsModalOpen(true);
                  }}
                  className="btn-yellow mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteCustomer(customer.id)}
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