'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  tags: string;
};

export default function CRM() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', status: 'Lead', tags: 'Residential' });
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTags, setFilterTags] = useState('');
  const [error, setError] = useState('');

  const fetchCustomers = async () => {
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
      console.error(error);
    } else {
      setCustomers(data);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const validateForm = () => {
    if (!newCustomer.name || !newCustomer.email || !newCustomer.phone) {
      setError('All fields are required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) {
      setError('Invalid email format.');
      return false;
    }
    if (!/^\d{10}$/.test(newCustomer.phone)) {
      setError('Phone number must be 10 digits.');
      return false;
    }
    return true;
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('customers').insert([newCustomer]).select();
    if (error) console.error('Customer Insert Error:', error);
    else {
      console.log('Customer Added:', data);
      setNewCustomer({ name: '', email: '', phone: '', status: 'Lead', tags: 'Residential' });
      fetchCustomers();
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    const { data, error } = await supabase
      .from('customers')
      .update(editCustomer)
      .eq('id', editCustomer.id)
      .select();
    if (error) console.error('Customer Update Error:', error);
    else {
      console.log('Customer Updated:', data);
      setEditCustomer(null);
      fetchCustomers();
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">CRM</h1>
      {/* Add Customer Form */}
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
          </select>
          <select
            value={newCustomer.tags}
            onChange={(e) => setNewCustomer({ ...newCustomer, tags: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
          >
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Driveway">Driveway</option>
          </select>
          <button type="submit" className="btn-yellow">
            Add Customer
          </button>
        </div>
      </form>

      {/* Edit Customer Form */}
      {editCustomer && (
        <form onSubmit={handleEditCustomer} className="mb-8 bg-gray-800 p-6 rounded-lg">
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
            </select>
            <select
              value={editCustomer.tags}
              onChange={(e) => setEditCustomer({ ...editCustomer, tags: e.target.value })}
              className="p-2 rounded bg-gray-700 text-white"
            >
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Driveway">Driveway</option>
            </select>
            <button type="submit" className="btn-yellow">
              Update Customer
            </button>
            <button
              type="button"
              onClick={() => setEditCustomer(null)}
              className="btn-yellow bg-red-500 hover:bg-red-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Customer Table */}
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
                  onClick={() => setEditCustomer(customer)}
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