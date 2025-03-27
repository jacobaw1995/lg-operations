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

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) {
      console.error(error);
    } else {
      setCustomers(data);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('customers').insert([newCustomer]);
    if (error) {
      console.error(error);
    } else {
      setNewCustomer({ name: '', email: '', phone: '', status: 'Lead', tags: 'Residential' });
      fetchCustomers();
    }
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
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Tags</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}