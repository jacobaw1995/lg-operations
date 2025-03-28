'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../lib/supabase';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) {
      setError('Error fetching projects: ' + error.message);
    } else {
      setProjects(data || []);
      if (data && data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    }
  };

  const fetchTasks = async () => {
    if (!selectedProject) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', selectedProject);
    if (error) {
      setError('Error fetching tasks: ' + error.message);
    } else {
      setTasks(data || []);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [selectedProject]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newProject.name) {
      setError('Project name is required.');
      return;
    }
    const { error } = await supabase.from('projects').insert([newProject]);
    if (error) {
      setError('Error adding project: ' + error.message);
    } else {
      setNewProject({ name: '' });
      fetchProjects();
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newTask.task || !newTask.deadline || !newTask.assigned_to || !selectedProject) {
      setError('All fields are required, and a project must be selected.');
      return;
    }
    const { error } = await supabase.from('tasks').insert([{
      ...newTask,
      project_id: selectedProject,
    }]);
    if (error) {
      setError('Error adding task: ' + error.message);
    } else {
      setNewTask({ task: '', status: 'To Do', deadline: '', assigned_to: '' });
      fetchTasks();
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask) return;
    setError('');
    const { error } = await supabase
      .from('tasks')
      .update({
        task: editTask.task,
        status: editTask.status,
        deadline: editTask.deadline,
        assigned_to: editTask.assigned_to,
      })
      .eq('id', editTask.id);
    if (error) {
      setError('Error updating task: ' + error.message);
    } else {
      setEditTask(null);
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    setError('');
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      setError('Error deleting task: ' + error.message);
    } else {
      fetchTasks();
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;

    setLoading(true);
    const activeTask = tasks.find((task) => task.id === active.id);
    const overColumn = over.id.toString().split('-')[0];

    if (activeTask && overColumn) {
      const updatedTask = { ...activeTask, status: overColumn };
      const { error } = await supabase
        .from('tasks')
        .update({ status: updatedTask.status })
        .eq('id', activeTask.id);
      if (error) {
        setError('Error updating task status: ' + error.message);
      }
      fetchTasks();
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
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <button type="submit" className="btn-yellow">
            Add Project
          </button>
        </div>
      </form>
      <div className="mb-8">
        <select
          value={selectedProject || ''}
          onChange={(e) => setSelectedProject(parseInt(e.target.value))}
          className="p-2 rounded bg-gray-700 text-white w-full"
        >
          <option value="">Select Project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      {selectedProject && (
        <>
          <form onSubmit={editTask ? handleEditTask : handleAddTask} className="mb-8 bg-gray-800 p-6 rounded-lg">
            <div className="grid grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Task"
                value={editTask ? editTask.task : newTask.task}
                onChange={(e) =>
                  editTask
                    ? setEditTask({ ...editTask, task: e.target.value })
                    : setNewTask({ ...newTask, task: e.target.value })
                }
                className="p-2 rounded bg-gray-700 text-white"
                required
              />
              <input
                type="date"
                value={editTask ? editTask.deadline : newTask.deadline}
                onChange={(e) =>
                  editTask
                    ? setEditTask({ ...editTask, deadline: e.target.value })
                    : setNewTask({ ...newTask, deadline: e.target.value })
                }
                className="p-2 rounded bg-gray-700 text-white"
                required
              />
              <input
                type="text"
                placeholder="Assigned To"
                value={editTask ? editTask.assigned_to : newTask.assigned_to}
                onChange={(e) =>
                  editTask
                    ? setEditTask({ ...editTask, assigned_to: e.target.value })
                    : setNewTask({ ...newTask, assigned_to: e.target.value })
                }
                className="p-2 rounded bg-gray-700 text-white"
                required
              />
              <button type="submit" className="btn-yellow">
                {editTask ? 'Update Task' : 'Add Task'}
              </button>
              {editTask && (
                <button
                  type="button"
                  onClick={() => setEditTask(null)}
                  className="btn-yellow bg-red-500 hover:bg-red-600"
                >
                  Cancel
                </button>
              )}
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </form>
          {loading && <p className="text-yellow-500 mb-4">Updating task status...</p>}
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
                          onEdit={(task) => setEditTask(task)}
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