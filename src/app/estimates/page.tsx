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
  square_footage?: number;
  asphalt_thickness?: string;
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
    square_footage: 0,
    asphalt_thickness: '2',
  });
  const [editEstimate, setEditEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState('');
  const pdfRef = useRef<HTMLDivElement>(null);

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('id, name');
    if (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to load customers.');
    } else {
      setCustomers(data || []);
    }
  };

  const fetchEstimates = async () => {
    const { data, error } = await supabase.from('estimates').select('*');
    if (error) {
      console.error('Error fetching estimates:', error);
      setError('Failed to load estimates.');
    } else {
      setEstimates(data || []);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchEstimates();
  }, []);

  const calculateCost = (squareFootage: number, thickness: string) => {
    const baseRate = 2; // $2 per square foot
    const thicknessMultiplier = thickness === '2' ? 1 : thickness === '3' ? 1.2 : 1.5; // 20% more for 3", 50% more for 4"
    return squareFootage * baseRate * thicknessMultiplier;
  };

  const handleSquareFootageChange = (squareFootage: number) => {
    const cost = calculateCost(squareFootage, newEstimate.asphalt_thickness);
    setNewEstimate({ ...newEstimate, square_footage, cost });
  };

  const handleThicknessChange = (thickness: string) => {
    const cost = calculateCost(newEstimate.square_footage || 0, thickness);
    setNewEstimate({ ...newEstimate, asphalt_thickness: thickness, cost });
  };

  const handleAddEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newEstimate.project_name || !newEstimate.customer_id || !newEstimate.description || !newEstimate.square_footage) {
      setError('All fields are required.');
      return;
    }

    const { error } = await supabase.from('estimates').insert([{
      ...newEstimate,
      customer_id: parseInt(newEstimate.customer_id),
      cost: parseFloat(newEstimate.cost.toString()),
    }]);
    if (error) {
      setError('Error adding estimate: ' + error.message);
    } else {
      setNewEstimate({
        project_name: '',
        customer_id: '',
        description: '',
        cost: 0,
        status: 'Draft',
        square_footage: 0,
        asphalt_thickness: '2',
      });
      fetchEstimates();
    }
  };

  const handleEditEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEstimate) return;
    setError('');
    const { error } = await supabase
      .from('estimates')
      .update({
        project_name: editEstimate.project_name,
        customer_id: editEstimate.customer_id,
        description: editEstimate.description,
        cost: editEstimate.cost,
        status: editEstimate.status,
        square_footage: editEstimate.square_footage,
        asphalt_thickness: editEstimate.asphalt_thickness,
      })
      .eq('id', editEstimate.id);
    if (error) {
      setError('Error updating estimate: ' + error.message);
    } else {
      setEditEstimate(null);
      fetchEstimates();
    }
  };

  const generatePDF = async (estimate: Estimate) => {
    const element = pdfRef.current;
    if (!element) return;

    // Populate the hidden div with the estimate content
    element.innerHTML = `
      <div style="padding: 20px; background: #1f2937; color: white; font-family: Montserrat, sans-serif;">
        <img src="/logo.png" alt="LG Asphalt Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="font-size: 24px; margin-bottom: 10px;">LG Asphalt Estimate</h1>
        <p><strong>Project:</strong> ${estimate.project_name}</p>
        <p><strong>Description:</strong> ${estimate.description}</p>
        <p><strong>Square Footage:</strong> ${estimate.square_footage || 'N/A'} sq ft</p>
        <p><strong>Asphalt Thickness:</strong> ${estimate.asphalt_thickness || 'N/A'} inches</p>
        <p><strong>Cost:</strong> $${estimate.cost}</p>
        <p><strong>Status:</strong> ${estimate.status}</p>
      </div>
    `;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const doc = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 190; // A4 width is 210mm, leaving 10mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    doc.save(`${estimate.project_name}_estimate.pdf`);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Estimates</h1>
      <form onSubmit={editEstimate ? handleEditEstimate : handleAddEstimate} className="mb-8 bg-gray-800 p-6 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Project Name"
            value={editEstimate ? editEstimate.project_name : newEstimate.project_name}
            onChange={(e) =>
              editEstimate
                ? setEditEstimate({ ...editEstimate, project_name: e.target.value })
                : setNewEstimate({ ...newEstimate, project_name: e.target.value })
            }
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <select
            value={editEstimate ? editEstimate.customer_id : newEstimate.customer_id}
            onChange={(e) =>
              editEstimate
                ? setEditEstimate({ ...editEstimate, customer_id: parseInt(e.target.value) })
                : setNewEstimate({ ...newEstimate, customer_id: e.target.value })
            }
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
            value={editEstimate ? editEstimate.description : newEstimate.description}
            onChange={(e) =>
              editEstimate
                ? setEditEstimate({ ...editEstimate, description: e.target.value })
                : setNewEstimate({ ...newEstimate, description: e.target.value })
            }
            className="p-2 rounded bg-gray-700 text-white col-span-2"
            required
          />
          <input
            type="number"
            placeholder="Square Footage"
            value={editEstimate ? editEstimate.square_footage || 0 : newEstimate.square_footage || 0}
            onChange={(e) =>
              editEstimate
                ? setEditEstimate({ ...editEstimate, square_footage: parseFloat(e.target.value), cost: calculateCost(parseFloat(e.target.value), editEstimate.asphalt_thickness || '2') })
                : handleSquareFootageChange(parseFloat(e.target.value))
            }
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <select
            value={editEstimate ? editEstimate.asphalt_thickness || '2' : newEstimate.asphalt_thickness}
            onChange={(e) =>
              editEstimate
                ? setEditEstimate({ ...editEstimate, asphalt_thickness: e.target.value, cost: calculateCost(editEstimate.square_footage || 0, e.target.value) })
                : handleThicknessChange(e.target.value)
            }
            className="p-2 rounded bg-gray-700 text-white"
          >
            <option value="2">2 inches</option>
            <option value="3">3 inches</option>
            <option value="4">4 inches</option>
          </select>
          <input
            type="number"
            placeholder="Cost"
            value={editEstimate ? editEstimate.cost : newEstimate.cost}
            onChange={(e) =>
              editEstimate
                ? setEditEstimate({ ...editEstimate, cost: parseFloat(e.target.value) })
                : setNewEstimate({ ...newEstimate, cost: parseFloat(e.target.value) })
            }
            className="p-2 rounded bg-gray-700 text-white"
            readOnly
          />
          <select
            value={editEstimate ? editEstimate.status : newEstimate.status}
            onChange={(e) =>
              editEstimate
                ? setEditEstimate({ ...editEstimate, status: e.target.value })
                : setNewEstimate({ ...newEstimate, status: e.target.value })
            }
            className="p-2 rounded bg-gray-700 text-white"
          >
            <option value="Draft">Draft</option>
            <option value="Final">Final</option>
          </select>
          <button type="submit" className="btn-yellow col-span-2">
            {editEstimate ? 'Update Estimate' : 'Add Estimate'}
          </button>
          {editEstimate && (
            <button
              type="button"
              onClick={() => setEditEstimate(null)}
              className="btn-yellow bg-red-500 hover:bg-red-600 col-span-2"
            >
              Cancel
            </button>
          )}
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
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
                  onClick={() => setEditEstimate(estimate)}
                  className="btn-yellow mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (pdfRef.current) {
                      pdfRef.current.innerHTML = `
                        <div style="padding: 20px; background: #1f2937; color: white;">
                          <img src="/logo.png" alt="LG Asphalt Logo" style="width: 200px; margin-bottom: 20px;" />
                          <h1 style="font-size: 24px; margin-bottom: 10px;">LG Asphalt Estimate</h1>
                          <p><strong>Project:</strong> ${estimate.project_name}</p>
                          <p><strong>Description:</strong> ${estimate.description}</p>
                          <p><strong>Square Footage:</strong> ${estimate.square_footage || 'N/A'} sq ft</p>
                          <p><strong>Asphalt Thickness:</strong> ${estimate.asphalt_thickness || 'N/A'} inches</p>
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
      <div ref={pdfRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} />
    </div>
  );
}