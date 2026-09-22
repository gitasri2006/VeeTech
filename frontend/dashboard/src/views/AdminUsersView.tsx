import React from 'react';
import { Users, Shield, UserPlus, Key, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types';

export const AdminUsersView: React.FC = () => {
  const users = [
    { id: 'usr-001', name: 'System Admin', email: 'admin@discovery.ai', role: 'Admin' as UserRole, accounts: ['All Entities'], active: true },
    { id: 'usr-002', name: 'Pankaj Sharma', email: 'pankaj.analyst@discovery.ai', role: 'FactVerifier' as UserRole, accounts: ['Tata Motors EV', 'ISRO Gaganyaan'], active: true },
    { id: 'usr-003', name: 'Sarah Connor', email: 'sarah.lead@discovery.ai', role: 'Lead' as UserRole, accounts: ['Tata Motors EV'], active: true },
    { id: 'usr-004', name: 'Rahul Verma', email: 'rahul.analyst@discovery.ai', role: 'Analyst' as UserRole, accounts: ['ISRO Gaganyaan'], active: true },
    { id: 'usr-005', name: 'Executive Client', email: 'exec@tatamotors.com', role: 'Executive' as UserRole, accounts: ['Tata Motors EV'], active: true },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-orange-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Admin Console & Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Role-Based Access Control (RBAC)</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage organization users, team assignments, and granular permissions across 6 role levels per TRD Section 8.
          </p>
        </div>

        <button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center space-x-2 transition shadow-sm">
          <UserPlus className="w-4 h-4" />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-6 font-semibold">User Name & Email</th>
              <th className="py-3.5 px-6 font-semibold">Assigned Role</th>
              <th className="py-3.5 px-6 font-semibold">Account / Entity Scope</th>
              <th className="py-3.5 px-6 font-semibold">Status</th>
              <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition">
                <td className="py-4 px-6">
                  <div className="font-semibold text-slate-900">{u.name}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                </td>
                <td className="py-4 px-6">
                  <span className="px-2.5 py-1 rounded-full font-semibold text-[11px] bg-orange-50 text-orange-700 border border-orange-200">
                    {u.role}
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-600">
                  {u.accounts.join(', ')}
                </td>
                <td className="py-4 px-6">
                  <span className="flex items-center space-x-1.5 text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button className="text-orange-600 hover:text-orange-800 font-medium">Edit Permissions</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
