'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

type Project = {
  id: number;
  name: string;
  status: string;
};

type Task = {
  id: number;
  project_id: number;
  task: string;
  deadline: string;
  status: string;
  project: { name: string };
};

export default function Dashboard() {
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');

    // Fetch active projects (status not 'Complete')
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status')
      .neq('status', 'Complete');
    if (projectsError) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('Error fetching projects:', projectsError);
    } else {
      setActiveProjects(projectsData || []);
    }

    // Fetch overdue tasks (deadline < today and status not 'Done')
    const today = new Date().toISOString().split('T')[0];
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id, project_id, task, deadline, status, project:projects(name)')
      .lt('deadline', today)
      .neq('status', 'Done');
    if (tasksError) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('Error fetching tasks:', tasksError);
    } else {
      setOverdueTasks(tasksData || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      {loading && <p className="text-yellow-500 mb-4">Fetching data...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Active Projects ({activeProjects.length})</h2>
            {activeProjects.length > 0 ? (
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProjects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <Link href={`/projects?selected=${project.id}`} className="text-yellow-500 hover:underline">
                          {project.name}
                        </Link>
                      </td>
                      <td>{project.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No active projects.</p>
            )}
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Overdue Tasks ({overdueTasks.length})</h2>
            {overdueTasks.length > 0 ? (
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueTasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.task}</td>
                      <td>
                        <Link href={`/projects?selected=${task.project_id}`} className="text-yellow-500 hover:underline">
                          {task.project.name}
                        </Link>
                      </td>
                      <td>{task.deadline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No overdue tasks.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}