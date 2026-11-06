import { Link } from 'react-router-dom'
import { displayName, formatDate } from '../lib/tasks'
import type { TaskWithRelations } from '../types/database'
import { StatusBadge } from './StatusBadge'

interface TaskListProps {
  tasks: TaskWithRelations[]
  showObject?: boolean
  onEdit?: (task: TaskWithRelations) => void
  onDelete?: (task: TaskWithRelations) => void
}

export function TaskList({ tasks, showObject = false, onEdit, onDelete }: TaskListProps) {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Задача</th>
            <th>Статус</th>
            {showObject ? <th>Объект</th> : <th>Исполнитель</th>}
            <th>Создана</th>
            {(onEdit || onDelete) && <th><span className="sr-only">Действия</span></th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td><Link to={`/tasks/${task.id}`} className="table-link">{task.title}</Link></td>
              <td><StatusBadge status={task.status} /></td>
              <td>{showObject ? task.object?.name : displayName(task.assignee)}</td>
              <td className="date-cell">{formatDate(task.created_at)}</td>
              {(onEdit || onDelete) && (
                <td>
                  <div className="row-actions">
                    {onEdit && (
                      <button type="button" className="button small secondary" onClick={() => onEdit(task)}>
                        Изменить
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" className="button small danger-quiet" onClick={() => onDelete(task)}>
                        Удалить
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
