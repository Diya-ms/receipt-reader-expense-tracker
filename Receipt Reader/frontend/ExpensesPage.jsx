// File: frontend/src/pages/ExpensesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { expensesAPI, exportAPI } from '../utils/api';
import toast from 'react-hot-toast';
import {
  Search, Filter, Download, Trash2, Edit2, Plus, X,
  ChevronLeft, ChevronRight, Check, Loader, SlidersHorizontal
} from 'lucide-react';

const CATEGORIES = ['Food & Dining','Groceries','Transportation','Shopping','Entertainment','Utilities','Healthcare','Education','Others'];
const CATEGORY_COLORS = {
  'Food & Dining': '#f97316', 'Groceries': '#22c55e', 'Transportation': '#3b82f6',
  'Shopping': '#a855f7', 'Entertainment': '#ec4899', 'Utilities': '#eab308',
  'Healthcare': '#ef4444', 'Education': '#06b6d4', 'Others': '#6b7280',
};

function EditModal({ expense, onClose, onSave }) {
  const [form, setForm] = useState({
    merchant_name: expense.merchant_name,
    date: expense.date?.split('T')[0],
    category: expense.category,
    amount: expense.amount,
    tax_amount: expense.tax_amount || 0,
    currency: expense.currency || 'KWD',
    notes: expense.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await expensesAPI.update(expense.id, { ...form, date: new Date(form.date).toISOString() });
      onSave(res.data);
      toast.success('Expense updated!');
      onClose();
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const f = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-white">Edit Expense</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div><label className="label">Merchant</label><input className="input-field" {...f('merchant_name')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input type="date" className="input-field" {...f('date')} /></div>
            <div>
              <label className="label">Category</label>
              <select className="input-field" {...f('category')}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount</label><input type="number" step="0.001" className="input-field font-mono" {...f('amount')} /></div>
            <div><label className="label">Currency</label>
              <select className="input-field" {...f('currency')}>
                {['KWD','USD','EUR','GBP','SAR','AED'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Notes</label><textarea className="input-field resize-none" rows={2} {...f('notes')} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [editTarget, setEditTarget] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '', category: '', date_from: '', date_to: '',
    min_amount: '', max_amount: '', sort_by: 'date', sort_dir: 'desc'
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 15, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const res = await expensesAPI.list(params);
      setExpenses(res.data.expenses);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await expensesAPI.delete(id);
      toast.success('Deleted');
      fetchExpenses();
    } catch { toast.error('Delete failed'); }
  };

  const handleBulkDelete = async () => {
    if (!selected.size || !window.confirm(`Delete ${selected.size} expenses?`)) return;
    try {
      await expensesAPI.bulkDelete([...selected]);
      setSelected(new Set());
      toast.success(`Deleted ${selected.size} expenses`);
      fetchExpenses();
    } catch { toast.error('Bulk delete failed'); }
  };

  const handleExport = async (type) => {
    try {
      const res = await exportAPI[type](Object.fromEntries(Object.entries(filters).filter(([,v]) => v)));
      const ext = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' }[type];
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = `expenses.${ext}`; a.click();
      toast.success(`${type.toUpperCase()} exported!`);
    } catch { toast.error('Export failed'); }
  };

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selected.size === expenses.length) setSelected(new Set());
    else setSelected(new Set(expenses.map(e => e.id)));
  };

  const filt = (key, val) => { setFilters(p => ({ ...p, [key]: val })); setPage(1); };

  return (
    <div className="space-y-5 animate-slide-up">
      {editTarget && <EditModal expense={editTarget} onClose={() => setEditTarget(null)}
        onSave={(updated) => setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e))} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Expenses</h1>
          <p className="text-white/40 text-sm">{total} total records</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm hover:bg-red-500/20 transition-colors">
              <Trash2 size={14} /> Delete {selected.size}
            </button>
          )}
          <div className="relative group">
            <button className="btn-ghost flex items-center gap-2 text-sm"><Download size={15} /> Export</button>
            <div className="absolute right-0 top-full mt-1 w-36 bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {['csv', 'excel', 'pdf'].map(t => (
                <button key={t} onClick={() => handleExport(t)}
                  className="w-full px-4 py-2.5 text-sm text-left text-white/70 hover:bg-white/5 hover:text-white transition-colors uppercase font-mono">
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost flex items-center gap-2 text-sm">
            <SlidersHorizontal size={15} /> Filters
          </button>
          <Link to="/upload" className="btn-primary flex items-center gap-2 text-sm"><Plus size={15} /> Add</Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input className="input-field pl-10" placeholder="Search merchants, notes…"
          value={filters.search} onChange={e => filt('search', e.target.value)} />
        {filters.search && <button onClick={() => filt('search', '')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X size={14} /></button>}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-5 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <div>
            <label className="label">Category</label>
            <select className="input-field" value={filters.category} onChange={e => filt('category', e.target.value)}>
              <option value="">All</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From Date</label>
            <input type="date" className="input-field" value={filters.date_from} onChange={e => filt('date_from', e.target.value)} />
          </div>
          <div>
            <label className="label">To Date</label>
            <input type="date" className="input-field" value={filters.date_to} onChange={e => filt('date_to', e.target.value)} />
          </div>
          <div>
            <label className="label">Sort By</label>
            <select className="input-field" value={`${filters.sort_by}-${filters.sort_dir}`} onChange={e => {
              const [by, dir] = e.target.value.split('-');
              setFilters(p => ({ ...p, sort_by: by, sort_dir: dir })); setPage(1);
            }}>
              <option value="date-desc">Date (Newest)</option>
              <option value="date-asc">Date (Oldest)</option>
              <option value="amount-desc">Amount (High)</option>
              <option value="amount-asc">Amount (Low)</option>
            </select>
          </div>
          <div>
            <label className="label">Min Amount</label>
            <input type="number" step="0.001" className="input-field font-mono" placeholder="0.000" value={filters.min_amount} onChange={e => filt('min_amount', e.target.value)} />
          </div>
          <div>
            <label className="label">Max Amount</label>
            <input type="number" step="0.001" className="input-field font-mono" placeholder="999.999" value={filters.max_amount} onChange={e => filt('max_amount', e.target.value)} />
          </div>
          <div className="col-span-2 flex items-end">
            <button onClick={() => { setFilters({ search: '', category: '', date_from: '', date_to: '', min_amount: '', max_amount: '', sort_by: 'date', sort_dir: 'desc' }); setPage(1); }}
              className="btn-ghost text-sm flex items-center gap-1.5"><X size={13} /> Clear All</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-4 text-left w-10">
                  <input type="checkbox" checked={selected.size === expenses.length && expenses.length > 0}
                    onChange={toggleAll} className="accent-indigo-500 w-4 h-4 rounded" />
                </th>
                <th className="p-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Merchant</th>
                <th className="p-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="p-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden sm:table-cell">Category</th>
                <th className="p-4 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Amount</th>
                <th className="p-4 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-white/3">
                  <td className="p-4"><div className="skeleton w-4 h-4 rounded" /></td>
                  <td className="p-4"><div className="skeleton h-4 w-32 rounded" /></td>
                  <td className="p-4 hidden md:table-cell"><div className="skeleton h-4 w-20 rounded" /></td>
                  <td className="p-4 hidden sm:table-cell"><div className="skeleton h-5 w-24 rounded-full" /></td>
                  <td className="p-4 text-right"><div className="skeleton h-4 w-16 rounded ml-auto" /></td>
                  <td className="p-4" />
                </tr>
              ))}
              {!loading && expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/30">
                    No expenses found. <Link to="/upload" className="text-indigo-400 hover:underline">Upload a receipt →</Link>
                  </td>
                </tr>
              )}
              {!loading && expenses.map(exp => {
                const color = CATEGORY_COLORS[exp.category] || '#6b7280';
                return (
                  <tr key={exp.id} className={`border-b border-white/3 hover:bg-white/3 transition-colors ${selected.has(exp.id) ? 'bg-indigo-600/5' : ''}`}>
                    <td className="p-4">
                      <input type="checkbox" checked={selected.has(exp.id)} onChange={() => toggleSelect(exp.id)} className="accent-indigo-500 w-4 h-4 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: `${color}20`, color }}>
                          {exp.merchant_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{exp.merchant_name}</p>
                          {exp.notes && <p className="text-xs text-white/30 truncate max-w-[120px]">{exp.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm text-white/50 font-mono">
                      {new Date(exp.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="badge" style={{ background: `${color}20`, color, borderColor: `${color}30` }}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-semibold text-white font-mono">{(+exp.amount).toFixed(3)}</span>
                      <span className="text-xs text-white/30 ml-1">{exp.currency}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditTarget(exp)} className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-white/30 hover:text-indigo-400 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-white/40">Page {page} of {pages} · {total} records</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white/60 hover:text-white transition-colors">
                <ChevronLeft size={16} />
              </button>
              {[...Array(Math.min(pages, 5))].map((_, i) => {
                const p = i + 1;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === page ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-white/40 hover:text-white'}`}>
                    {p}
                  </button>
                );
              })}
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white/60 hover:text-white transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
