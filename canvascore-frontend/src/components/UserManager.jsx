import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronLeft, UserPlus, Users, Trash2, Edit } from 'lucide-react';

export default function UserManager() {
  const { setView } = useStore();
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
      alert(data.message);
      if (data.success) {
        setNewUsername(''); setNewPassword(''); setNewRole('editor');
        fetchUsers();
      }
    } catch (err) { alert("Error adding user"); }
  };

  const handleForcePassword = async (id, username) => {
    const newPwd = window.prompt(`Enter new password for user "${username}":`);
    if (!newPwd) return;
    try {
      const res = await fetch('api.php?action=force_password', { method: 'POST', body: JSON.stringify({ id, password: newPwd }) });
      const data = await res.json();
      alert(data.message);
    } catch (err) { alert("Network Error"); }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      const res = await fetch('api.php?action=delete_user', { method: 'POST', body: JSON.stringify({ id }) });
      const data = await res.json();
      alert(data.message);
      if (data.success) fetchUsers();
    } catch (err) { alert("Network Error"); }
  };

  const inputStyle = { width: '100%', padding: '7px 9px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '750', color: '#94a3b8', marginBottom: '5px' };

  return (
    <div style={{ padding: '16px 22px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc' }}>
      <button onClick={() => setView('manager')} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: 0, marginBottom: '20px' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Users size={24} color="#38bdf8" /> User Management
      </h2>

      <div style={{ background: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} color="#10b981" /> Add New User
        </h3>
        <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={labelStyle}>USERNAME</label>
            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={labelStyle}>PASSWORD</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={labelStyle}>ROLE</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="editor">Editor (No Account Management)</option>
              <option value="admin">Administrator (Full Control)</option>
            </select>
          </div>
          <button type="submit" style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '40px' }}>Add User</button>
        </form>
      </div>

      <div style={{ background: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Account List</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block', fontSize: '15px' }}>{u.username}</span>
                <span style={{ fontSize: '11px', color: u.role === 'admin' ? '#38bdf8' : '#a78bfa', fontWeight: 'bold', textTransform: 'uppercase' }}>{u.role}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleForcePassword(u.id, u.username)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                  <Edit size={14} /> Change Pw
                </button>
                <button onClick={() => handleDeleteUser(u.id, u.username)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
