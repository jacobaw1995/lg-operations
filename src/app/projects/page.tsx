'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../lib/supabase';
import ProjectSelector from './ProjectSelector';

// Rest of your existing imports and type definitions remain unchanged
type Task = {
  id: number;
  project_id: number;
  task: string;
  status: string;
  deadline: string;
  assigned_to: string;
};

type Project = {
  id: number;
  name: string;
};

// Modal and SortableTask components remain unchanged
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
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-700 p-4 mb-2 rounded cursor-move flex justify-between items-center"
    >
      <div>
        <p>{task.task}</p>
        <p className="text-sm text-gray-400">Due: {task.deadline}</p>
        <p className="text-sm text-gray-400">Assigned: {task.assigned_to}</p>
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

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newProject, setNewProject] = useState({ name: '' });
  const [newTask, setNewTask] = useState({ task: '', status: 'To Do', deadline: '', assigned_to: '' });
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchTasks();
  }, [selectedProject, fetchTasks]);

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
      setNewProject({ name: '' });
      fetchProjects();
    }
    setLoading(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newTask.task || !newTask.deadline || !newTask.assigned_to || !selectedProject) {
      setError('All fields are required, and a project must be selected.');
      return;
    }
    setLoading(true);
    const taskData = { ...newTask, project_id: selectedProject };
    const { data, error } = await supabase.from('tasks').insert([taskData]).select();
    if (error) {
      setError('Failed to add task. Please try again.');
      console.error('Task Insert Error:', error);
    } else {
      console.log('Task Added:', data);
      setNewTask({ task: '', status: 'To Do', deadline: '', assigned_to: '' });
      fetchTasks();
    }
    setLoading(false);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask) return;
    setError('');
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .update({
        task: editTask.task,
        status: editTask.status,
        deadline: editTask.deadline,
        assigned_to: editTask.assigned_to,
      })
      .eq('id', editTask.id)
      .select();
    if (error) {
      setError('Failed to update task. Please try again.');
      console.error('Task Update Error:', error);
    } else {
      console.log('Task Updated:', data);
      setEditTask(null);
      setIsModalOpen(false);
      fetchTasks();
    }
    setLoading(false);
  };

  const handleDeleteTask = async (taskId: number) => {
    setError('');
    setLoading(true);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      setError('Failed to delete task. Please try again.');
      console.error('Task Delete Error:', error);
    } else {
      fetchTasks();
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
        fetchTasks();
      }
    }
    setLoading(false);
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
                  <button type="submit" className="btn-yellow" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Task'}
                  </button>
                </div>
              </form>
            )}
          </Modal>
          {loading && <p className="text-yellow-500 mb-4">Loading...</p>}
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-3 gap-4">
              {Object.keys(columns).map((column) => (
                <div key={column} className="bg-gray-800 p-4 rounded-lg">
                  <h2 className="text-xl font-bold mb-4">{column}</h2>
                  <SortableContext items={columns[column].map((task) => task.id)} id={`${column}-column`}>
                    <div className="min-h-[200px]">
                      {columns[column].map((task) => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          onEdit={(task) => {
                            setEditTask(task);
                            setIsModalOpen(true);
                          }}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              ))}
            </div>
          </DndContext>
        </>
      )}
    </div>
  );
}