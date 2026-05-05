import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Tag, Users } from 'lucide-react';
import { useProposals } from '../../hooks/useProposals.js';
import { useAuthStore } from '../../store/auth.store.js';
import { facultiesApi } from '../../api/faculties.api.js';
import { useQuery } from '@tanstack/react-query';

const STATUS_COLORS = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-slate-100 text-slate-600',
  CLOSED: 'bg-red-100 text-red-600',
};

const STATUS_LABELS = {
  PUBLISHED: 'מפורסם',
  DRAFT: 'טיוטה',
  CLOSED: 'סגור',
};

export function ProposalListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');

  const { data: proposals = [], isLoading } = useProposals(
    facultyFilter ? { facultyId: facultyFilter } : undefined
  );

  const { data: faculties = [] } = useQuery({
    queryKey: ['faculties'],
    queryFn: facultiesApi.list,
  });

  const filtered = proposals.filter((p) =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.supervisor.firstName.toLowerCase().includes(search.toLowerCase()) ||
    p.supervisor.lastName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">הצעות פרויקטים</h1>
        {user?.role === 'SUPERVISOR' && (
          <button
            onClick={() => navigate('/proposals/new')}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} /> צור הצעה
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input-base pr-9"
            placeholder="חיפוש לפי כותרת או מנחה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-base w-44"
          value={facultyFilter}
          onChange={(e) => setFacultyFilter(e.target.value)}
        >
          <option value="">כל הפקולטות</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="text-muted-foreground text-sm">טוען...</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'לא נמצאו הצעות התואמות לחיפוש.' : 'אין הצעות פרויקטים כרגע.'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>
    </div>
  );
}

function ProposalCard({ proposal }) {
  return (
    <Link
      to={`/proposals/${proposal.id}`}
      className="block bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h2 className="font-semibold text-base leading-snug line-clamp-2">{proposal.title}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[proposal.status]}`}>
          {STATUS_LABELS[proposal.status]}
        </span>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{proposal.description}</p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users size={12} />
          {proposal._count?.applications ?? 0} מועמדות
        </span>
        <span>עד {proposal.maxStudents} סטודנטים</span>
      </div>

      {proposal.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {proposal.tags.slice(0, 4).map((tag) => (
            <span key={tag.id} className="flex items-center gap-0.5 text-xs bg-primary/8 text-primary px-2 py-0.5 rounded-full">
              <Tag size={10} /> {tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        {proposal.supervisor.firstName} {proposal.supervisor.lastName} · {proposal.faculty?.name}
      </div>
    </Link>
  );
}
