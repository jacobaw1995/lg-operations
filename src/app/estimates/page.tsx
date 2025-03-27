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
  });
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

  const handleAddEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('estimates').insert([{
      ...newEstimate,
      customer_id: parseInt(newEstimate.customer_id),
      cost: parseFloat(newEstimate.cost.toString()),
    }]);
    if (error) {
      console.error(error);
    } else {
      setNewEstimate({ project_name: '', customer_id: '', description: '', cost: 0, status: 'Draft' });
      fetchEstimates();
    }
  };

  const generatePDF = async (estimate: Estimate) => {
    const element = pdfRef.current;
    if (!element) return;

    // Use html2canvas to capture the estimate UI
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    // Create a new PDF
    const doc = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 190; // Width in mm (A4 width is 210mm, leaving 10mm margins)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add the captured image to the PDF
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
                  onClick={() => {
                    // Populate the hidden div with the current estimate data for PDF generation
                    if (pdfRef.current) {
                      pdfRef.current.innerHTML = `
                        <div style="padding: 20px; background: #1f2937; color: white;">
                          <h1 style="font-size: 24px; margin-bottom: 10px;">LG Asphalt Estimate</h1>
                          <p><strong>Project:</strong> ${estimate.project_name}</p>
                          <p><strong>Description:</strong> ${estimate.description}</p>
                          <p><strong>Cost:</strong> $${estimate.cost}</p>
                          <p><strong>Status:</strong> ${estimate.status}</p>
                        </div>
                      `;
                    }
                    generatePDF(estimate);
                  }}
                  className="btn-yellow"
                >
                  Download PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Hidden div for PDF rendering */}
      <div ref={pdfRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} />
    </div>
  );
}