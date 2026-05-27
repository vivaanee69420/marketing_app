import { Card, SectionHead, DataTable, Pill, Badge, Button, Notice } from '../components/index.js';
import { useUsers, useApproveUser, useRejectUser } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_TONE = { approved: 'ok', pending: 'warn', rejected: 'err' };

const FRIENDLY = {
  cannot_moderate_self: "You can't change your own access.",
  cannot_reject_superadmin: "You can't reject another superadmin.",
  user_not_found: 'That user no longer exists.',
  not_superadmin: 'Superadmin access required.',
};

export default function Admin() {
  const { user } = useAuth();
  const usersQ = useUsers();
  const approve = useApproveUser();
  const reject = useRejectUser();

  const busy = approve.isPending || reject.isPending;
  const mutErr = approve.error || reject.error;

  const columns = [
    {
      key: 'user', header: 'User',
      render: (u) => (
        <div>
          <strong style={{ color: 'var(--heading)' }}>{u.username}</strong>
          <div className="subtle" style={{ fontSize: 12 }}>{u.email}</div>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (u) => <Pill tone={STATUS_TONE[u.status] || 'warn'}>{u.status}</Pill>,
    },
    {
      key: 'role', header: 'Role',
      render: (u) => (u.is_superadmin ? <Badge>Superadmin</Badge> : <span className="subtle">Member</span>),
    },
    {
      key: 'actions', header: 'Actions', className: 'right',
      render: (u) => {
        const isSelf = u.user_id === user?.id;
        if (isSelf || u.is_superadmin) return <span className="subtle">—</span>;
        return (
          <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
            {u.status !== 'approved' && (
              <Button variant="primary" disabled={busy} onClick={() => approve.mutate(u.user_id)}>
                Approve
              </Button>
            )}
            {u.status !== 'rejected' && (
              <Button disabled={busy} onClick={() => reject.mutate(u.user_id)}>
                Reject
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Card>
      <SectionHead
        title="User access"
        description="Approve or reject who can sign in. New signups stay pending until you approve them."
      />
      {mutErr && <Notice tone="issue">{FRIENDLY[mutErr.message] || mutErr.message}</Notice>}
      {usersQ.isError && <Notice tone="issue">Couldn't load users: {usersQ.error.message}</Notice>}
      <DataTable
        columns={columns}
        rows={usersQ.data || []}
        rowKey="user_id"
        empty={usersQ.isLoading ? 'Loading…' : 'No users yet.'}
      />
    </Card>
  );
}
