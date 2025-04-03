'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

type Project = {
  id: number;
  name: string;
  status: string;
  customer_id: number;
  customer: { name: string };
};

type Task = {
  id: number;
  project_id: number;
  task: string;
  deadline: string;
  status: string;
  project: { name: string };
  assigned_to: string;
};

type Customer = {
  id: number;
  name: string;
  status: string;
};

type RawProject = {
  id: number;
  name: string;
  status: string;
  customer_id: number;
  customer: { name: string }[] | { name: string };
};

type RawTask = {
  id: number;
  project_id: number;
  task: string;
  deadline: string;
  status: string;
  project: { name: string }[] | { name: string };
  assigned_to: string;
};

export default function Dashboard() {
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [salesPipeline, setSalesPipeline] = useState<{ [key: string]: Customer[] }>({
    Lead: [],
    Pending: [],
    Sold: [],
    Lost: [],
    'In Production': [],
    Complete: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    console.log('Fetching dashboard data...');
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      console.warn('No active session found. Redirecting to login.');
      setError('Please log in to view the dashboard.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Fetch active projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status, customer_id, customer:customers(name)')
        .neq('status', 'Complete');
      if (projectsError) throw new Error(`Projects fetch error: ${projectsError.message}`);
      console.log('Projects fetched:', projectsData);
      const mappedProjects = (projectsData as unknown as RawProject[]).map((project) => ({
        ...project,
        customer: Array.isArray(project.customer) ? project.customer[0] || { name: '' } : project.customer,
      })) as Project[];
      setActiveProjects(mappedProjects || []);

      // Fetch overdue tasks
      const today = new Date().toISOString().split('T')[0];
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, project_id, task, deadline, status, project:projects(name), assigned_to')
        .lt('deadline', today)
        .neq('status', 'Done');
      if (tasksError) throw new Error(`Tasks fetch error: ${tasksError.message}`);
      console.log('Tasks fetched:', tasksData);
      const mappedTasks = (tasksData as unknown as RawTask[]).map((task) => ({
        ...task,
        project: Array.isArray(task.project) ? task.project[0] || { name: '' } : task.project,
      })) as Task[];
      setOverdueTasks(mappedTasks || []);

      // Fetch customers for sales pipeline
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, status');
      if (customersError) throw new Error(`Customers fetch error: ${customersError.message}`);
      console.log('Customers fetched:', customersData);
      const pipeline: { [key: string]: Customer[] } = {
        Lead: [],
        Pending: [],
        Sold: [],
        Lost: [],
        'In Production': [],
        Complete: [],
      };
      customersData?.forEach((customer) => {
        pipeline[customer.status].push(customer);
      });
      setSalesPipeline(pipeline);
    } catch (err: unknown) { // Changed 'Error' to 'unknown'
      console.error('Dashboard fetch failed:', err instanceof Error ? err.message : String(err));
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      {loading ? (
        <div className="flex justify-center items-center">
          <p className="text-yellow-500 animate-pulse">Loading dashboard data...</p>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 bg-gray-700 rounded">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sales Pipeline */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-xl font-bold mb-4 text-yellow-500">Sales Pipeline</h2>
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(salesPipeline).map((status) => (
                <div key={status} className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 text-white">{status} ({salesPipeline[status].length})</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {salesPipeline[status].slice(0, 3).map((customer) => (
                      <li key={customer.id} className="text-sm text-gray-300">{customer.name}</li>
                    ))}
                    {salesPipeline[status].length > 3 && (
                      <li className="text-sm text-gray-400">+{salesPipeline[status].length - 3} more</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-xl font-bold mb-4 text-yellow-500">Overdue Tasks ({overdueTasks.length})</h2>
            {overdueTasks.length > 0 ? (
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="text-left">Task</th>
                    <th className="text-left">Project</th>
                    <th className="text-left">Assigned To</th>
                    <th className="text-left">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-700 transition-colors duration-200">
                      <td>{task.task}</td>
                      <td>
                        <Link href={`/projects?selected=${task.project_id}`} className="text-yellow-500 hover:underline">
                          {task.project.name}
                        </Link>
                      </td>
                      <td>{task.assigned_to}</td>
                      <td>{task.deadline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400">No overdue tasks.</p>
            )}
          </div>

          {/* Active Projects */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-xl font-bold mb-4 text-yellow-500">Active Projects ({activeProjects.length})</h2>
            {activeProjects.length > 0 ? (
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="text-left">Project Name</th>
                    <th className="text-left">Customer</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-700 transition-colors duration-200">
                      <td>
                        <Link href={`/projects?selected=${project.id}`} className="text-yellow-500 hover:underline">
                          {project.name}
                        </Link>
                      </td>
                      <td>{project.customer?.name || 'Unknown Customer'}</td>
                      <td>{project.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400">No active projects.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}