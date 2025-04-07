'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

type Vendor = {
  id: number;
  name: string;
  contact: string;
  materials: string[];
  pricing: { [material: string]: number };
};

type VendorOrder = {
  id: number;
  vendor_id: number;
  project_id: number;
  materials: { [material: string]: number };
  order_date: string;
  status: string;
};

type Project = {
  id: number;
  name: string;
};

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [newVendor, setNewVendor] = useState({ name: '', contact: '', materials: '', pricing: '' });
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [newOrder, setNewOrder] = useState({ vendor_id: 0, project_id: 0, materials: '', status: 'Pending' });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'orders'>('table');

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('vendors').select('id, name, contact, materials, pricing');
    if (error) {
      setError('Failed to load vendors. Please try again.');
      console.error('Fetch Vendors Error:', error.message);
    } else {
      setVendors(data || []);
    }
    setLoading(false);
  }, []);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase.from('vendor_orders').select('*');
    if (error) {
      console.error('Fetch Orders Error:', error.message);
    } else {
      setOrders(data || []);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase.from('projects').select('id, name');
    if (error) {
      console.error('Fetch Projects Error:', error.message);
    } else {
      setProjects(data || []);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchOrders();
    fetchProjects();
  }, [fetchVendors, fetchOrders, fetchProjects]);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newVendor.name || !newVendor.contact || !newVendor.materials || !newVendor.pricing) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    const materials = newVendor.materials.split(',').map((m) => m.trim());
    const pricingEntries = newVendor.pricing.split(',').map((p) => p.trim());
    const pricing: { [material: string]: number } = {};
    materials.forEach((material, index) => {
      pricing[material] = parseFloat(pricingEntries[index]) || 0;
    });
    const { data, error } = await supabase
      .from('vendors')
      .insert([{ ...newVendor, materials, pricing }])
      .select();
    if (error) {
      setError('Failed to add vendor. Please try again.');
      console.error('Add Vendor Error:', error.message);
    } else {
      console.log('Vendor Added:', data);
      setNewVendor({ name: '', contact: '', materials: '', pricing: '' });
      fetchVendors();
    }
    setLoading(false);
  };

  const handleEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendor) return;
    setError('');
    setLoading(true);
    const { data, error } = await supabase
      .from('vendors')
      .update({
        name: editVendor.name,
        contact: editVendor.contact,
        materials: editVendor.materials,
        pricing: editVendor.pricing,
      })
      .eq('id', editVendor.id)
      .select();
    if (error) {
      setError('Failed to update vendor. Please try again.');
      console.error('Update Vendor Error:', error.message);
    } else {
      console.log('Vendor Updated:', data);
      setEditVendor(null);
      fetchVendors();
    }
    setLoading(false);
  };

  const handleDeleteVendor = async (vendorId: number) => {
    setError('');
    setLoading(true);
    const { error } = await supabase.from('vendors').delete().eq('id', vendorId);
    if (error) {
      setError('Failed to delete vendor. Please try again.');
      console.error('Delete Vendor Error:', error.message);
    } else {
      console.log('Vendor Deleted:', vendorId);
      fetchVendors();
    }
    setLoading(false);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newOrder.vendor_id || !newOrder.project_id || !newOrder.materials) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    const materialsEntries = newOrder.materials.split(',').map((m) => m.trim());
    const materials: { [material: string]: number } = {};
    materialsEntries.forEach((entry) => {
      const [material, quantity] = entry.split(':').map((s) => s.trim());
      materials[material] = parseInt(quantity) || 0;
    });
    const { data, error } = await supabase
      .from('vendor_orders')
      .insert([{ ...newOrder, materials, order_date: new Date().toISOString() }])
      .select();
    if (error) {
      setError('Failed to place order. Please try again.');
      console.error('Place Order Error:', error.message);
    } else {
      console.log('Order Placed:', data);
      setNewOrder({ vendor_id: 0, project_id: 0, materials: '', status: 'Pending' });
      fetchOrders();
    }
    setLoading(false);
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    setError('');
    setLoading(true);
    const { data, error } = await supabase
      .from('vendor_orders')
      .update({ status })
      .eq('id', orderId)
      .select();
    if (error) {
      setError('Failed to update order status. Please try again.');
      console.error('Update Order Status Error:', error.message);
    } else {
      console.log('Order Status Updated:', data);
      fetchOrders();
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Vendors</h1>
      {loading && <p className="text-yellow-500 mb-4 animate-pulse text-center">Loading...</p>}
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

      <div className="mb-4">
        <button
          onClick={() => setViewMode('table')}
          className={`btn-yellow mr-2 ${viewMode === 'table' ? 'bg-yellow-600' : ''}`}
        >
          Table View
        </button>
        <button
          onClick={() => setViewMode('orders')}
          className={`btn-yellow ${viewMode === 'orders' ? 'bg-yellow-600' : ''}`}
        >
          Orders View
        </button>
      </div>

      {viewMode === 'table' ? (
        <>
          <form onSubmit={handleAddVendor} className="mb-8 bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="grid grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Name"
                value={newVendor.name}
                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus-outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <input
                type="text"
                placeholder="Contact"
                value={newVendor.contact}
                onChange={(e) => setNewVendor({ ...newVendor, contact: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <input
                type="text"
                placeholder="Materials (comma-separated)"
                value={newVendor.materials}
                onChange={(e) => setNewVendor({ ...newVendor, materials: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <input
                type="text"
                placeholder="Pricing (comma-separated, same order as materials)"
                value={newVendor.pricing}
                onChange={(e) => setNewVendor({ ...newVendor, pricing: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <button type="submit" className="btn-yellow" disabled={loading}>
                {loading ? 'Adding...' : 'Add Vendor'}
              </button>
            </div>
          </form>

          {editVendor && (
            <form onSubmit={handleEditVendor} className="mb-8 bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="grid grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={editVendor.name}
                  onChange={(e) => setEditVendor({ ...editVendor, name: e.target.value })}
                  className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Contact"
                  value={editVendor.contact}
                  onChange={(e) => setEditVendor({ ...editVendor, contact: e.target.value })}
                  className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Materials (comma-separated)"
                  value={editVendor.materials.join(',')}
                  onChange={(e) => setEditVendor({ ...editVendor, materials: e.target.value.split(',').map((m) => m.trim()) })}
                  className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Pricing (comma-separated, same order as materials)"
                  value={Object.values(editVendor.pricing).join(',')}
                  onChange={(e) => {
                    const pricingEntries = e.target.value.split(',').map((p) => p.trim());
                    const pricing: { [material: string]: number } = {};
                    editVendor.materials.forEach((material, index) => {
                      pricing[material] = parseFloat(pricingEntries[index]) || 0;
                    });
                    setEditVendor({ ...editVendor, pricing });
                  }}
                  className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
                <button type="submit" className="btn-yellow" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Vendor'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditVendor(null)}
                  className="btn-yellow bg-red-500 hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Contact</th>
                <th className="text-left">Materials</th>
                <th className="text-left">Pricing</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-700 transition-colors duration-200">
                  <td>{vendor.name}</td>
                  <td>{vendor.contact}</td>
                  <td>{vendor.materials.join(', ')}</td>
                  <td>
                    {Object.entries(vendor.pricing).map(([material, price]) => (
                      <div key={material}>{`${material}: $${price}`}</div>
                    ))}
                  </td>
                  <td>
                    <button
                      onClick={() => setEditVendor(vendor)}
                      className="btn-yellow mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVendor(vendor.id)}
                      className="btn-yellow bg-red-500 hover:bg-red-600"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <form onSubmit={handlePlaceOrder} className="mb-8 bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="grid grid-cols-4 gap-4">
              <select
                value={newOrder.vendor_id}
                onChange={(e) => setNewOrder({ ...newOrder, vendor_id: parseInt(e.target.value) })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value={0}>Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              <select
                value={newOrder.project_id}
                onChange={(e) => setNewOrder({ ...newOrder, project_id: parseInt(e.target.value) })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value={0}>Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Materials (material:quantity, comma-separated)"
                value={newOrder.materials}
                onChange={(e) => setNewOrder({ ...newOrder, materials: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <select
                value={newOrder.status}
                onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="Pending">Pending</option>
                <option value="Ordered">Ordered</option>
                <option value="Delivered">Delivered</option>
              </select>
              <button type="submit" className="btn-yellow" disabled={loading}>
                {loading ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </form>

          <h2 className="text-xl font-bold mb-4 text-yellow-500">Vendor Orders</h2>
          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-left">Vendor</th>
                <th className="text-left">Project</th>
                <th className="text-left">Materials</th>
                <th className="text-left">Order Date</th>
                <th className="text-left">Status</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-700 transition-colors duration-200">
                  <td>{vendors.find((v) => v.id === order.vendor_id)?.name || 'Unknown'}</td>
                  <td>{projects.find((p) => p.id === order.project_id)?.name || 'Unknown'}</td>
                  <td>
                    {Object.entries(order.materials).map(([material, quantity]) => (
                      <div key={material}>{`${material}: ${quantity}`}</div>
                    ))}
                  </td>
                  <td>{new Date(order.order_date).toLocaleDateString()}</td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      className="p-1 rounded bg-gray-700 text-white"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Ordered">Ordered</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, order.status)}
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
        </>
      )}
    </div>
  );
}