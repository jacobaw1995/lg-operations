'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const [activeProjects, setActiveProjects] = useState(0);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [loading, setLoading] = useState(true); // Added loading state

  const fetchDashboardData = async () => {
    setLoading(true); // Set loading to true before fetching
    // Fetch active projects (status not 'Complete')
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .neq('status', 'Complete');
    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
    } else {
      setActiveProjects(projectsData.length);
    }

    // Fetch overdue tasks (deadline < today and status not 'Done')
    const today = new Date().toISOString().split('T')[0];
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .lt('deadline', today)
      .neq('status', 'Done');
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    } else {
      setOverdueTasks(tasksData.length);
    }
    setLoading(false); // Set loading to false after fetching
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      {loading ? (
        <p className="text-yellow-500">Fetching data...</p> // Added loading spinner
      ) : (
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Active Projects</h2>
            <p className="text-2xl">{activeProjects}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Overdue Tasks</h2>
            <p className="text-2xl">{overdueTasks}</p>
          </div>
        </div>
      )}
    </div>
  );
}