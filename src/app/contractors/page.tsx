'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

type Contractor = {
  id: number;
  name: string;
  contact: string;
  specialty: string;
  rate: number;
};

type ContractorAssignment = {
  id: number;
  contractor_id: number;
  task_id: number;
  project_id: number;
  hours_worked: number;
  payment_amount: number;
  date: string;
};

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [newContractor, setNewContractor] = useState({ name: '', contact: '', specialty: '', rate: 0 });
  const [editContractor, setEditContractor] = useState<Contractor | null>(null);
  const [assignments, setAssignments] = useState<ContractorAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('contractors').select('id, name, contact, specialty, rate');
    if (error) {
      setError('Failed to load contractors. Please try again.');
      console.error('Fetch Contractors Error:', error.message);
    } else {
      setContractors(data || []);
    }
    setLoading(false);
  }, []);

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase.from('contractor_assignments').select('*');
    if (error) {
      console.error('Fetch Assignments Error:', error.message);
    } else {
      setAssignments(data || []);
    }
  }, []);

  useEffect(() => {
    fetchContractors();
    fetchAssignments();
  }, [fetchContractors, fetchAssignments]);

  const handleAddContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newContractor.name || !newContractor.contact || !newContractor.specialty || !newContractor.rate) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from('contractors').insert([newContractor]).select();
    if (error) {
      setError('Failed to add contractor. Please try again.');
      console.error('Add Contractor Error:', error.message);
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
    setLoading(true);
    const { data, error } = await supabase
      .from('contractors')
      .update({
        name: editContractor.name,
        contact: editContractor.contact,
        specialty: editContractor.specialty,
        rate: editContractor.rate,
      })
      .eq('id', editContractor.id)
      .select();
    if (error) {
      setError('Failed to update contractor. Please try again.');
      console.error('Update Contractor Error:', error.message);
    } else {
      console.log('Contractor Updated:', data);
      setEditContractor(null);
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
      console.error('Delete Contractor Error:', error.message);
    } else {
      console.log('Contractor Deleted:', contractorId);
      fetchContractors();
    }
    setLoading(false);
  };

  const handleTrackHours = async (assignmentId: number, hours: number) => {
    setError('');
    setLoading(true);
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;
    const payment_amount = hours * (contractors.find((c) => c.id === assignment.contractor_id)?.rate || 0);
    const { data, error } = await supabase
      .from('contractor_assignments')
      .update({ hours_worked: hours, payment_amount })
      .eq('id', assignmentId)
      .select();
    if (error) {
      setError('Failed to update hours and payment. Please try again.');
      console.error('Update Hours Error:', error.message);
    } else {
      console.log('Hours and Payment Updated:', data);
      fetchAssignments();
    }
    setLoading(false);
  };

  const calendarEvents = assignments.map((assignment) => ({
    title: `Contractor ${contractors.find((c) => c.id === assignment.contractor_id)?.name || 'Unknown'} - Task ${assignment.task_id}`,
    start: new Date(assignment.date),
    end: new Date(assignment.date),
    allDay: true,
    resource: assignment,
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Contractors</h1>
      {loading && <p className="text-yellow-500 mb-4 animate-pulse">Loading...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="mb-4">
        <button
          onClick={() => setViewMode('table')}
          className={`btn-yellow mr-2 ${viewMode === 'table' ? 'bg-yellow-600' : ''}`}
        >
          Table View
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`btn-yellow ${viewMode === 'calendar' ? 'bg-yellow-600' : ''}`}
        >
          Calendar View
        </button>
      </div>

      {viewMode === 'table' ? (
        <>
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
                value={newContractor.rate || ''}
                onChange={(e) => setNewContractor({ ...newContractor, rate: parseFloat(e.target.value) || 0 })}
                className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
              <button type="submit" className="btn-yellow" disabled={loading}>
                {loading ? 'Adding...' : 'Add Contractor'}
              </button>
            </div>
          </form>

          {editContractor && (
            <form onSubmit={handleEditContractor} className="mb-8 bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="grid grid-cols-4 gap-4">
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
                  value={editContractor.rate || ''}
                  onChange={(e) => setEditContractor({ ...editContractor, rate: parseFloat(e.target.value) || 0 })}
                  className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
                <button type="submit" className="btn-yellow" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Contractor'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditContractor(null)}
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
                      onClick={() => setEditContractor(contractor)}
                      className="btn-yellow mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteContractor(contractor.id)}
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

          <h2 className="text-xl font-bold mt-8 mb-4 text-yellow-500">Contractor Assignments</h2>
          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-left">Contractor</th>
                <th className="text-left">Task ID</th>
                <th className="text-left">Project ID</th>
                <th className="text-left">Date</th>
                <th className="text-left">Hours Worked</th>
                <th className="text-left">Payment Amount</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-700 transition-colors duration-200">
                  <td>{contractors.find((c) => c.id === assignment.contractor_id)?.name || 'Unknown'}</td>
                  <td>{assignment.task_id}</td>
                  <td>{assignment.project_id}</td>
                  <td>{assignment.date}</td>
                  <td>{assignment.hours_worked || 0}</td>
                  <td>${assignment.payment_amount || 0}</td>
                  <td>
                    <input
                      type="number"
                      placeholder="Hours"
                      defaultValue={assignment.hours_worked || 0}
                      onBlur={(e) => handleTrackHours(assignment.id, parseFloat(e.target.value) || 0)}
                      className="p-1 rounded bg-gray-700 text-white w-20 mr-2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-yellow-500">Contractor Schedule</h2>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            className="bg-gray-700 text-white"
            onSelectEvent={(event) => console.log('Selected Event:', event.resource)}
          />
        </div>
      )}
    </div>
  );
}