'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../lib/supabase';
import ProjectSelector from './ProjectSelector';
import { Stage, Layer, Rect, Text, Line } from 'react-konva';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
};

type Project = {
  id: number;
  name: string;
};

type Contractor = {
  id: number;
  name: string;
};

type Vendor = {
  id: number;
  name: string;
};

type Resource = {
  id: number;
  name: string;
  type: string;
};

type Milestone = {
  id: number;
  project_id: number;
  name: string;
  date: string;
  linked_tasks: number[];
};

type ActivityLog = {
  id: number;
  project_id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  details: { [key: string]: any };
  created_at: string;
  created_by: string;
};

function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-1/2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Task</h2>
          <button onClick={onClose} className="text-red-500 hover:text-red-700">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SortableTask({
  task,
  onEdit,
  onDelete,
  resources,
  onAssignResource,
  setTaskPosition,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  resources: Resource[];
  onAssignResource: (taskId: number, resourceId: number) => void;
  setTaskPosition: (taskId: number, x: number, y: number, width: number, height: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (node) {
      const rect = node.getBoundingClientRect();
      setTaskPosition(task.id, rect.left, rect.top, rect.width, rect.height);
    }
  };

  return (
    <div
      ref={handleRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-700 p-4 mb-2 rounded cursor-move flex justify-between items-center relative z-10"
    >
      <div>
        <p>{task.task}</p>
        <p className="text-sm text-gray-400">Due: {task.deadline}</p>
        <p className="text-sm text-gray-400">Assigned: {task.assigned_to}</p>
        <select
          onChange={(e) => onAssignResource(task.id, parseInt(e.target.value))}
          className="p-1 rounded bg-gray-600 text-white text-sm mt-1"
        >
          <option value={0}>Assign Resource</option>
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.name} ({resource.type})
            </option>
          ))}
        </select>
      </div>
      <div>
        <button onClick={() => onEdit(task)} className="btn-yellow mr-2">
          Edit
        </button>
        <button onClick={() => onDelete(task.id)} className="btn-yellow bg-red-500 hover:bg-red-600">
          Delete
        </button>
      </div>
    </div>
  );
}

function GanttChart({
  tasks,
  milestones,
  onUpdateTaskDates,
  onUpdateDependencies,
}: {
  tasks: Task[];
  milestones: Milestone[];
  onUpdateTaskDates: (taskId: number, startDate: string, endDate: string) => void;
  onUpdateDependencies: (taskId: number, dependencies: number[]) => void;
}) {
  const [draggingTask, setDraggingTask] = useState<number | null>(null);
  const [linkingTask, setLinkingTask] = useState<number | null>(null);
  const [linkStartX, setLinkStartX] = useState<number | null>(null);
  const [linkStartY, setLinkStartY] = useState<number | null>(null);
  const [linkEndX, setLinkEndX] = useState<number | null>(null);
  const [linkEndY, setLinkEndY] = useState<number | null>(null);

  const earliestDate = tasks.reduce((earliest, task) => {
    const start = new Date(task.start_date);
    return start < earliest ? start : earliest;
  }, new Date(tasks[0]?.start_date || Date.now()));

  const latestDate = tasks.reduce((latest, task) => {
    const end = new Date(task.end_date);
    return end > latest ? end : latest;
  }, new Date(tasks[0]?.end_date || Date.now()));

  const totalDays = (latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24);
  const pixelsPerDay = 1000 / totalDays;

  const taskHeight = 30;
  const taskSpacing = 10;
  const chartHeight = tasks.length * (taskHeight + taskSpacing) + 50;

  const getTaskPosition = (task: Task) => {
    const start = new Date(task.start_date);
    const end = new Date(task.end_date);
    const startOffset = (start.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return {
      x: startOffset * pixelsPerDay,
      width: duration * pixelsPerDay,
    };
  };

  const getMilestonePosition = (milestone: Milestone) => {
    const date = new Date(milestone.date);
    const offset = (date.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24);
    return offset * pixelsPerDay;
  };

  const calculateCriticalPath = () => {
    const earliestStart: { [key: number]: number } = {};
    const latestFinish: { [key: number]: number } = {};
    const taskDurations: { [key: number]: number } = {};

    tasks.forEach((task) => {
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      taskDurations[task.id] = duration;
      earliestStart[task.id] = 0;
      latestFinish[task.id] = Infinity;
    });

    const forwardPass = () => {
      tasks.forEach((task) => {
        const startOffset = (new Date(task.start_date).getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24);
        task.dependencies.forEach((depId) => {
          const depEnd = earliestStart[depId] + taskDurations[depId];
          if (depEnd > earliestStart[task.id]) {
            earliestStart[task.id] = depEnd;
          }
        });
      });
    };

    const backwardPass = () => {
      const maxFinish = Math.max(...Object.values(earliestStart).map((es, idx) => es + taskDurations[tasks[idx].id]));
      tasks.forEach((task) => {
        latestFinish[task.id] = maxFinish;
        tasks.forEach((otherTask) => {
          if (otherTask.dependencies.includes(task.id)) {
            const finish = latestFinish[otherTask.id] - taskDurations[otherTask.id];
            if (finish < latestFinish[task.id]) {
              latestFinish[task.id] = finish;
            }
          }
        });
      });
    };

    forwardPass();
    backwardPass();

    const criticalPath = tasks.filter((task) => {
      const slack = latestFinish[task.id] - (earliestStart[task.id] + taskDurations[task.id]);
      return slack === 0;
    }).map((task) => task.id);

    return criticalPath;
  };

  const criticalPath = calculateCriticalPath();

  const handleDragStart = (taskId: number) => {
    setDraggingTask(taskId);
  };

  const handleDragMove = (e: any, taskId: number) => {
    if (draggingTask !== taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const deltaDays = e.evt.deltaX / pixelsPerDay;
    const newStart = new Date(task.start_date);
    newStart.setDate(newStart.getDate() + Math.round(deltaDays));
    const newEnd = new Date(task.end_date);
    newEnd.setDate(newEnd.getDate() + Math.round(deltaDays));

    onUpdateTaskDates(taskId, newStart.toISOString().split('T')[0], newEnd.toISOString().split('T')[0]);
  };

  const handleDragEnd = () => {
    setDraggingTask(null);
  };

  const handleLinkStart = (taskId: number, x: number, y: number) => {
    setLinkingTask(taskId);
    setLinkStartX(x);
    setLinkStartY(y);
    setLinkEndX(x);
    setLinkEndY(y);
  };

  const handleLinkMove = (e: any) => {
    if (!linkingTask) return;
    setLinkEndX(e.evt.layerX);
    setLinkEndY(e.evt.layerY);
  };

  const handleLinkEnd = (targetTaskId: number) => {
    if (!linkingTask || linkingTask === targetTaskId) {
      setLinkingTask(null);
      setLinkStartX(null);
      setLinkStartY(null);
      setLinkEndX(null);
      setLinkEndY(null);
      return;
    }

    const task = tasks.find((t) => t.id === linkingTask);
    if (!task) return;

    const newDependencies = [...(task.dependencies || []), targetTaskId];
    onUpdateDependencies(linkingTask, newDependencies);

    setLinkingTask(null);
    setLinkStartX(null);
    setLinkStartY(null);
    setLinkEndX(null);
    setLinkEndY(null);
  };

  return (
    <div>
      <Stage width={1000} height={chartHeight} onMouseMove={handleLinkMove}>
        <Layer>
          {tasks.map((task, index) => {
            const { x, width } = getTaskPosition(task);
            const y = index * (taskHeight + taskSpacing) + 50;
            const isCritical = criticalPath.includes(task.id);

            return (
              <React.Fragment key={task.id}>
                <Text
                  x={0}
                  y={y}
                  text={task.task}
                  fontSize={14}
                  fill="white"
                  width={150}
                  align="right"
                  padding={5}
                />
                <Rect
                  x={x + 150}
                  y={y}
                  width={width}
                  height={taskHeight}
                  fill={isCritical ? 'red' : 'yellow'}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onDragMove={(e) => handleDragMove(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onMouseDown={(e) => handleLinkStart(task.id, x + 150 + width, y + taskHeight / 2)}
                  onMouseUp={() => handleLinkEnd(task.id)}
                />
                {task.dependencies.map((depId) => {
                  const depTask = tasks.find((t) => t.id === depId);
                  if (!depTask) return null;
                  const depPos = getTaskPosition(depTask);
                  const depIndex = tasks.findIndex((t) => t.id === depId);
                  const depY = depIndex * (taskHeight + taskSpacing) + 50;
                  return (
                    <Line
                      key={`${task.id}-${depId}`}
                      points={[depPos.x + depPos.width + 150, depY + taskHeight / 2, x + 150, y + taskHeight / 2]}
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
          {milestones.map((milestone) => {
            const x = getMilestonePosition(milestone) + 150;
            return (
              <React.Fragment key={milestone.id}>
                <Line
                  points={[x, 0, x, chartHeight]}
                  stroke="green"
                  strokeWidth={2}
                  dash={[5, 5]}
                />
                <Text
                  x={x + 5}
                  y={10}
                  text={milestone.name}
                  fontSize={14}
                  fill="green"
                  rotation={90}
                />
              </React.Fragment>
            );
          })}
          {linkingTask && linkStartX && linkStartY && linkEndX && linkEndY && (
            <Line
              points={[linkStartX, linkStartY, linkEndX, linkEndY]}
              stroke="white"
              strokeWidth={2}
              dash={[5, 5]}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
  const [taskPositions, setTaskPositions] = useState<{ [key: number]: { x: number; y: number; width: number; height: number } }>({});
  const [newProject, setNewProject] = useState({ name: '' });
  const [newTask, setNewTask] = useState({ task: '', status: 'To Do', deadline: '', start_date: '', end_date: '', assigned_to: '', dependencies: [] as number[], contractor_id: 0, milestone_id: 0 });
  const [newMilestone, setNewMilestone] = useState({ name: '', date: '' });
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'gantt' | 'activity'>('kanban');
  const pdfRef = useRef<HTMLDivElement>(null);
  const kanbanRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const setTaskPosition = (taskId: number, x: number, y: number, width: number, height: number) => {
    setTaskPositions((prev) => ({
      ...prev,
      [taskId]: { x, y, width, height },
    }));
  };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('projects').select('*');
    if (error) {
      setError('Failed to load projects. Please try again.');
      console.error('Fetch Projects Error:', error);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', selectedProject);
    if (error) {
      setError('Failed to load tasks. Please try again.');
      console.error('Fetch Tasks Error:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [selectedProject]);

  const fetchContractors = async () => {
    const { data, error } = await supabase.from('contractors').select('id, name');
    if (error) {
      console.error('Fetch Contractors Error:', error);
    } else {
      setContractors(data || []);
    }
  };

  const fetchVendors = async () => {
    const { data, error } = await supabase.from('vendors').select('id, name');
    if (error) {
      console.error('Fetch Vendors Error:', error);
    } else {
      setVendors(data || []);
    }
  };

  const fetchResources = async () => {
    const { data, error } = await supabase.from('resources').select('id, name, type');
    if (error) {
      console.error('Fetch Resources Error:', error);
    } else {
      setResources(data || []);
    }
  };

  const fetchMilestones = async () => {
    if (!selectedProject) return;
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', selectedProject);
    if (error) {
      console.error('Fetch Milestones Error:', error);
    } else {
      setMilestones(data || []);
    }
  };

  const fetchActivityLogs = async () => {
    if (!selectedProject) return;
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('project_id', selectedProject)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Fetch Activity Logs Error:', error);
    } else {
      setActivityLogs(data || []);
    }
  };

  const fetchProjectVendors = async () => {
    if (!selectedProject) return;
    const { data, error } = await supabase
      .from('vendor_project_links')
      .select('vendor_id')
      .eq('project_id', selectedProject);
    if (error) {
      console.error('Fetch Project Vendors Error:', error);
    } else {
      setSelectedVendors(data?.map((link) => link.vendor_id) || []);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchContractors();
    fetchVendors();
    fetchResources();
  }, [fetchProjects]);

  useEffect(() => {
    fetchTasks();
    fetchProjectVendors();
    fetchMilestones();
    fetchActivityLogs();
  }, [selectedProject, fetchTasks]);

  const logActivity = async (entityType: string, entityId: number, action: string, details: { [key: string]: any }) => {
    if (!selectedProject) return;
    const { error } = await supabase.from('activity_logs').insert([{
      project_id: selectedProject,
      entity_type: entityType,
      entity_id: entityId,
      action,
      details,
      created_by: 'System', // Placeholder for user tracking
    }]);
    if (error) {
      console.error('Log Activity Error:', error);
    } else {
      fetchActivityLogs();
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newProject.name) {
      setError('Project name is required.');
      return;
    }
    setLoading(true);
    const projectData = { ...newProject, customer_id: null };
    const { data, error } = await supabase.from('projects').insert([projectData]).select();
    if (error) {
      setError('Failed to add project. Please try again.');
      console.error('Project Insert Error:', error);
    } else {
      console.log('Project Added:', data);
      await logActivity('Project', data[0].id, 'Created', { name: newProject.name });
      setNewProject({ name: '' });
      fetchProjects();
    }
    setLoading(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newTask.task || !newTask.deadline || !newTask.start_date || !newTask.end_date || !newTask.assigned_to || !selectedProject) {
      setError('All fields are required, and a project must be selected.');
      return;
    }
    setLoading(true);
    const taskData = { ...newTask, project_id: selectedProject, dependencies: newTask.dependencies || [] };
    const { data, error } = await supabase.from('tasks').insert([taskData]).select();
    if (error) {
      setError('Failed to add task. Please try again.');
      console.error('Task Insert Error:', error);
    } else {
      console.log('Task Added:', data);
      await logActivity('Task', data[0].id, 'Created', { task: newTask.task, status: newTask.status });
      if (newTask.contractor_id) {
        await supabase.from('contractor_assignments').insert([{
          contractor_id: newTask.contractor_id,
          task_id: data[0].id,
          project_id: selectedProject,
        }]);
      }
      if (newTask.milestone_id) {
        const milestone = milestones.find((m) => m.id === newTask.milestone_id);
        if (milestone) {
          const updatedLinkedTasks = [...(milestone.linked_tasks || []), data[0].id];
          await supabase
            .from('milestones')
            .update({ linked_tasks: updatedLinkedTasks })
            .eq('id', newTask.milestone_id);
        }
      }
      setNewTask({ task: '', status: 'To Do', deadline: '', start_date: '', end_date: '', assigned_to: '', dependencies: [], contractor_id: 0, milestone_id: 0 });
      fetchTasks();
      fetchMilestones();
    }
    setLoading(false);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask) return;
    setError('');
    setLoading(true);
    const oldTask = tasks.find((t) => t.id === editTask.id);
    const { data, error } = await supabase
      .from('tasks')
      .update({
        task: editTask.task,
        status: editTask.status,
        deadline: editTask.deadline,
        start_date: editTask.start_date,
        end_date: editTask.end_date,
        assigned_to: editTask.assigned_to,
        dependencies: editTask.dependencies || [],
        milestone_id: editTask.milestone_id || null,
      })
      .eq('id', editTask.id)
      .select();
    if (error) {
      setError('Failed to update task. Please try again.');
      console.error('Task Update Error:', error);
    } else {
      console.log('Task Updated:', data);
      await logActivity('Task', editTask.id, 'Updated', {
        old: { task: oldTask?.task, status: oldTask?.status },
        new: { task: editTask.task, status: editTask.status },
      });
      if (editTask.contractor_id) {
        const { error: assignmentError } = await supabase
          .from('contractor_assignments')
          .upsert([{
            contractor_id: editTask.contractor_id,
            task_id: editTask.id,
            project_id: selectedProject,
          }], { onConflict: ['task_id'] });
        if (assignmentError) {
          console.error('Assignment Update Error:', assignmentError);
        }
      }
      if (editTask.milestone_id) {
        const milestone = milestones.find((m) => m.id === editTask.milestone_id);
        if (milestone && !milestone.linked_tasks.includes(editTask.id)) {
          const updatedLinkedTasks = [...(milestone.linked_tasks || []), editTask.id];
          await supabase
            .from('milestones')
            .update({ linked_tasks: updatedLinkedTasks })
            .eq('id', editTask.milestone_id);
        }
      }
      setEditTask(null);
      setIsModalOpen(false);
      fetchTasks();
      fetchMilestones();
    }
    setLoading(false);
  };

  const handleDeleteTask = async (taskId: number) => {
    setError('');
    setLoading(true);
    const task = tasks.find((t) => t.id === taskId);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      setError('Failed to delete task. Please try again.');
      console.error('Task Delete Error:', error);
    } else {
      await logActivity('Task', taskId, 'Deleted', { task: task?.task });
      fetchTasks();
      fetchMilestones();
    }
    setLoading(false);
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newMilestone.name || !newMilestone.date || !selectedProject) {
      setError('All fields are required, and a project must be selected.');
      return;
    }
    setLoading(true);
    const milestoneData = { ...newMilestone, project_id: selectedProject, linked_tasks: [] };
    const { data, error } = await supabase.from('milestones').insert([milestoneData]).select();
    if (error) {
      setError('Failed to add milestone. Please try again.');
      console.error('Milestone Insert Error:', error);
    } else {
      console.log('Milestone Added:', data);
      await logActivity('Milestone', data[0].id, 'Created', { name: newMilestone.name, date: newMilestone.date });
      setNewMilestone({ name: '', date: '' });
      setIsMilestoneModalOpen(false);
      fetchMilestones();
    }
    setLoading(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    setLoading(true);
    setError('');
    const activeTask = tasks.find((task) => task.id === active.id);
    const overColumn = over.id.toString().split('-')[0];

    if (activeTask && overColumn) {
      const updatedTask = { ...activeTask, status: overColumn };
      const { error } = await supabase
        .from('tasks')
        .update({ status: updatedTask.status })
        .eq('id', activeTask.id);
      if (error) {
        setError('Failed to update task status. Please try again.');
        console.error('Drag Update Error:', error);
      } else {
        await logActivity('Task', activeTask.id, 'Updated', {
          old: { status: activeTask.status },
          new: { status: overColumn },
        });
        fetchTasks();
      }
    }
    setLoading(false);
  };

  const handleUpdateTaskDates = async (taskId: number, startDate: string, endDate: string) => {
    setLoading(true);
    setError('');
    const task = tasks.find((t) => t.id === taskId);
    const { error } = await supabase
      .from('tasks')
      .update({ start_date: startDate, end_date: endDate })
      .eq('id', taskId);
    if (error) {
      setError('Failed to update task dates. Please try again.');
      console.error('Update Task Dates Error:', error);
    } else {
      await logActivity('Task', taskId, 'Updated', {
        old: { start_date: task?.start_date, end_date: task?.end_date },
        new: { start_date: startDate, end_date: endDate },
      });
      fetchTasks();
    }
    setLoading(false);
  };

  const handleUpdateDependencies = async (taskId: number, dependencies: number[]) => {
    setLoading(true);
    setError('');
    const task = tasks.find((t) => t.id === taskId);
    const { error } = await supabase
      .from('tasks')
      .update({ dependencies })
      .eq('id', taskId);
    if (error) {
      setError('Failed to update task dependencies. Please try again.');
      console.error('Update Task Dependencies Error:', error);
    } else {
      await logActivity('Task', taskId, 'Updated', {
        old: { dependencies: task?.dependencies },
        new: { dependencies },
      });
      fetchTasks();
    }
    setLoading(false);
  };

  const handleAssignResource = async (taskId: number, resourceId: number) => {
    if (resourceId === 0) return;
    setLoading(true);
    setError('');
    const { error } = await supabase
      .from('resource_assignments')
      .upsert([{ resource_id: resourceId, task_id: taskId }], { onConflict: ['task_id'] });
    if (error) {
      setError('Failed to assign resource. Please try again.');
      console.error('Assign Resource Error:', error);
    } else {
      await logActivity('Task', taskId, 'Updated', {
        resource_id: resourceId,
      });
    }
    setLoading(false);
  };

  const handleUpdateProjectVendors = async (vendorIds: number[]) => {
    setLoading(true);
    setError('');
    if (!selectedProject) return;

    // Delete existing links
    await supabase
      .from('vendor_project_links')
      .delete()
      .eq('project_id', selectedProject);

    // Add new links
    const links = vendorIds.map((vendorId) => ({
      vendor_id: vendorId,
      project_id: selectedProject,
    }));
    const { error } = await supabase.from('vendor_project_links').insert(links);
    if (error) {
      setError('Failed to update project vendors. Please try again.');
      console.error('Update Project Vendors Error:', error);
    } else {
      await logActivity('Project', selectedProject, 'Updated', {
        old: { vendors: selectedVendors },
        new: { vendors: vendorIds },
      });
      setSelectedVendors(vendorIds);
      setIsVendorModalOpen(false);
    }
    setLoading(false);
  };

  const exportGanttToPDF = async () => {
    const element = pdfRef.current;
    if (!element) return;

    element.innerHTML = `
      <div style="padding: 30px; background: #1f2937; color: white; font-family: 'Montserrat', sans-serif;">
        <img src="/logo.png" alt="LG Asphalt Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">LG Asphalt Gantt Chart</h1>
        <div id="gantt-chart"></div>
      </div>
    `;

    const ganttElement = document.createElement('div');
    ganttElement.id = 'gantt-chart';
    element.querySelector('#gantt-chart')!.appendChild(ganttElement);

    const canvas = await html2canvas(ganttElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    doc.save('gantt_chart.pdf');
  };

  const columns: { [key: string]: Task[] } = {
    'To Do': tasks.filter((task) => task.status === 'To Do'),
    'In Progress': tasks.filter((task) => task.status === 'In Progress'),
    'Done': tasks.filter((task) => task.status === 'Done'),
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Projects</h1>
      <form onSubmit={handleAddProject} className="mb-8 bg-gray-800 p-6 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject({ name: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <button type="submit" className="btn-yellow" disabled={loading}>
            {loading ? 'Adding...' : 'Add Project'}
          </button>
        </div>
      </form>
      <Suspense fallback={<div>Loading projects...</div>}>
        <ProjectSelector
          projects={projects}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
        />
      </Suspense>
      {selectedProject && (
        <>
          <div className="mb-4">
            <button
              onClick={() => setViewMode('kanban')}
              className={`btn-yellow mr-2 ${viewMode === 'kanban' ? 'bg-yellow-600' : ''}`}
            >
              Kanban View
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`btn-yellow mr-2 ${viewMode === 'gantt' ? 'bg-yellow-600' : ''}`}
            >
              Gantt View
            </button>
            <button
              onClick={() => setViewMode('activity')}
              className={`btn-yellow mr-2 ${viewMode === 'activity' ? 'bg-yellow-600' : ''}`}
            >
              Activity Log
            </button>
            <button
              onClick={() => setIsVendorModalOpen(true)}
              className="btn-yellow mr-2"
            >
              Manage Vendors
            </button>
            <button
              onClick={() => setIsMilestoneModalOpen(true)}
              className="btn-yellow"
            >
              Add Milestone
            </button>
          </div>
          {isVendorModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-1/2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Manage Project Vendors</h2>
                  <button onClick={() => setIsVendorModalOpen(false)} className="text-red-500 hover:text-red-700">
                    Close
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Vendors</h3>
                  <select
                    multiple
                    value={selectedVendors.map(String)}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option) => parseInt(option.value));
                      setSelectedVendors(selected);
                    }}
                    className="p-2 rounded bg-gray-700 text-white w-full"
                  >
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleUpdateProjectVendors(selectedVendors)}
                    className="btn-yellow mt-4"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Vendors'}
                  </button>
                </div>
                {error && <p className="text-red-500 mt-4">{error}</p>}
              </div>
            </div>
          )}
          {isMilestoneModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-1/2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Add Milestone</h2>
                  <button onClick={() => setIsMilestoneModalOpen(false)} className="text-red-500 hover:text-red-700">
                    Close
                  </button>
                </div>
                <form onSubmit={handleAddMilestone}>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Milestone Name"
                      value={newMilestone.name}
                      onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                      className="p-2 rounded bg-gray-700 text-white"
                      required
                    />
                    <input
                      type="date"
                      placeholder="Date"
                      value={newMilestone.date}
                      onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                      className="p-2 rounded bg-gray-700 text-white"
                      required
                    />
                    <button type="submit" className="btn-yellow" disabled={loading}>
                      {loading ? 'Adding...' : 'Add Milestone'}
                    </button>
                  </div>
                  {error && <p className="text-red-500 mt-4">{error}</p>}
                </form>
              </div>
            </div>
          )}
          {viewMode === 'kanban' ? (
            <>
              <form onSubmit={handleAddTask} className="mb-8 bg-gray-800 p-6 rounded-lg">
                <div className="grid grid-cols-4 gap-4">
                  <input
                    type="text"
                    placeholder="Task"
                    value={newTask.task}
                    onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
                    className="p-2 rounded bg-gray-700 text-white"
                    required
                  />
                  <input
                    type="date"
                    placeholder="Start Date"
                    value={newTask.start_date}
                    onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                    className="p-2 rounded bg-gray-700 text-white"
                    required
                  />
                  <input
                    type="date"
                    placeholder="End Date"
                    value={newTask.end_date}
                    onChange={(e) => setNewTask({ ...newTask, end_date: e.target.value })}
                    className="p-2 rounded bg-gray-700 text-white"
                    required
                  />
                  <input
                    type="date"
                    placeholder="Deadline"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    className="p-2 rounded bg-gray-700 text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Assigned To"
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="p-2 rounded bg-gray-700 text-white"
                    required
                  />
                  <select
                    multiple
                    value={newTask.dependencies.map(String)}
                    onChange={(e) => {
                      const selectedDependencies = Array.from(e.target.selectedOptions, (option) => parseInt(option.value));
                      setNewTask({ ...newTask, dependencies: selectedDependencies });
                    }}
                    className="p-2 rounded bg-gray-700 text-white"
                  >
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.task}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newTask.contractor_id}
                    onChange={(e) => setNewTask({ ...newTask, contractor_id: parseInt(e.target.value) })}
                    className="p-2 rounded bg-gray-700 text-white"
                  >
                    <option value={0}>Select Contractor</option>
                    {contractors.map((contractor) => (
                      <option key={contractor.id} value={contractor.id}>
                        {contractor.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newTask.milestone_id}
                    onChange={(e) => setNewTask({ ...newTask, milestone_id: parseInt(e.target.value) })}
                    className="p-2 rounded bg-gray-700 text-white"
                  >
                    <option value={0}>Select Milestone</option>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.name} ({milestone.date})
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-yellow" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Task'}
                  </button>
                </div>
              </form>
              <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {editTask && (
                  <form onSubmit={handleEditTask}>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Task"
                        value={editTask.task}
                        onChange={(e) => setEditTask({ ...editTask, task: e.target.value })}
                        className="p-2 rounded bg-gray-700 text-white"
                        required
                      />
                      <input
                        type="date"
                        placeholder="Start Date"
                        value={editTask.start_date}
                        onChange={(e) => setEditTask({ ...editTask, start_date: e.target.value })}
                        className="p-2 rounded bg-gray-700 text-white"
                        required
                      />
                      <input
                        type="date"
                        placeholder="End Date"
                        value={editTask.end_date}
                        onChange={(e) => setEditTask({ ...editTask, end_date: e.target.value })}
                        className="p-2 rounded bg-gray-700 text-white"
                        required
                      />
                      <input
                        type="date"
                        placeholder="Deadline"
                        value={editTask.deadline}
                        onChange={(e) => setEditTask({ ...editTask, deadline: e.target.value })}
                        className="p-2 rounded bg-gray-700 text-white"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Assigned To"
                        value={editTask.assigned_to}
                        onChange={(e) => setEditTask({ ...editTask, assigned_to: e.target.value })}
                        className="p-2 rounded bg-gray-700 text-white"
                        required
                      />
                      <select
                        multiple
                        value={editTask.dependencies?.map(String) || []}
                        onChange={(e) => {
                          const selectedDependencies = Array.from(e.target.selectedOptions, (option) => parseInt(option.value));
                          setEditTask({ ...editTask, dependencies: selectedDependencies });
                        }}
                        className="p-2 rounded bg-gray-700 text-white"
                      >
                        {tasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.task}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editTask.contractor_id || 0}
                        onChange={(e) => setEditTask({ ...editTask, contractor_id: parseInt(e.target.value) })}
                        className="p-2 rounded bg-gray-700 text-white"
                      >
                        <option value={0}>Select Contractor</option>
                        {contractors.map((contractor) => (
                          <option key={contractor.id} value={contractor.id}>
                            {contractor.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editTask.milestone_id || 0}
                        onChange={(e) => setEditTask({ ...editTask, milestone_id: parseInt(e.target.value) })}
                        className="p-2 rounded bg-gray-700 text-white"
                      >
                        <option value={0}>Select Milestone</option>
                        {milestones.map((milestone) => (
                          <option key={milestone.id} value={milestone.id}>
                            {milestone.name} ({milestone.date})
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn-yellow" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Task'}
                      </button>
                    </div>
                  </form>
                )}
              </Modal>
              {loading && <p className="text-yellow-500 mb-4">Loading...</p>}
              {error && <p className="text-red-500 mb-4">{error}</p>}
              <div className="relative">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <div className="grid grid-cols-3 gap-4 relative" ref={kanbanRef}>
                    {Object.keys(columns).map((column) => (
                      <div key={column} className="bg-gray-800 p-4 rounded-lg relative z-10">
                        <h2 className="text-xl font-bold mb-4">{column}</h2>
                        <div className="min-h-[200px]">
                          {milestones
                            .filter((milestone) => {
                              const milestoneDate = new Date(milestone.date);
                              const today = new Date();
                              const isPastDue = milestoneDate < today;
                              const hasLinkedTasks = milestone.linked_tasks.some((taskId) => {
                                const task = tasks.find((t) => t.id === taskId);
                                return task && task.status === column;
                              });
                              return hasLinkedTasks && (column === 'Done' ? !isPastDue : true);
                            })
                            .map((milestone) => (
                              <div key={milestone.id} className="bg-green-700 p-4 mb-2 rounded">
                                <p className="font-bold">Milestone: {milestone.name}</p>
                                <p className="text-sm">Date: {milestone.date}</p>
                              </div>
                            ))}
                          <SortableContext items={columns[column].map((task) => task.id)} id={`${column}-column`}>
                            {columns[column].map((task) => (
                              <SortableTask
                                key={task.id}
                                task={task}
                                onEdit={(task) => {
                                  setEditTask(task);
                                  setIsModalOpen(true);
                                }}
                                onDelete={handleDeleteTask}
                                resources={resources}
                                onAssignResource={handleAssignResource}
                                setTaskPosition={setTaskPosition}
                              />
                            ))}
                          </SortableContext>
                        </div>
                      </div>
                    ))}
                  </div>
                </DndContext>
                {kanbanRef.current && (
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <Stage
                      width={kanbanRef.current.offsetWidth}
                      height={kanbanRef.current.offsetHeight}
                    >
                      <Layer>
                        {tasks.map((task) => {
                          if (!task.dependencies || task.dependencies.length === 0) return null;
                          return task.dependencies.map((depId) => {
                            const sourcePos = taskPositions[task.id];
                            const targetPos = taskPositions[depId];
                            if (!sourcePos || !targetPos) return null;

                            const kanbanRect = kanbanRef.current!.getBoundingClientRect();
                            const sourceX = sourcePos.x - kanbanRect.left + sourcePos.width;
                            const sourceY = sourcePos.y - kanbanRect.top + sourcePos.height / 2;
                            const targetX = targetPos.x - kanbanRect.left;
                            const targetY = targetPos.y - kanbanRect.top + targetPos.height / 2;

                            return (
                              <Line
                                key={`${task.id}-${depId}`}
                                points={[sourceX, sourceY, targetX, targetY]}
                                stroke="white"
                                strokeWidth={2}
                                dash={[5, 5]}
                              />
                            );
                          });
                        })}
                      </Layer>
                    </Stage>
                  </div>
                )}
              </div>
            </>
          ) : viewMode === 'gantt' ? (
            <>
              <button onClick={exportGanttToPDF} className="btn-yellow mb-4">
                Export Gantt to PDF
              </button>
              <GanttChart
                tasks={tasks}
                milestones={milestones}
                onUpdateTaskDates={handleUpdateTaskDates}
                onUpdateDependencies={handleUpdateDependencies}
              />
              <div ref={pdfRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} />
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4">Activity Log</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td>{log.entity_type}</td>
                      <td>{log.entity_id}</td>
                      <td>{log.action}</td>
                      <td>{JSON.stringify(log.details)}</td>
                      <td>{log.created_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  );
}