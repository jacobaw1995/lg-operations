'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';

type Contractor = {
  id: number;
  name: string;
  contact: string;
  specialty: string;
  rate: number;
};

type ContractorHour = {
  id: number;
  contractor_id: number;
  task_id: number;
  hours: number;
  payment: number;
  date_worked: string;
  task: { task: string };
};

const localizer = momentLocalizer(moment);

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

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [newContractor, setNewContractor] = useState({ name: '', contact: '', specialty: '', rate: 0 });
  const [editContractor, setEditContractor] = useState<Contractor | null>(null);
  const [contractorHours, setContractorHours] = useState<ContractorHour[]>([]);
  const [newHour, setNewHour] = useState({ contractor_id: 0, task_id: 0, hours: 0, date_worked: '' });
  const [tasks, setTasks] = useState<{ id: number; task: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

  const fetchContractors = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('contractors').select('*');
    if (error) {
      setError('Failed to load contractors. Please try again.');
      console.error('Fetch Contractors Error:', error);
    } else {
      setContractors(data || []);
    }
    setLoading(false);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase.from('tasks').select('id, task');
    if (error) {
      console.error('Fetch Tasks Error:', error);
    } else {
      setTasks(data || []);
    }
  };

  const fetchContractorHours = async (contractorId: number) => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('contractor_hours')
      .select('id, contractor_id, task_id, hours, payment, date_worked, task:tasks(task)')
      .eq('contractor_id', contractorId);
    if (error) {
      setError('Failed to load contractor hours. Please try again.');
      console.error('Fetch Contractor Hours Error:', error);
    } else {
      setContractorHours(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContractors();
    fetchTasks();
  }, []);

  useEffect(() => {
    if (selectedContractor) {
      fetchContractorHours(selectedContractor.id);
    }
  }, [selectedContractor]);

  const handleAddContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newContractor.name || !newContractor.contact || !newContractor.specialty || newContractor.rate <= 0) {
      setError('All fields are required, and rate must be positive.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from('contractors').insert([newContractor]).select();
    if (error) {
      setError('Failed to add contractor. Please try again.');
      console.error('Contractor Insert Error:', error);
    } else {
      console.log('Contractor Added:', data);
      setNewContractor({ name: '', contact: '', specialty: '', rate: 0 });
      fetchContractors();
    }
    setLoading(false);
  };

  const handleEditContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContractor) return;
    setError('');
    if (!editContractor.name || !editContractor.contact || !editContractor.specialty || editContractor.rate <= 0) {
      setError('All fields are required, and rate must be positive.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('contractors')
      .update(editContractor)
      .eq('id', editContractor.id)
      .select();
    if (error) {
      setError('Failed to update contractor. Please try again.');
      console.error('Contractor Update Error:', error);
    } else {
      console.log('Contractor Updated:', data);
      setEditContractor(null);
      setIsModalOpen(false);
      fetchContractors();
    }
    setLoading(false);
  };

  const handleDeleteContractor = async (contractorId: number) => {
    setError('');
    setLoading(true);
    const { error } = await supabase.from('contractors').delete().eq('id', contractorId);
    if (error) {
      setError('Failed to delete contractor. Please try again.');
      console.error('Contractor Delete Error:', error);
    } else {
      fetchContractors();
    }
    setLoading(false);
  };

  const handleAddHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newHour.contractor_id || !newHour.task_id || newHour.hours <= 0 || !newHour.date_worked) {
      setError('All fields are required, and hours must be positive.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from('contractor_hours').insert([newHour]).select();
    if (error) {
      setError('Failed to add hours. Please try again.');
      console.error('Add Hours Error:', error);
    } else {
      console.log('Hours Added:', data);
      setNewHour({ contractor_id: 0, task_id: 0, hours: 0, date_worked: '' });
      setIsHoursModalOpen(false);
      if (selectedContractor) {
        fetchContractorHours(selectedContractor.id);
      }
    }
    setLoading(false);
  };

  const events = contractorHours.map((hour) => ({
    title: `${hour.hours} hours on ${hour.task.task}`,
    start: new Date(hour.date_worked),
    end: new Date(hour.date_worked),
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Contractors</h1>
      <form onSubmit={handleAddContractor} className="mb-8 bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="grid grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={newContractor.name}
            onChange={(e) => setNewContractor({ ...newContractor, name: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <input
            type="text"
            placeholder="Contact"
            value={newContractor.contact}
            onChange={(e) => setNewContractor({ ...newContractor, contact: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <input
            type="text"
            placeholder="Specialty"
            value={newContractor.specialty}
            onChange={(e) => setNewContractor({ ...newContractor, specialty: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <input
            type="number"
            placeholder="Rate ($/hr)"
            value={newContractor.rate}
            onChange={(e) => setNewContractor({ ...newContractor, rate: parseFloat(e.target.value) || 0 })}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <button type="submit" className="btn-yellow" disabled={loading}>
            {loading ? 'Adding...' : 'Add Contractor'}
          </button>
        </div>
      </form>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Contractor">
        {editContractor && (
          <form onSubmit={handleEditContractor}>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Name"
                value={editContractor.name}
                onChange={(e) => setEditContractor({ ...editContractor, name: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <input
                type="text"
                placeholder="Contact"
                value={editContractor.contact}
                onChange={(e) => setEditContractor({ ...editContractor, contact: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <input
                type="text"
                placeholder="Specialty"
                value={editContractor.specialty}
                onChange={(e) => setEditContractor({ ...editContractor, specialty: e.target.value })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <input
                type="number"
                placeholder="Rate ($/hr)"
                value={editContractor.rate}
                onChange={(e) => setEditContractor({ ...editContractor, rate: parseFloat(e.target.value) || 0 })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <button type="submit" className="btn-yellow" disabled={loading}>
                {loading ? 'Updating...' : 'Update Contractor'}
              </button>
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </form>
        )}
      </Modal>
      <Modal isOpen={isHoursModalOpen} onClose={() => setIsHoursModalOpen(false)} title="Log Contractor Hours">
        <form onSubmit={handleAddHours}>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={newHour.contractor_id}
              onChange={(e) => setNewHour({ ...newHour, contractor_id: parseInt(e.target.value) })}
              className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            >
              <option value="">Select Contractor</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
            <select
              value={newHour.task_id}
              onChange={(e) => setNewHour({ ...newHour, task_id: parseInt(e.target.value) })}
              className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            >
              <option value="">Select Task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.task}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Hours"
              value={newHour.hours}
              onChange={(e) => setNewHour({ ...newHour, hours: parseFloat(e.target.value) || 0 })}
              className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
            <input
              type="date"
              placeholder="Date Worked"
              value={newHour.date_worked}
              onChange={(e) => setNewHour({ ...newHour, date_worked: e.target.value })}
              className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
            <button type="submit" className="btn-yellow" disabled={loading}>
              {loading ? 'Adding...' : 'Log Hours'}
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
            <th className="text-left">Specialty</th>
            <th className="text-left">Rate ($/hr)</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contractors.map((contractor) => (
            <tr key={contractor.id} className="hover:bg-gray-700 transition-colors duration-200">
              <td>{contractor.name}</td>
              <td>{contractor.contact}</td>
              <td>{contractor.specialty}</td>
              <td>${contractor.rate}</td>
              <td>
                <button
                  onClick={() => {
                    setEditContractor(contractor);
                    setIsModalOpen(true);
                  }}
                  className="btn-yellow mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteContractor(contractor.id)}
                  className="btn-yellow bg-red-500 hover:bg-red-600 mr-2"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedContractor(contractor)}
                  className="btn-yellow"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedContractor && (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-yellow-500">{selectedContractor.name} - Details</h2>
          <h3 className="text-lg font-semibold mb-2 text-white">Work Hours</h3>
          <button
            onClick={() => setIsHoursModalOpen(true)}
            className="btn-yellow mb-4"
          >
            Log Hours
          </button>
          <table className="table mb-8 w-full">
            <thead>
              <tr>
                <th className="text-left">Task</th>
                <th className="text-left">Hours</th>
                <th className="text-left">Payment</th>
                <th className="text-left">Date Worked</th>
              </tr>
            </thead>
            <tbody>
              {contractorHours.map((hour) => (
                <tr key={hour.id} className="hover:bg-gray-700 transition-colors duration-200">
                  <td>{hour.task.task}</td>
                  <td>{hour.hours}</td>
                  <td>${hour.payment}</td>
                  <td>{hour.date_worked}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="text-lg font-semibold mb-2 text-white">Availability</h3>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            defaultView="month"
            className="rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
}