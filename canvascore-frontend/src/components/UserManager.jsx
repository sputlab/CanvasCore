import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { UserPlus, Users, Trash2, KeyRound } from 'lucide-react';
import { Button, Card, Field, Input, Select, PageHeader, Badge } from '../ui/kit';
import { notify } from '../ui/notify';

export default function UserManager() {
  const me = useStore((st) => st.username);
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('editor');

  const fetchUsers = () => {
    fetch('api.php?action=get_users')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setUsers(data); })
      .catch(console.error);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    try {
      const res = await fetch('api.php?action=add_user', { method: 'POST', body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }) });
      const data = await res.json();
      notify(data.message || (data.success ? 'User added.' : 'Error adding user.'), data.success ? 'success' : 'error');
      if (data.success) {
        setNewUsername(''); setNewPassword(''); setNewRole('editor');
        fetchUsers();
      }
    } catch { notify('Error adding user.', 'error'); }
  };

  const handleForcePassword = async (id, username) => {
    const newPwd = window.prompt(`Enter new password for user "${username}":`);
    if (!newPwd) return;
    try {
      const res = await fetch('api.php?action=force_password', { method: 'POST', body: JSON.stringify({ id, password: newPwd }) });
      const data = await res.json();
      notify(data.message || 'Done.', data.success === false ? 'error' : 'success');
    } catch { notify('Network error.', 'error'); }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      const res = await fetch('api.php?action=delete_user', { method: 'POST', body: JSON.stringify({ id }) });
      const data = await res.json();
      notify(data.message || 'Done.', data.success ? 'success' : 'error');
      if (data.success) fetchUsers();
    } catch { notify('Network error.', 'error'); }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader icon={Users} title="Accounts" description="People who can sign in to the editor. Editors manage content; administrators also manage accounts, backups and custom code." />

      <Card title="Add a user" icon={UserPlus}>
        <form onSubmit={handleAddUser}>
          <div className="ui-grid" style={{ '--ui-min': '180px' }}>
            <Field label="Username"><Input value={newUsername} onChange={e => setNewUsername(e.target.value)} required autoComplete="off" /></Field>
            <Field label="Password"><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password" /></Field>
            <Field label="Role">
              <Select value={newRole} onChange={e => setNewRole(e.target.value)} options={[['editor', 'Editor (content only)'], ['admin', 'Administrator (full control)']]} />
            </Field>
          </div>
          <Button type="submit" variant="success" icon={UserPlus}>Add user</Button>
        </form>
      </Card>

      <Card title={`Accounts (${users.length})`} icon={Users}>
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead><tr><th>User</th><th>Role</th><th className="ui-cell-actions">Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="ui-cell-title">{u.username}{u.username === me && <span className="ui-hint" style={{ fontWeight: 400 }}> (you)</span>}</td>
                  <td><Badge tone={u.role === 'admin' ? 'accent' : 'neutral'}>{u.role}</Badge></td>
                  <td className="ui-cell-actions">
                    <span className="ui-row" style={{ justifyContent: 'flex-end', gap: 6, flexWrap: 'nowrap' }}>
                      <Button size="sm" icon={KeyRound} onClick={() => handleForcePassword(u.id, u.username)}>Change password</Button>
                      <Button size="sm" variant="danger" icon={Trash2} onClick={() => handleDeleteUser(u.id, u.username)} disabled={u.username === me} title={u.username === me ? 'You cannot delete your own account' : undefined}>Delete</Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
