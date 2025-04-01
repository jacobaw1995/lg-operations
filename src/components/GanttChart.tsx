'use client';

import React from 'react';
import dynamic from 'next/dynamic';

type Task = {
  id: number;
  project_id: number;
  task: string;
  status: string;
  deadline: string;
  start_date: string;
  end_date: string;
  assigned_to: string;
  dependencies: number[];
  milestone_id?: number;
  contractor_id?: number;
};

type Milestone = {
  id: number;
  project_id: number;
  name: string;
  date: string;
  linked_tasks: number[];
};

type GanttChartProps = {
  tasks: Task[];
  milestones: Milestone[];
  onUpdateTaskDates: (taskId: number, startDate: string, endDate: string) => void;
  onUpdateDependencies: (taskId: number, dependencies: number[]) => void;
};

// Dynamically import the inner GanttChart component with SSR disabled
const GanttChartInner = dynamic(() => import('./GanttChartInner'), {
  ssr: false,
});

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  milestones,
  onUpdateTaskDates,
  onUpdateDependencies,
}) => {
  return (
    <GanttChartInner
      tasks={tasks}
      milestones={milestones}
      onUpdateTaskDates={onUpdateTaskDates}
      onUpdateDependencies={onUpdateDependencies}
    />
  );
};

export default GanttChart;