'use client';

import { useState, useEffect } from 'react';
import { Chart, GoogleVizEventName } from 'react-google-charts';
import { Task, Milestone } from '../app/projects/page';

// Define a type for the Gantt chart data that matches react-google-charts expectations
type GanttChartData = Array<
  | { type: string; label: string } // Header row
  | (string | number | Date | null) // Data rows
>;

interface GanttChartProps {
  tasks: Task[];
  milestones: Milestone[];
  onUpdateTaskDates: (taskId: number, startDate: string, endDate: string) => void;
  onUpdateDependencies: (taskId: number, dependencies: number[]) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, milestones, onUpdateTaskDates, onUpdateDependencies }) => {
  const [zoomLevel, setZoomLevel] = useState<'Days' | 'Weeks' | 'Months'>('Weeks');
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [baseline, setBaseline] = useState<{ [key: number]: { start: string; end: string } }>({});

  // Calculate critical path
  const calculateCriticalPath = () => {
    const taskMap = new Map<number, Task>();
    tasks.forEach((task) => taskMap.set(task.id, task));

    const earliestStart = new Map<number, Date>();
    const earliestFinish = new Map<number, Date>();
    const latestStart = new Map<number, Date>();
    const latestFinish = new Map<number, Date>();

    // Forward pass: Calculate earliest start and finish
    tasks.forEach((task) => {
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      const dependencies = task.dependencies || [];

      let earliestTaskStart = start;
      dependencies.forEach((depId: number) => {
        const depFinish = earliestFinish.get(depId);
        if (depFinish && depFinish > earliestTaskStart) {
          earliestTaskStart = depFinish;
        }
      });

      earliestStart.set(task.id W, earliestTaskStart);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      earliestFinish.set(task.id, new Date(earliestTaskStart.getTime() + duration * 24 * 60 * 60 * 1000));
    });

    // Backward pass: Calculate latest start and finish
    const maxFinish = Math.max(...Array.from(earliestFinish.values()).map((d) => d.getTime()));
    tasks.forEach((task) => {
      const end = earliestFinish.get(task.id)!;
      latestFinish.set(task.id, new Date(maxFinish));
      const start = earliestStart.get(task.id)!;
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      latestStart.set(task.id, new Date(latestFinish.get(task.id)!.getTime() - duration * 24 * 60 * 60 * 1000));

      // Adjust latest start/finish based on dependent tasks
      tasks.forEach((otherTask) => {
        if (otherTask.dependencies?.includes(task.id)) {
          const otherLatestStart = latestStart.get(otherTask.id)!;
          const otherStart = earliestStart.get(otherTask.id)!;
          const otherDuration = (earliestFinish.get(otherTask.id)!.getTime() - otherStart.getTime()) / (1000 * 60 * 60 * 24);
          const newLatestFinish = new Date(otherLatestStart.getTime() - otherDuration * 24 * 60 * 60 * 1000);
          if (newLatestFinish < latestFinish.get(task.id)!) {
            latestFinish.set(task.id, newLatestFinish);
            latestStart.set(task.id, new Date(newLatestFinish.getTime() - duration * 24 * 60 * 60 * 1000));
          }
        }
      });
    });

    // Identify critical path (tasks with no slack)
    const criticalPath = new Set<number>();
    tasks.forEach((task) => {
      const es = earliestStart.get(task.id)!.getTime();
      const ls = latestStart.get(task.id)!.getTime();
      if (Math.abs(es - ls) < 1000 * 60 * 60 * 24) { // Less than a day of slack
        criticalPath.add(task.id);
      }
    });

    return criticalPath;
  };

  // Set baseline on initial load
  useEffect(() => {
    const initialBaseline: { [key: number]: { start: string; end: string } } = {};
    tasks.forEach((task) => {
      initialBaseline[task.id] = { start: task.start_date, end: task.end_date };
    });
    setBaseline(initialBaseline);
  }, [tasks]);

  // Prepare data for the Gantt chart
  const chartData: GanttChartData = [
    [
      { type: 'string', label: 'Task ID' },
      { type: 'string', label: 'Task Name' },
      { type: 'string', label: 'Resource' },
      { type: 'date', label: 'Start Date' },
      { type: 'date', label: 'End Date' },
      { type: 'number', label: 'Duration' },
      { type: 'number', label: 'Percent Complete' },
      { type: 'string', label: 'Dependencies' },
    ],
  ];

  const criticalPath = showCriticalPath ? calculateCriticalPath() : new Set<number>();

  // Add tasks to chart data
  tasks.forEach((task) => {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const percentComplete = task.status === 'Done' ? 100 : task.status === 'In Progress' ? 50 : 0;
    const dependencies = task.dependencies?.map((depId: number) => depId.toString()).join(',') || null;

    // Determine color based on status and baseline
    const isDelayed = new Date(task.start_date) > new Date(baseline[task.id]?.start) ||
                     new Date(task.end_date) > new Date(baseline[task.id]?.end);
    const isCritical = criticalPath.has(task.id);
    const color = isCritical ? '#FF0000' : isDelayed ? '#FF5555' : '#55FF55';

    chartData.push([
      task.id.toString(),
      task.task,
      task.assigned_to,
      startDate,
      endDate,
      duration,
      percentComplete,
      dependencies,
    ]);
  });

  // Add milestones to chart data
  milestones.forEach((milestone) => {
    const date = new Date(milestone.date);
    chartData.push([
      `milestone-${milestone.id}`,
      milestone.name,
      '',
      date,
      date,
      0,
      100,
      milestone.linked_tasks?.map((taskId: number) => taskId.toString()).join(',') || null,
    ]);
  });

  const chartOptions = {
    height: (tasks.length + milestones.length) * 40 + 50,
    gantt: {
      trackHeight: 30,
      barHeight: 20,
      barCornerRadius: 5,
      palette: [
        {
          color: '#55FF55', // Green for on-track tasks
          dark: '#FF5555',  // Red for delayed tasks
          light: '#FF0000', // Red for critical path
        },
      ],
      criticalPathEnabled: showCriticalPath,
      criticalPathStyle: {
        stroke: '#FF0000',
        strokeWidth: 2,
      },
      arrow: {
        show: showDependencies,
        color: '#FFFF00', // Yellow arrows for dependencies
      },
      labelStyle: {
        fontName: 'Montserrat',
        fontSize: 12,
        color: '#FFFFFF',
      },
      innerGridTrack: { fill: '#1F2937' }, // Dark background
      innerGridDarkTrack: { fill: '#374151' }, // Slightly lighter for alternating rows
    },
    backgroundColor: '#1F2937', // Match app's dark theme
    hAxis: {
      format: zoomLevel === 'Days' ? 'MMM d' : zoomLevel === 'Weeks' ? 'MMM d' : 'MMM yyyy',
      textStyle: { color: '#FFFFFF' },
    },
    vAxis: {
      textStyle: { color: '#FFFFFF' },
    },
  };

  const handleChartEvents: { eventName: GoogleVizEventName; callback: (props: any) => void }[] = [
    {
      eventName: 'select',
      callback: ({ chartWrapper }) => {
        const selection = chartWrapper.getChart().getSelection();
        if (selection.length > 0) {
          const row = selection[0].row;
          const taskId = chartData[row + 1][0] as string;
          if (!taskId.startsWith('milestone-')) {
            // Handle task selection (e.g., open a modal for editing)
            console.log('Selected task:', taskId);
          }
        }
      },
    },
    {
      eventName: 'ready',
      callback: () => {
        // Log when the chart is ready
        console.log('Gantt chart is ready');
      },
    },
  ];

  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-yellow-500">Gantt Chart</h2>
        <div className="flex gap-4">
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(e.target.value as 'Days' | 'Weeks' | 'Months')}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="Days">Days</option>
            <option value="Weeks">Weeks</option>
            <option value="Months">Months</option>
          </select>
          <label className="text-white">
            <input
              type="checkbox"
              checked={showDependencies}
              onChange={() => setShowDependencies(!showDependencies)}
              className="mr-2"
            />
            Show Dependencies
          </label>
          <label className="text-white">
            <input
              type="checkbox"
              checked={showCriticalPath}
              onChange={() => setShowCriticalPath(!showCriticalPath)}
              className="mr-2"
            />
            Show Critical Path
          </label>
        </div>
      </div>
      <Chart
        chartType="Gantt"
        data={chartData}
        options={chartOptions}
        width="100%"
        height={`${(tasks.length + milestones.length) * 40 + 50}px`}
        chartEvents={handleChartEvents}
      />
    </div>
  );
};

export default GanttChart;