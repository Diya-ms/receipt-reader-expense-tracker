// File: frontend/src/pages/UploadPage.jsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { receiptsAPI, expensesAPI } from '../utils/api';
import {
  Upload, FileImage, FileText, X, Check, Edit2, Save,
  Loader, Receipt, Plus, Trash2, ChevronDown
} from 'lucide-react';

const CATEGORIES = ['Food & Dining','Groceries','Transportation','Shopping','Entertainment','Utilities','Healthcare','Education','Others'];

function CategoryBadge({ cat }) {
  const colors = {
    'Food & Dining': '#f97316', 'Groceries': '#22c55e', 'Transportation': '#3b82f6',
    'Shopping': '#a855f7', 'Entertainment': '#ec4899', 'Utilities': '#eab308',
    'Healthcare': '#ef4444', 'Education': '#06b6d4', 'Others': '#6b7280',
  };
  const c = colors[cat] || '#6b7280';
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
      style={{ background: `${c}20`, color: c, border: `1px solid ${c}30` }}>
      {cat}
    </span>
  );
}

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const onDrop = useCallback((accepted) => {
    if (!accepted.length) return;
    const f = accepted[0];
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
    setParsed(null);
    setForm(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'], 'application/pdf': ['.pdf'] },
    maxSize: 16 * 1024 * 1024,
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await receiptsAPI.upload(fd);
      const data = res.data;
      setParsed(data);
      setForm({
        merchant_name: data.merchant_name || '',
        date: data.date ? parseDate(data.date) : new Date().toISOString().split('T')[0],
        category: data.category || 'Others',
        amount: data.total_amount || 0,
        tax_amount: data.tax_amount || 0,
        currency: 'KWD',
        notes: '',
        items: data.items || [],
        receipt_path: data.receipt_path || '',
      });
      toast.success('Receipt processed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'OCR processing failed');
    } finally {
      setUploading(false);
    }
  };

  const parseDate = (raw) => {
    try {
      const parts = raw.includes('/') ? raw.split('/') : raw.includes('-') ? raw.split('-') : [raw];
      if (parts.length === 3) {
        const [d, m, y] = parts.map(Number);
        if (y > 31) return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const fullY = y < 100 ? 2000 + y : y;
        return `${fullY}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      }
    } catch {}
    return new Date().toISOString().split('T')[0];
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await expensesAPI.create({ ...form, date: new Date(form.date).toISOString() });
      toast.success('Expense saved!');
      navigate('/expenses');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { name: '', quantity: 1, price: 0 }] }));
  const removeItem = (i) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const setItem = (i, key, val) => setForm(p => ({
    ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [key]: val } : it)
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Scan Receipt</h1>
        <p className="text-white/40 text-sm mt-0.5">Upload an image or PDF to extract expense data automatically</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload area */}
        <div className="space-y-4">
          <div {...getRootProps()} className={`
            border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 min-h-[200px] flex flex-col items-center justify-center gap-3
            ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/25 hover:bg-white/3'}
            ${file ? 'border-green-500/40 bg-green-500/5' : ''}
          `}>
            <input {...getInputProps()} />
            {file ? (
              <>
                {preview
                  ? <img src={preview} alt="preview" className="max-h-40 rounded-xl object-contain" />
                  : <FileText size={40} className="text-indigo-400" />
                }
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-400" />
                  <p className="text-sm text-white font-medium truncate max-w-[200px]">{file.name}</p>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setParsed(null); setForm(null); }}
                    className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-white/30 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
                  {isDragActive ? <Upload size={28} className="text-indigo-400 animate-bounce" /> : <FileImage size={28} className="text-indigo-400" />}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{isDragActive ? 'Drop it here!' : 'Drag & drop your receipt'}</p>
                  <p className="text-white/30 text-xs mt-1">or click to browse · JPG, PNG, PDF up to 16MB</p>
                </div>
              </>
            )}
          </div>

          {file && !parsed && (
            <button onClick={handleUpload} disabled={uploading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {uploading
                ? <><Loader size={16} className="animate-spin" /> Processing with OCR…</>
                : <><Receipt size={16} /> Extract Receipt Data</>
              }
            </button>
          )}

          {/* Raw text preview */}
          {parsed?.raw_text && (
            <div className="card p-4">
              <p className="text-xs text-white/40 font-mono uppercase tracking-wider mb-2">Raw OCR Output</p>
              <pre className="text-xs text-white/50 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {parsed.raw_text.trim()}
              </pre>
            </div>
          )}
        </div>

        {/* Editable form */}
        {form && (
          <div className="space-y-4 animate-slide-up">
            <div className="card p-5 space-y-4">
              <h3 className="font-display font-semibold text-white flex items-center gap-2">
                <Edit2 size={16} className="text-indigo-400" /> Edit Extracted Data
              </h3>

              <div>
                <label className="label">Merchant Name</label>
                <input className="input-field" value={form.merchant_name} onChange={e => setField('merchant_name', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input-field" value={form.date} onChange={e => setField('date', e.target.value)} />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select className="input-field" value={form.currency} onChange={e => setField('currency', e.target.value)}>
                    {['KWD', 'USD', 'EUR', 'GBP', 'SAR', 'AED'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Category</label>
                <div className="relative">
                  <select className="input-field appearance-none pr-8" value={form.category} onChange={e => setField('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
                <div className="mt-1.5"><CategoryBadge cat={form.category} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Total Amount</label>
                  <input type="number" step="0.001" className="input-field font-mono" value={form.amount} onChange={e => setField('amount', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="label">Tax Amount</label>
                  <input type="number" step="0.001" className="input-field font-mono" value={form.tax_amount} onChange={e => setField('tax_amount', parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Optional notes…" />
              </div>
            </div>

            {/* Line Items */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-white text-sm">Line Items ({form.items.length})</h3>
                <button onClick={addItem} className="btn-ghost text-xs flex items-center gap-1 py-1.5 px-3">
                  <Plus size={12} /> Add Item
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {form.items.length === 0 && <p className="text-white/30 text-xs text-center py-4">No items extracted</p>}
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className="input-field flex-1 text-xs py-1.5" value={item.name} onChange={e => setItem(i, 'name', e.target.value)} placeholder="Item name" />
                    <input type="number" className="input-field w-14 text-xs py-1.5 text-center font-mono" value={item.quantity} onChange={e => setItem(i, 'quantity', parseInt(e.target.value) || 1)} />
                    <input type="number" step="0.001" className="input-field w-20 text-xs py-1.5 font-mono" value={item.price} onChange={e => setItem(i, 'price', parseFloat(e.target.value) || 0)} />
                    <button onClick={() => removeItem(i)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
              {saving
                ? <><Loader size={16} className="animate-spin" /> Saving…</>
                : <><Save size={16} /> Save Expense</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
