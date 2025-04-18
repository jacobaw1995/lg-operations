'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRouter } from 'next/navigation';

type Customer = {
  id: number;
  name: string;
};

type Estimate = {
  id: number;
  project_name: string;
  customer_id: number;
  description: string;
  cost: number;
  status: string;
  squareFootage?: number;
  asphalt_thickness?: string;
};

function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-1/2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-yellow-500">Edit Estimate</h2>
          <button onClick={onClose} className="text-red-500 hover:text-red-700 transition-colors duration-200">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Estimates() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [newEstimate, setNewEstimate] = useState({
    project_name: '',
    customer_id: '',
    description: '',
    cost: 0,
    status: 'Draft',
    squareFootage: 0,
    asphalt_thickness: '2',
  });
  const [editEstimate, setEditEstimate] = useState<Estimate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pdfRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('customers').select('id, name');
    if (error) {
      setError('Failed to load customers. Please try again.');
      console.error('Fetch Customers Error:', error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const fetchEstimates = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('estimates').select('*');
    if (error) {
      setError('Failed to load estimates. Please try again.');
      console.error('Fetch Estimates Error:', error);
    } else {
      setEstimates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
    fetchEstimates();
  }, []);

  const calculateCost = (squareFootage: number, asphaltThickness: string) => {
    const baseRate = 2;
    const thicknessMultiplier = asphaltThickness === '2' ? 1 : asphaltThickness === '3' ? 1.2 : 1.5;
    return squareFootage * baseRate * thicknessMultiplier;
  };

  const handleSquareFootageChange = (squareFootage: number) => {
    const cost = calculateCost(squareFootage, newEstimate.asphalt_thickness);
    setNewEstimate({ ...newEstimate, squareFootage, cost });
  };

  const handleThicknessChange = (thickness: string) => {
    const cost = calculateCost(newEstimate.squareFootage || 0, thickness);
    setNewEstimate({ ...newEstimate, asphalt_thickness: thickness, cost });
  };

  const validateForm = (estimate: { project_name: string; customer_id: string | number; description: string; squareFootage?: number; asphalt_thickness?: string }) => {
    if (!estimate.project_name || !estimate.customer_id || !estimate.description) {
      setError('All fields are required.');
      return false;
    }
    const squareFootage = estimate.squareFootage ?? 0;
    if (squareFootage <= 0) {
      setError('Square footage must be a positive number.');
      return false;
    }
    return true;
  };

  const handleAddEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm(newEstimate)) return;

    setLoading(true);
    const { error } = await supabase.from('estimates').insert([{
      ...newEstimate,
      customer_id: parseInt(newEstimate.customer_id),
      cost: parseFloat(newEstimate.cost.toString()),
      square_footage: newEstimate.squareFootage,
    }]);
    if (error) {
      setError('Failed to add estimate. Please try again.');
      console.error('Estimate Insert Error:', error);
    } else {
      setNewEstimate({ project_name: '', customer_id: '', description: '', cost: 0, status: 'Draft', squareFootage: 0, asphalt_thickness: '2' });
      fetchEstimates();
    }
    setLoading(false);
  };

  const handleEditEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEstimate) return;
    setError('');
    if (!validateForm(editEstimate)) return;

    setLoading(true);
    const { error } = await supabase
      .from('estimates')
      .update({
        ...editEstimate,
        customer_id: parseInt(editEstimate.customer_id.toString()),
        cost: parseFloat(editEstimate.cost.toString()),
        square_footage: editEstimate.squareFootage ?? 0,
      })
      .eq('id', editEstimate.id);
    if (error) {
      setError('Failed to update estimate. Please try again.');
      console.error('Estimate Update Error:', error);
    } else {
      setEditEstimate(null);
      setIsModalOpen(false);
      fetchEstimates();
    }
    setLoading(false);
  };

  const generateWorkOrder = async (estimate: Estimate) => {
    if (estimate.status !== 'Final') {
      setError('Work Orders can only be generated for Final estimates.');
      return;
    }

    setLoading(true);
    setError('');
    const workOrderData = {
      estimate_id: estimate.id,
      project_name: estimate.project_name,
      customer_id: estimate.customer_id,
      description: estimate.description,
      assigned_to: '',
      status: 'Open',
    };

    const { error } = await supabase.from('work_orders').insert([workOrderData]);
    if (error) {
      setError('Failed to generate work order. Please try again.');
      console.error('Work Order Insert Error:', error);
    } else {
      router.push('/work-orders');
    }
    setLoading(false);
  };

  const generatePDF = async (estimate: Estimate) => {
    const element = pdfRef.current;
    if (!element) return;

    element.innerHTML = `
      <div style="padding: 30px; background: #1f2937; color: white; font-family: 'Montserrat', sans-serif;">
        <img src="/logo.png" alt="LG Asphalt Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">LG Asphalt Estimate</h1>
        <p style="margin-bottom: 10px;"><strong>Project:</strong> ${estimate.project_name}</p>
        <p style="margin-bottom: 10px;"><strong>Description:</strong> ${estimate.description}</p>
        <p style="margin-bottom: 10px;"><strong>Square Footage:</strong> ${estimate.squareFootage || 0} sq ft</p>
        <p style="margin-bottom: 10px;"><strong>Asphalt Thickness:</strong> ${estimate.asphalt_thickness || 'N/A'} inches</p>
        <p style="margin-bottom: 10px;"><strong>Cost:</strong> $${estimate.cost}</p>
        <p style="margin-bottom: 10px;"><strong>Status:</strong> ${estimate.status}</p>
      </div>
    `;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    doc.save(`${estimate.project_name}_estimate.pdf`);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Estimates</h1>
      <form onSubmit={handleAddEstimate} className="mb-8 bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Project Name"
            value={newEstimate.project_name}
            onChange={(e) => setNewEstimate({ ...newEstimate, project_name: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <select
            value={newEstimate.customer_id}
            onChange={(e) => setNewEstimate({ ...newEstimate, customer_id: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Description"
            value={newEstimate.description}
            onChange={(e) => setNewEstimate({ ...newEstimate, description: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white col-span-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <input
            type="number"
            placeholder="Square Footage"
            value={newEstimate.squareFootage}
            onChange={(e) => handleSquareFootageChange(parseFloat(e.target.value) || 0)}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <select
            value={newEstimate.asphalt_thickness}
            onChange={(e) => handleThicknessChange(e.target.value)}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          >
            <option value="2">2 inches</option>
            <option value="3">3 inches</option>
            <option value="4">4 inches</option>
          </select>
          <input
            type="number"
            placeholder="Cost"
            value={newEstimate.cost}
            onChange={(e) => setNewEstimate({ ...newEstimate, cost: parseFloat(e.target.value) })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            readOnly
          />
          <select
            value={newEstimate.status}
            onChange={(e) => setNewEstimate({ ...newEstimate, status: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="Draft">Draft</option>
            <option value="Final">Final</option>
          </select>
          <button type="submit" className="btn-yellow col-span-2" disabled={loading}>
            {loading ? 'Adding...' : 'Add Estimate'}
          </button>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {editEstimate && (
          <form onSubmit={handleEditEstimate} className="mb-8">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Project Name"
                value={editEstimate.project_name}
                onChange={(e) => setEditEstimate({ ...editEstimate, project_name: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <select
                value={editEstimate.customer_id}
                onChange={(e) => setEditEstimate({ ...editEstimate, customer_id: parseInt(e.target.value) })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Description"
                value={editEstimate.description}
                onChange={(e) => setEditEstimate({ ...editEstimate, description: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white col-span-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <input
                type="number"
                placeholder="Square Footage"
                value={editEstimate.squareFootage ?? 0}
                onChange={(e) => {
                  const squareFootage = parseFloat(e.target.value) || 0;
                  const cost = calculateCost(squareFootage, editEstimate.asphalt_thickness || '2');
                  setEditEstimate({ ...editEstimate, squareFootage, cost });
                }}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <select
                value={editEstimate.asphalt_thickness || '2'}
                onChange={(e) => {
                  const thickness = e.target.value;
                  const cost = calculateCost(editEstimate.squareFootage ?? 0, thickness);
                  setEditEstimate({ ...editEstimate, asphalt_thickness: thickness, cost });
                }}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              >
                <option value="2">2 inches</option>
                <option value="3">3 inches</option>
                <option value="4">4 inches</option>
              </select>
              <input
                type="number"
                placeholder="Cost"
                value={editEstimate.cost}
                onChange={(e) => setEditEstimate({ ...editEstimate, cost: parseFloat(e.target.value) })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                readOnly
              />
              <select
                value={editEstimate.status}
                onChange={(e) => setEditEstimate({ ...editEstimate, status: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="Draft">Draft</option>
                <option value="Final">Final</option>
              </select>
              <button type="submit" className="btn-yellow" disabled={loading}>
                {loading ? 'Updating...' : 'Update Estimate'}
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
            <th className="text-left">Cost</th>
            <th className="text-left">Status</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {estimates.map((estimate) => (
            <tr key={estimate.id} className="hover:bg-gray-700 transition-colors duration-200">
              <td>{estimate.project_name}</td>
              <td>{estimate.description}</td>
              <td>${estimate.cost}</td>
              <td>{estimate.status}</td>
              <td>
                <button
                  onClick={() => {
                    setEditEstimate(estimate);
                    setIsModalOpen(true);
                  }}
                  className="btn-yellow mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => generatePDF(estimate)}
                  className="btn-yellow mr-2"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => generateWorkOrder(estimate)}
                  className="btn-yellow"
                  disabled={estimate.status !== 'Final'}
                >
                  Generate Work Order
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div ref={pdfRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} />
    </div>
  );
}