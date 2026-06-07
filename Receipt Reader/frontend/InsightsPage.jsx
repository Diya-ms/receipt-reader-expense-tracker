// File: frontend/src/pages/InsightsPage.jsx
import React, { useState, useEffect } from 'react';
import { insightsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Info, Brain, Target, ArrowUpRight, Loader
} from 'lucide-react';

const CATEGORY_COLORS = {
  'Food & Dining': '#f97316', 'Groceries': '#22c55e', 'Transportation': '#3b82f6',
  'Shopping': '#a855f7', 'Entertainment': '#ec4899', 'Utilities': '#eab308',
  'Healthcare': '#ef4444', 'Education': '#06b6d4', 'Others': '#6b7280',
};

function TrendIcon({ trend, size = 16 }) {
  if (trend === 'increasing') return <TrendingUp size={size} className="text-orange-400" />;
  if (trend === 'decreasing') return <TrendingDown size={size} className="text-green-400" />;
  return <Minus size={size} className="text-blue-400" />;
}

function SuggestionCard({ suggestion }) {
  const isWarning = suggestion.type === 'warning';
  return (
    <div className={`p-4 rounded-xl border flex gap-3 ${
      isWarning ? 'bg-orange-500/10 border-orange-500/20' : 'bg-blue-500/10 border-blue-500/20'
    }`}>
      {isWarning ? <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" /> : <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />}
      <div className="flex-1">
        <p className={`text-sm font-medium ${isWarning ? 'text-orange-300' : 'text-blue-300'}`}>{suggestion.category}</p>
        <p className="text-white/60 text-xs mt-0.5">{suggestion.message}</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-xs text-white/40">Current: {suggestion.current_pct}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs text-white/40">Target: {suggestion.suggested_pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-3 text-sm shadow-xl">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#818cf8' }} className="font-mono font-medium">
          {(+p.value).toFixed(3)} KWD
        </p>
      ))}
    </div>
  );
};

export default function InsightsPage() {
  const [summary, setSummary] = useState(null);
  const [catPredictions, setCatPredictions] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      insightsAPI.summary(),
      insightsAPI.categoryPredictions(),
      insightsAPI.budgetSuggestions(),
    ]).then(([s, c, b]) => {
      setSummary(s.data);
      setCatPredictions(c.data);
      setSuggestions(b.data);
    }).catch(() => toast.error('Failed to load insights'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
    </div>
  );

  const prediction = summary?.next_month_prediction;
  const monthlyData = prediction?.monthly_data || [];

  // Add predicted point
  const chartData = [...monthlyData];
  if (prediction?.predicted_month && prediction?.predicted_amount) {
    chartData.push({
      month: prediction.predicted_month,
      amount: prediction.predicted_amount,
      isPrediction: true,
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
          <Brain size={24} className="text-indigo-400" /> AI Insights
        </h1>
        <p className="text-white/40 text-sm mt-0.5">ML-powered spending predictions and budget recommendations</p>
      </div>

      {/* Prediction Hero */}
      {prediction && (
        <div className="card p-6 bg-gradient-to-br from-indigo-600/15 to-purple-600/10 border-indigo-500/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Sparkles size={24} className="text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-display text-white font-bold">Next Month Prediction</p>
                <span className="badge bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                  Linear Regression
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="font-display text-4xl font-bold text-white">
                  {(+prediction.predicted_amount).toFixed(3)}
                </span>
                <span className="text-white/40 text-lg">KWD</span>
                <span className="text-white/30 text-sm">est. for {prediction.predicted_month}</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-white/40 mb-1">Trend</p>
                  <div className="flex items-center gap-1.5">
                    <TrendIcon trend={prediction.trend} size={14} />
                    <span className="text-sm font-medium text-white capitalize">{prediction.trend}</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-white/40 mb-1">Confidence</p>
                  <p className="text-sm font-medium text-white">{prediction.confidence}%</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-white/40 mb-1">Avg Monthly</p>
                  <p className="text-sm font-medium text-white font-mono">{(+prediction.average_monthly).toFixed(3)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prediction Chart */}
      {chartData.length > 0 && (
        <div className="card p-6">
          <h3 className="font-display font-semibold text-white mb-4">Spending Trend & Forecast</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {prediction?.predicted_month && (
                <ReferenceLine x={prediction.predicted_month} stroke="#6366f1" strokeDasharray="4 4"
                  label={{ value: 'Predicted', position: 'top', fill: '#818cf8', fontSize: 11 }} />
              )}
              <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5}
                dot={(props) => {
                  const isPred = props.payload?.isPrediction;
                  return <circle key={props.index} cx={props.cx} cy={props.cy} r={isPred ? 6 : 4}
                    fill={isPred ? '#818cf8' : '#6366f1'}
                    stroke={isPred ? '#1a1a2e' : 'transparent'} strokeWidth={2} />;
                }}
                activeDot={{ r: 6, fill: '#818cf8' }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-white/30 mt-2 text-center">
            * Dashed line indicates predicted month based on Linear Regression model
          </p>
        </div>
      )}

      {/* Category Predictions */}
      {catPredictions.length > 0 && (
        <div className="card p-6">
          <h3 className="font-display font-semibold text-white mb-4">Category Forecasts</h3>
          <div className="space-y-3">
            {catPredictions.slice(0, 6).map((pred) => {
              const color = CATEGORY_COLORS[pred.category] || '#6b7280';
              const maxAmt = Math.max(...catPredictions.map(p => p.predicted_amount));
              const pct = maxAmt > 0 ? (pred.predicted_amount / maxAmt) * 100 : 0;
              return (
                <div key={pred.category} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <p className="text-xs text-white/60 truncate">{pred.category}</p>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-28 justify-end">
                    <TrendIcon trend={pred.trend} size={12} />
                    <span className="text-xs font-mono text-white">{(+pred.predicted_amount).toFixed(3)} KWD</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Top Category', value: summary.top_spending_category, sub: `${(+summary.top_spending_amount).toFixed(3)} KWD` },
            { label: 'All Time Total', value: `${(+summary.total_all_time).toFixed(3)}`, sub: 'KWD spent total' },
            { label: 'Avg per Expense', value: `${(+summary.average_per_expense).toFixed(3)}`, sub: 'KWD per receipt' },
            { label: 'Total Receipts', value: summary.total_receipts, sub: 'expenses tracked' },
          ].map((stat, i) => (
            <div key={i} className="card p-4">
              <p className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</p>
              <p className="font-display text-xl font-bold text-white mt-1 truncate">{stat.value}</p>
              <p className="text-xs text-white/30 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Budget Suggestions */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-indigo-400" />
          <h3 className="font-display font-semibold text-white">Budget Recommendations</h3>
        </div>
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <Target size={20} className="text-green-400" />
            </div>
            <p className="text-white/60 text-sm">Your spending looks balanced! No major concerns.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s, i) => <SuggestionCard key={i} suggestion={s} />)}
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      {summary?.category_breakdown?.length > 0 && (
        <div className="card p-6">
          <h3 className="font-display font-semibold text-white mb-4">All-Time Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.category_breakdown.slice(0, 8)} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" radius={[0, 6, 6, 0]}
                fill="#6366f1"
                cell={summary.category_breakdown.map((entry, i) => ({
                  fill: CATEGORY_COLORS[entry.category] || '#6366f1'
                }))}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
