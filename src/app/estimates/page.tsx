'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  squareFootage?: number; // Add squareFootage (camelCase)
  asphalt_thickness?: string; // Add asphalt_thickness (optional, based on your usage)
};

export default function Estimates() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [newEstimate, setNewEstimate] = useState({
    project_name: '',
    customer_id: '',
    description: '',
    cost: 0,
    status: 'Draft',
    squareFootage: 0, // Use camelCase
    asphalt_thickness: '', // Add if used
  });
  const [editEstimate, setEditEstimate] = useState<Estimate | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name');
    setCustomers(data || []);
  };

  const fetchEstimates = async () => {
    const { data } = await supabase.from('estimates').select('*');
    setEstimates(data || []);
  };

  useEffect(() => {
    fetchCustomers();
    fetchEstimates();
  }, []);

  const calculateCost = (squareFootage: number, asphaltThickness: string) => {
    // Example calculation; adjust based on your logic
    const thickness = parseFloat(asphaltThickness) || 0;
    return squareFootage * thickness * 10; // Placeholder formula
  };

  const handleSquareFootageChange = (squareFootage: number) => {
    const cost = calculateCost(squareFootage, newEstimate.asphalt_thickness || '');
    setNewEstimate({ ...newEstimate, squareFootage, cost }); // Use squareFootage (camelCase)
  };

  const handleThicknessChange = (thickness: string) => {
    const cost = calculateCost(newEstimate.squareFootage || 0, thickness);
    setNewEstimate({ ...newEstimate, asphalt_thickness: thickness, cost });
  };

  const handleAddEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('estimates').insert([{
      ...newEstimate,
      customer_id: parseInt(newEstimate.customer_id),
      cost: parseFloat(newEstimate.cost.toString()),
      square_footage: newEstimate.squareFootage, // Match DB column name if snake_case
    }]);
    if (error) console.error('Estimate Insert Error:', error);
    else {
      setNewEstimate({ project_name: '', customer_id: '', description: '', cost: 0, status: 'Draft', squareFootage: 0, asphalt_thickness: '' });
      fetchEstimates();
    }
  };

  const handleEditEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEstimate) return;
    const { error } = await supabase
      .from('estimates')
      .update({
        ...editEstimate,
        customer_id: parseInt(editEstimate.customer_id.toString()),
        cost: parseFloat(editEstimate.cost.toString()),
        square_footage: editEstimate.squareFootage, // Match DB column name
      })
      .eq('id', editEstimate.id);
    if (error) console.error('Estimate Update Error:', error);
    else {
      setEditEstimate(null);
      fetchEstimates();
    }
  };

  const generatePDF = async (estimate: Estimate) => {
    const element = pdfRef.current;
    if (!element) return;
    element.innerHTML = `
      <div style="padding: 20px; background: #1f2937; color: white;">
        <h1 style="font-size: 24px; margin-bottom: 10px;">LG Asphalt Estimate</h1>
        <p><strong>Project:</strong> ${estimate.project_name}</p>
        <p><strong>Description:</strong> ${estimate.description}</p>
        <p><strong>Cost:</strong> $${estimate.cost}</p>
        <p><strong>Status:</strong> ${estimate.status}</p>
        <p><strong>Square Footage:</strong> ${estimate.squareFootage || 0}</p>
        <p><strong>Asphalt Thickness:</strong> ${estimate.asphalt_thickness || 'N/A'}</p>
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
      <form onSubmit={handleAddEstimate} className="mb-8 bg-gray-800 p-6 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Project Name"
            value={newEstimate.project_name}
            onChange={(e) => setNewEstimate({ ...newEstimate, project_name: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <select
            value={newEstimate.customer_id}
            onChange={(e) => setNewEstimate({ ...newEstimate, customer_id: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
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
            className="p-2 rounded bg-gray-700 text-white col-span-2"
            required
          />
          <input
            type="number"
            placeholder="Square Footage"
            value={newEstimate.squareFootage}
            onChange={(e) => handleSquareFootageChange(parseFloat(e.target.value) || 0)}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <input
            type="text"
            placeholder="Asphalt Thickness"
            value={newEstimate.asphalt_thickness}
            onChange={(e) => handleThicknessChange(e.target.value)}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <input
            type="number"
            placeholder="Cost"
            value={newEstimate.cost}
            onChange={(e) => setNewEstimate({ ...newEstimate, cost: parseFloat(e.target.value) })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <select
            value={newEstimate.status}
            onChange={(e) => setNewEstimate({ ...newEstimate, status: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
          >
            <option value="Draft">Draft</option>
            <option value="Final">Final</option>
          </select>
          <button type="submit" className="btn-yellow col-span-2">
            Add Estimate
          </button>
        </div>
      </form>
      {editEstimate && (
        <form onSubmit={handleEditEstimate} className="mb-8 bg-gray-800 p-6 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={editEstimate.project_name}
              onChange={(e) => setEditEstimate({ ...editEstimate, project_name: e.target.value })}
              className="p-2 rounded bg-gray-700 text-white"
              required
            />
            <select
              value={editEstimate.customer_id}
              onChange={(e) => setEditEstimate({ ...editEstimate, customer_id: parseInt(e.target.value) })}
              className="p-2 rounded bg-gray-700 text-white"
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
              value={editEstimate.description}
              onChange={(e) => setEditEstimate({ ...editEstimate, description: e.target.value })}
              className="p-2 rounded bg-gray-700 text-white col-span-2"
              required
            />
            <input
              type="number"
              value={editEstimate.squareFootage || 0}
              onChange={(e) => setEditEstimate({ ...editEstimate, squareFootage: parseFloat(e.target.value) })}
              className="p-2 rounded bg-gray-700 text-white"
              required
            />
            <input
              type="text"
              value={editEstimate.asphalt_thickness || ''}
              onChange={(e) => setEditEstimate({ ...editEstimate, asphalt_thickness: e.target.value })}
              className="p-2 rounded bg-gray-700 text-white"
              required
            />
            <input
              type="number"
              value={editEstimate.cost}
              onChange={(e) => setEditEstimate({ ...editEstimate, cost: parseFloat(e.target.value) })}
              className="p-2 rounded bg-gray-700 text-white"
              required
            />
            <select
              value={editEstimate.status}
              onChange={(e) => setEditEstimate({ ...editEstimate, status: e.target.value })}
              className="p-2 rounded bg-gray-700 text-white"
            >
              <option value="Draft">Draft</option>
              <option value="Final">Final</option>
            </select>
            <button type="submit" className="btn-yellow">
              Update Estimate
            </button>
            <button
              type="button"
              onClick={() => setEditEstimate(null)}
              className="btn-yellow bg-red-500 hover:bg-red-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Description</th>
            <th>Cost</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {estimates.map((estimate) => (
            <tr key={estimate.id}>
              <td>{estimate.project_name}</td>
              <td>{estimate.description}</td>
              <td>${estimate.cost}</td>
              <td>{estimate.status}</td>
              <td>
                <button
                  onClick={() => setEditEstimate(estimate)}
                  className="btn-yellow mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => generatePDF(estimate)}
                  className="btn-yellow"
                >
                  Download PDF
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