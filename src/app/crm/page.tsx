'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  tags: string;
};

// Modal Component (Reused from Projects page)
function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-1/2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Customer</h2>
          <button onClick={onClose} className="text-red-500 hover:text-red-700">
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
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', status: 'Lead', tags: 'Residential' });
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTags, setFilterTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    let query = supabase.from('customers').select('*');
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }
    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }
    if (filterTags) {
      query = query.eq('tags', filterTags);
    }
    const { data, error } = await query;
    if (error) {
      setError('Failed to load customers. Please try again.');
      console.error('Fetch Customers Error:', error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  }, [searchQuery, filterStatus, filterTags]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const validateForm = (customer: typeof newCustomer) => {
    if (!customer.name || !customer.email || !customer.phone) {
      setError('All fields are required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      setError('Invalid email format.');
      return false;
    }
    return true;
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm(newCustomer)) return;

    setLoading(true);
    const { data: existingCustomer, error: checkError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', newCustomer.email)
      .single();
    if (existingCustomer) {
      setError('A customer with this email already exists.');
      setLoading(false);
      return;
    }
    if (checkError && checkError.code !== 'PGRST116') {
      setError('Error checking email: ' + checkError.message);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from('customers').insert([newCustomer]).select();
    if (error) {
      setError('Failed to add customer. Please try again.');
      console.error('Customer Insert Error:', error);
    } else {
      console.log('Customer Added:', data);
      setNewCustomer({ name: '', email: '', phone: '', status: 'Lead', tags: 'Residential' });
      fetchCustomers();
    }
    setLoading(false);
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setError('');
    if (!validateForm(editCustomer)) return;

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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">CRM</h1>
      <form onSubmit={handleAddCustomer} className="mb-8 bg-gray-800 p-6 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <input
            type="text"
            placeholder="Phone"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <select
            value={newCustomer.status}
            onChange={(e) => setNewCustomer({ ...newCustomer, status: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
          >
            <option value="Lead">Lead</option>
            <option value="Pending">Pending</option>
            <option value="Sold">Sold</option>
            <option value="Lost">Lost</option>
            <option value="In Production">In Production</option>
            <option value="Complete">Complete</option>
          </select>
          <select
            value={newCustomer.tags}
            onChange={(e) => setNewCustomer({ ...newCustomer, tags: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
          >
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Driveway">Driveway</option>
            <option value="Parking Lot">Parking Lot</option>
            <option value="Other">Other</option>
          </select>
          <button type="submit" className="btn-yellow" disabled={loading}>
            {loading ? 'Adding...' : 'Add Customer'}
          </button>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {editCustomer && (
          <form onSubmit={handleEditCustomer} className="mb-8">
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                value={editCustomer.name}
                onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white"
                required
              />
              <input
                type="email"
                value={editCustomer.email}
                onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white"
                required
              />
              <input
                type="text"
                value={editCustomer.phone}
                onChange={(e) => setEditCustomer({ ...editCustomer, phone: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white"
                required
              />
              <select
                value={editCustomer.status}
                onChange={(e) => setEditCustomer({ ...editCustomer, status: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white"
              >
                <option value="Lead">Lead</option>
                <option value="Pending">Pending</option>
                <option value="Sold">Sold</option>
                <option value="Lost">Lost</option>
                <option value="In Production">In Production</option>
                <option value="Complete">Complete</option>
              </select>
              <select
                value={editCustomer.tags}
                onChange={(e) => setEditCustomer({ ...editCustomer, tags: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white"
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Driveway">Driveway</option>
                <option value="Parking Lot">Parking Lot</option>
                <option value="Other">Other</option>
              </select>
              <button type="submit" className="btn-yellow" disabled={loading}>
                {loading ? 'Updating...' : 'Update Customer'}
              </button>
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </form>
        )}
      </Modal>
      <div className="mb-8 flex gap-4">
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white w-1/3"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white"
        >
          <option value="">Filter by Status</option>
          <option value="Lead">Lead</option>
          <option value="Pending">Pending</option>
          <option value="Sold">Sold</option>
          <option value="Lost">Lost</option>
          <option value="In Production">In Production</option>
          <option value="Complete">Complete</option>
        </select>
        <select
          value={filterTags}
          onChange={(e) => setFilterTags(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white"
        >
          <option value="">Filter by Tags</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
          <option value="Driveway">Driveway</option>
          <option value="Parking Lot">Parking Lot</option>
          <option value="Other">Other</option>
        </select>
      </div>
      {loading && <p className="text-yellow-500 mb-4">Loading...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Tags</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.name}</td>
              <td>{customer.email}</td>
              <td>{customer.phone}</td>
              <td>{customer.status}</td>
              <td>{customer.tags}</td>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}