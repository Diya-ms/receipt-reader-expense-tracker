// File: frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { dashboardAPI, insightsAPI, exportAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  TrendingUp, TrendingDown, Wallet, Calendar, BarChart2,
  ArrowUpRight, Download, Plus, Minus, Sparkles
} from 'lucide-react';

const CATEGORY_COLORS = {
  'Food & Dining': '#f97316', 'Groceries': '#22c55e', 'Transportation': '#3b82f6',
  'Shopping': '#a855f7', 'Entertainment': '#ec4899', 'Utilities': '#eab308',
  'Healthcare': '#ef4444', 'Education': '#06b6d4', 'Others': '#6b7280',
};

const fmt = (n, cur = 'KWD') => `${(+n || 0).toFixed(3)} ${cur}`;
const fmtShort = (n) => `${(+n || 0).toFixed(3)}`;

function StatCard({ icon: Icon, label, value, sub, color = 'indigo', trend }) {
  const colors = {
    indigo: 'from-indigo-600/20 to-indigo-600/5 border-indigo-500/20',
    green: 'from-green-600/20 to-green-600/5 border-green-500/20',
    orange: 'from-orange-600/20 to-orange-600/5 border-orange-500/20',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/20',
  };
  const iconColors = { indigo: 'text-indigo-400 bg-indigo-600/20', green: 'text-green-400 bg-green-600/20', orange: 'text-orange-400 bg-orange-600/20', purple: 'text-purple-400 bg-purple-600/20' };
  return (
    <div className={`stat-card bg-gradient-to-br border ${colors[color]} animate-fade-in`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColors[color]} mb-3`}>
        <Icon size={20} />
      </div>
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="font-display text-2xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-3 text-sm shadow-xl">
      <p className="text-white/60 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{fmtShort(p.value)} KWD</p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [recent, setRecent] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.summary(),
      dashboardAPI.byCategory(30),
      dashboardAPI.monthlyTrend(6),
      dashboardAPI.recentExpenses(8),
      insightsAPI.prediction(),
    ]).then(([s, c, m, r, p]) => {
      setSummary(s.data);
      setCategories(c.data);
      setMonthly(m.data);
      setRecent(r.data);
      setPrediction(p.data);
    }).catch(err => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await exportAPI.csv();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click();
      toast.success('CSV exported!');
    } catch { toast.error('Export failed'); }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
      </div>
    </div>
  );

  const catData = categories.map(c => ({
    name: c.category, value: c.total, color: CATEGORY_COLORS[c.category] || '#6b7280'
  }));

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.username} 👋
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Here's your financial overview</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn-ghost flex items-center gap-2 text-sm">
            <Download size={15} /> Export
          </button>
          <Link to="/upload" className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Scan Receipt
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="All Time" value={fmt(summary?.total_all_time)} sub={`${summary?.total_expenses_count} receipts`} color="indigo" />
        <StatCard icon={Calendar} label="This Month" value={fmt(summary?.total_this_month)} color="green" />
        <StatCard icon={BarChart2} label="This Week" value={fmt(summary?.total_this_week)} color="orange" />
        <StatCard icon={TrendingUp} label="This Year" value={fmt(summary?.total_this_year)} color="purple" />
      </div>

      {/* Prediction Banner */}
      {prediction && prediction.predicted_amount > 0 && (
        <div className="card p-5 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border-indigo-500/20 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">AI Spending Prediction</p>
            <p className="text-white/50 text-xs mt-0.5">
              Based on your history, next month's spending is estimated at{' '}
              <span className="text-indigo-300 font-semibold">{fmt(prediction.predicted_amount)}</span>
              {' '}— trend is{' '}
              <span className={`font-semibold ${prediction.trend === 'increasing' ? 'text-orange-400' : prediction.trend === 'decreasing' ? 'text-green-400' : 'text-blue-400'}`}>
                {prediction.trend}
              </span>
            </p>
          </div>
          <Link to="/insights" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 shrink-0">
            View Details <ArrowUpRight size={12} />
          </Link>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="card p-6">
          <h3 className="font-display font-semibold text-white mb-4">Spending by Category</h3>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                  dataKey="value" paddingAngle={3}>
                  {catData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${fmtShort(v)} KWD`]} contentStyle={{
                  background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '12px', color: '#e2e8f0'
                }} />
                <Legend formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-white/30 text-sm text-center py-16">No data yet</p>}
        </div>

        {/* Bar Chart */}
        <div className="card p-6">
          <h3 className="font-display font-semibold text-white mb-4">Monthly Spending</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart */}
      <div className="card p-6">
        <h3 className="font-display font-semibold text-white mb-4">Expense Trend</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
            <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5}
              dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6, fill: '#818cf8' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Expenses */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-white">Recent Expenses</h3>
          <Link to="/expenses" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
            View All <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="space-y-2">
          {recent.length === 0 && <p className="text-white/30 text-sm text-center py-8">No expenses yet. <Link to="/upload" className="text-indigo-400">Upload your first receipt →</Link></p>}
          {recent.map((exp) => (
            <div key={exp.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
                style={{ background: `${CATEGORY_COLORS[exp.category] || '#6b7280'}20`, color: CATEGORY_COLORS[exp.category] || '#6b7280' }}>
                {exp.merchant_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{exp.merchant_name}</p>
                <p className="text-xs text-white/30">{exp.category} · {new Date(exp.date).toLocaleDateString()}</p>
              </div>
              <span className="text-sm font-semibold text-white font-mono">{fmtShort(exp.amount)} {exp.currency}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
