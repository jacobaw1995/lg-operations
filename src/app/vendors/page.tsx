'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Vendor = {
  id: number;
  name: string;
  contact: string;
  materials: string[];
  pricing: { [key: string]: number };
};

type VendorOrder = {
  id: number;
  vendor_id: number;
  project_id: number;
  material: string;
  quantity: number;
  total_cost: number;
  status: string;
  order_date: string;
  project: { name: string };
};

type Project = {
  id: number;
  name: string;
};

function Modal({ isOpen, onClose, children, title }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-1/2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-yellow-500">{title}</h2>
          <button onClick={onClose} className="text-red-500 hover:text-red-700 transition-colors duration-200">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [newVendor, setNewVendor] = useState({ name: '', contact: '', materials: [] as string[], pricing: {} as { [key: string]: number } });
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [vendorOrders, setVendorOrders] = useState<VendorOrder[]>([]);
  const [newOrder, setNewOrder] = useState({ vendor_id: 0, project_id: 0, material: '', quantity: 0, order_date: '', status: 'Ordered' });
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const fetchVendors = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('vendors').select('*');
    if (error) {
      setError('Failed to load vendors. Please try again.');
      console.error('Fetch Vendors Error:', error);
    } else {
      setVendors(data || []);
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('id, name');
    if (error) {
      console.error('Fetch Projects Error:', error);
    } else {
      setProjects(data || []);
    }
  };

  const fetchVendorOrders = async (vendorId: number) => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('vendor_orders')
      .select('id, vendor_id, project_id, material, quantity, total_cost, status, order_date, project:projects(name)')
      .eq('vendor_id', vendorId);
    if (error) {
      setError('Failed to load vendor orders. Please try again.');
      console.error('Fetch Vendor Orders Error:', error);
    } else {
      // Map the response to ensure project is an object
      const mappedData = data.map((order) => ({
        ...order,
        project: Array.isArray(order.project) ? order.project[0] || { name: '' } : order.project,
      }));
      setVendorOrders(mappedData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVendors();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      fetchVendorOrders(selectedVendor.id);
    }
  }, [selectedVendor]);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newVendor.name || !newVendor.contact || newVendor.materials.length === 0 || Object.keys(newVendor.pricing).length === 0) {
      setError('All fields are required, including at least one material and pricing.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from('vendors').insert([newVendor]).select();
    if (error) {
      setError('Failed to add vendor. Please try again.');
      console.error('Vendor Insert Error:', error);
    } else {
      console.log('Vendor Added:', data);
      setNewVendor({ name: '', contact: '', materials: [], pricing: {} });
      fetchVendors();
    }
    setLoading(false);
  };

  const handleEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendor) return;
    setError('');
    if (!editVendor.name || !editVendor.contact || editVendor.materials.length === 0 || Object.keys(editVendor.pricing).length === 0) {
      setError('All fields are required, including at least one material and pricing.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('vendors')
      .update(editVendor)
      .eq('id', editVendor.id)
      .select();
    if (error) {
      setError('Failed to update vendor. Please try again.');
      console.error('Vendor Update Error:', error);
    } else {
      console.log('Vendor Updated:', data);
      setEditVendor(null);
      setIsModalOpen(false);
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
      console.error('Vendor Delete Error:', error);
    } else {
      fetchVendors();
    }
    setLoading(false);
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newOrder.vendor_id || !newOrder.project_id || !newOrder.material || newOrder.quantity <= 0 || !newOrder.order_date) {
      setError('All fields are required, and quantity must be positive.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from('vendor_orders').insert([newOrder]).select();
    if (error) {
      setError('Failed to add order. Please try again.');
      console.error('Add Order Error:', error);
    } else {
      console.log('Order Added:', data);
      await supabase.from('vendor_project_links').insert([{
        vendor_id: newOrder.vendor_id,
        project_id: newOrder.project_id,
      }]);
      setNewOrder({ vendor_id: 0, project_id: 0, material: '', quantity: 0, order_date: '', status: 'Ordered' });
      setIsOrderModalOpen(false);
      if (selectedVendor) {
        fetchVendorOrders(selectedVendor.id);
      }
    }
    setLoading(false);
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    setError('');
    setLoading(true);
    const { error } = await supabase
      .from('vendor_orders')
      .update({ status })
      .eq('id', orderId);
    if (error) {
      setError('Failed to update order status. Please try again.');
      console.error('Update Order Status Error:', error);
    } else {
      if (selectedVendor) {
        fetchVendorOrders(selectedVendor.id);
      }
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Vendors</h1>
      <form onSubmit={handleAddVendor} className="mb-8 bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="grid grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={newVendor.name}
            onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
            value={newVendor.materials.join(', ')}
            onChange={(e) => setNewVendor({ ...newVendor, materials: e.target.value.split(',').map((m) => m.trim()) })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <input
            type="text"
            placeholder="Pricing (e.g., Asphalt:100,Gravel:50)"
            value={Object.entries(newVendor.pricing).map(([material, price]) => `${material}:${price}`).join(', ')}
            onChange={(e) => {
              const pricing: { [key: string]: number } = {};
              e.target.value.split(',').forEach((pair) => {
                const [material, price] = pair.split(':').map((p) => p.trim());
                if (material && price) {
                  pricing[material] = parseFloat(price) || 0;
                }
              });
              setNewVendor({ ...newVendor, pricing });
            }}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <button type="submit" className="btn-yellow" disabled={loading}>
            {loading ? 'Adding...' : 'Add Vendor'}
          </button>
        </div>
      </form>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Vendor">
        {editVendor && (
          <form onSubmit={handleEditVendor}>
            <div className="grid grid-cols-2 gap-4">
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
                value={editVendor.materials.join(', ')}
                onChange={(e) => setEditVendor({ ...editVendor, materials: e.target.value.split(',').map((m) => m.trim()) })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <input
                type="text"
                placeholder="Pricing (e.g., Asphalt:100,Gravel:50)"
                value={Object.entries(editVendor.pricing).map(([material, price]) => `${material}:${price}`).join(', ')}
                onChange={(e) => {
                  const pricing: { [key: string]: number } = {};
                  e.target.value.split(',').forEach((pair) => {
                    const [material, price] = pair.split(':').map((p) => p.trim());
                    if (material && price) {
                      pricing[material] = parseFloat(price) || 0;
                    }
                  });
                  setEditVendor({ ...editVendor, pricing });
                }}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <button type="submit" className="btn-yellow" disabled={loading}>
                {loading ? 'Updating...' : 'Update Vendor'}
              </button>
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </form>
        )}
      </Modal>
      <Modal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} title="Place Vendor Order">
        <form onSubmit={handleAddOrder}>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={newOrder.vendor_id}
              onChange={(e) => setNewOrder({ ...newOrder, vendor_id: parseInt(e.target.value) })}
              className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            >
              <option value="">Select Vendor</option>
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
              required
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              value={newOrder.material}
              onChange={(e) => setNewOrder({ ...newOrder, material: e.target.value })}
              className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            >
              <option value="">Select Material</option>
              {newOrder.vendor_id && vendors.find((v) => v.id === newOrder.vendor_id)?.materials.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Quantity"
              value={newOrder.quantity}
              onChange={(e) => setNewOrder({ ...newOrder, quantity: parseFloat(e.target.value) || 0 })}
              className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
            <input
              type="date"
              placeholder="Order Date"
              value={newOrder.order_date}
              onChange={(e) => setNewOrder({ ...newOrder, order_date: e.target.value })}
              className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
            <select
              value={newOrder.status}
              onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })}
              className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="Ordered">Ordered</option>
              <option value="Delivered">Delivered</option>
            </select>
            <button type="submit" className="btn-yellow" disabled={loading}>
              {loading ? 'Adding...' : 'Place Order'}
            </button>
          </div>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </form>
      </Modal>
      {loading && <p className="text-yellow-500 mb-4 animate-pulse">Loading...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <table className="table mb-8 w-full">
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
              <td>{Object.entries(vendor.pricing).map(([material, price]) => `${material}: $${price}`).join(', ')}</td>
              <td>
                <button
                  onClick={() => {
                    setEditVendor(vendor);
                    setIsModalOpen(true);
                  }}
                  className="btn-yellow mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteVendor(vendor.id)}
                  className="btn-yellow bg-red-500 hover:bg-red-600 mr-2"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedVendor(vendor)}
                  className="btn-yellow"
                >
                  View Orders
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedVendor && (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-yellow-500">{selectedVendor.name} - Orders</h2>
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="btn-yellow mb-4"
          >
            Place Order
          </button>
          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-left">Project</th>
                <th className="text-left">Material</th>
                <th className="text-left">Quantity</th>
                <th className="text-left">Total Cost</th>
                <th className="text-left">Order Date</th>
                <th className="text-left">Status</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendorOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-700 transition-colors duration-200">
                  <td>{order.project.name}</td>
                  <td>{order.material}</td>
                  <td>{order.quantity}</td>
                  <td>${order.total_cost}</td>
                  <td>{order.order_date}</td>
                  <td>{order.status}</td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="Ordered">Ordered</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}