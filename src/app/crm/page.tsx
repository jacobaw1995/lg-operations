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
  }, [searchQuery, filterStatus, filterTags]);

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
    setError('');
    if (!validateForm()) return;

    const { data: existingCustomer, error: checkError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', newCustomer.email)
      .single();
    if (existingCustomer) {
      setError('A customer with this email already exists.');
      return;
    }
    if (checkError && checkError.code !== 'PGRST116') {
      setError('Error checking email: ' + checkError.message);
      return;
    }

    const { error } = await supabase.from('customers').insert([newCustomer]);
    if (error) {
      setError('Error adding customer: ' + error.message);
    } else {
      setNewCustomer({ name: '', email: '', phone: '', status: 'Lead', tags: 'Residential' });
      fetchCustomers();
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setError('');
    const { error } = await supabase
      .from('customers')
      .update({
        name: editCustomer.name,
        email: editCustomer.email,
        phone: editCustomer.phone,
        status: editCustomer.status,
        tags: editCustomer.tags,
      })
      .eq('id', editCustomer.id);
    if (error) {
      setError('Error updating customer: ' + error.message);
    } else {
      setEditCustomer(null);
      fetchCustomers();
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">CRM</h1>
      <form onSubmit={editCustomer ? handleEditCustomer : handleAddCustomer} className="mb-8 bg-gray-800 p-6 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={editCustomer ? editCustomer.name : newCustomer.name}
            onChange={(e) =>
              editCustomer
                ? setEditCustomer({ ...editCustomer, name: e.target.value })
                : setNewCustomer({ ...newCustomer, name: e.target.value })
            }
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={editCustomer ? editCustomer.email : newCustomer.email}
            onChange={(e) =>
              editCustomer
                ? setEditCustomer({ ...editCustomer, email: e.target.value })
                : setNewCustomer({ ...newCustomer, email: e.target.value })
            }
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <input
            type="text"
            placeholder="Phone"
            value={editCustomer ? editCustomer.phone : newCustomer.phone}
            onChange={(e) =>
              editCustomer
                ? setEditCustomer({ ...editCustomer, phone: e.target.value })
                : setNewCustomer({ ...newCustomer, phone: e.target.value })
            }
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <select
            value={editCustomer ? editCustomer.status : newCustomer.status}
            onChange={(e) =>
              editCustomer
                ? setEditCustomer({ ...editCustomer, status: e.target.value })
                : setNewCustomer({ ...newCustomer, status: e.target.value })
            }
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
            value={editCustomer ? editCustomer.tags : newCustomer.tags}
            onChange={(e) =>
              editCustomer
                ? setEditCustomer({ ...editCustomer, tags: e.target.value })
                : setNewCustomer({ ...newCustomer, tags: e.target.value })
            }
            className="p-2 rounded bg-gray-700 text-white"
          >
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Driveway">Driveway</option>
            <option value="Parking Lot">Parking Lot</option>
            <option value="Other">Other</option>
          </select>
          <button type="submit" className="btn-yellow">
            {editCustomer ? 'Update Customer' : 'Add Customer'}
          </button>
          {editCustomer && (
            <button
              type="button"
              onClick={() => setEditCustomer(null)}
              className="btn-yellow bg-red-500 hover:bg-red-600"
            >
              Cancel
            </button>
          )}
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>
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