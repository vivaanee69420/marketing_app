import { useState } from 'react';
import {
  PageHeader, Card, SectionHead, Pill, Button, DataTable,
  InputField, TextAreaField, SelectField,
} from '../components/index.js';
import { formatDate } from '../lib/format.js';
import * as mock from '../lib/mock.js';

const statusTone = (status) => {
  if (status === 'Done') return 'ok';
  if (status === 'In Progress') return 'warn';
  return 'err';
};

const taskCols = [
  { key: 'task', header: 'Task', className: 'cell-strong' },
  { key: 'business', header: 'Business' },
  { key: 'category', header: 'Category' },
  { key: 'priority', header: 'Priority' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Pill tone={statusTone(row.status)}>{row.status}</Pill>,
  },
  { key: 'source', header: 'Source' },
  {
    key: 'created',
    header: 'Created',
    render: (row) => formatDate(row.created),
  },
  {
    key: 'update',
    header: 'Update',
    render: (row) => (
      <div className="row">
        <select
          className="filter-select"
          defaultValue={row.status}
        >
          {mock.taskStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Button>Save</Button>
      </div>
    ),
  },
];

export default function Tasks() {
  const [business, setBusiness] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    // Mock UI — no-op submit
  };

  return (
    <div className="stack">
      <PageHeader
        title="Task Manager"
        description="View, create and update tasks across all businesses. AI-generated tasks from report insights land here automatically."
      />

      {/* Section 2: Create task form */}
      <Card>
        <SectionHead
          title="Create task"
          description="Manually add a task to the queue for any business."
        />
        <form className="stack" onSubmit={handleAdd}>
          <div className="grid cols-2">
            <SelectField
              label="Business"
              options={mock.businesses}
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
            />
            <InputField
              label="Title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextAreaField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <SelectField
              label="Category"
              options={mock.taskCategories}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <SelectField
              label="Priority"
              options={mock.taskPriorities}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
            <InputField
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <Button variant="primary" type="submit">Add Task</Button>
          </div>
        </form>
      </Card>

      {/* Section 3: Auto task rules */}
      <Card>
        <SectionHead
          title="Automatic task rules"
          description="How AI reports feed the task queue."
        />
        <ul className="list">
          <li>
            Each AI report&apos;s <strong>nextActions</strong> array generates tasks automatically — capped at 8 per report run to prevent queue flooding.
          </li>
          <li>
            Duplicate detection is applied on task title + business: if an identical open task already exists it is skipped rather than re-created.
          </li>
          <li>
            Category and priority are derived from the insight type — integration failures become <em>Integration / High</em>, creative suggestions become <em>Creative / Medium</em>, and so on.
          </li>
          <li>
            Sync or report failures automatically raise a <strong>dashboard issue</strong> visible in the Overview health panel, ensuring nothing is silently dropped.
          </li>
        </ul>
      </Card>

      {/* Section 4: Task queue table */}
      <Card>
        <SectionHead
          title="Task queue"
          description="All tasks across every business. Use the inline selector to update status."
        />
        <DataTable
          columns={taskCols}
          rows={mock.tasks}
          rowKey="id"
          empty="No tasks found."
        />
      </Card>
    </div>
  );
}
