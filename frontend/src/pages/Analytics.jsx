import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import Header from '../components/Header.jsx';
import useAnalytics from '../utils/useAnalytics.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

//Chart options

const ageOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#1e293b', boxWidth: 12 } },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      padding: 10,
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} patient${ctx.parsed.y !== 1 ? 's' : ''}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#1e293b' },
      grid:  { color: 'rgba(148,163,184,0.1)' },
      title: { display: true, text: 'Age Group', color: '#1e293b', font: { size: 12 } },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#1e293b', precision: 0 },
      grid:  { color: 'rgba(148,163,184,0.1)' },
      title: { display: true, text: 'Number of Patients', color: '#1e293b', font: { size: 12 } },
    },
  },
};

const scoreOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      padding: 10,
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y} patient${ctx.parsed.y !== 1 ? 's' : ''}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#1e293b' },
      grid:  { color: 'rgba(148,163,184,0.1)' },
      title: { display: true, text: 'Risk Category', color: '#1e293b', font: { size: 12 } },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#1e293b', precision: 0 },
      grid:  { color: 'rgba(148,163,184,0.1)' },
      title: { display: true, text: 'Number of Patients', color: '#1e293b', font: { size: 12 } },
    },
  },
};

// Data Builders

const buildAgeChartData = (rows) => {
  const AGE_LABELS = ['20-29', '30-39', '40-49', '50-59', '60-69', '70+'];

  const countFor = (riskLevel, ageGroup) => {
    const row = rows.find(r => r.age_group === ageGroup && r.risk_category === riskLevel);
    return row ? row.count : 0;
  };

  return {
    labels: AGE_LABELS,
    datasets: [
      { label: 'High Risk',   data: AGE_LABELS.map(g => countFor('high',   g)), backgroundColor: '#EF4444', borderRadius: 4 },
      { label: 'Medium Risk', data: AGE_LABELS.map(g => countFor('medium', g)), backgroundColor: '#F59E0B', borderRadius: 4 },
      { label: 'Low Risk',    data: AGE_LABELS.map(g => countFor('low',    g)), backgroundColor: '#10B981', borderRadius: 4 },
    ],
  };
};

const buildScoreChartData = (rows) => ({
  labels: ['Low Risk', 'Medium Risk', 'High Risk'],
  datasets: [{
    label: 'Patients',
    data: [
      rows.find(r => r.risk_category === 'low')?.count    || 0,
      rows.find(r => r.risk_category === 'medium')?.count || 0,
      rows.find(r => r.risk_category === 'high')?.count   || 0,
    ],
    backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
    borderRadius: 4,
  }],
});

//Component

const Analytics = () => {
  const { data, loading, error } = useAnalytics();

  if (loading) return <div className="analytics-page"><Header /><p style={{ color: '#94a3b8', padding: '2rem' }}>Loading analytics…</p></div>;
  if (error)   return <div className="analytics-page"><Header /><p style={{ color: '#EF4444',  padding: '2rem' }}>Error: {error}</p></div>;
  if (!data || !data.ageDistribution || !data.scoreDistribution) return <div className="analytics-page"><Header /></div>;
  const ageChartData   = buildAgeChartData(data.ageDistribution);
  const scoreChartData = buildScoreChartData(data.scoreDistribution);

  return (
      <div className="analytics-page">
        <Header />
        <main className="analytics-content">
          <div className="charts-grid">

            <div className="chart-card">
              <div className="chart-card-header">
                <h2 className="chart-title">Patient Demographics Analysis</h2>
                <p className="chart-subtitle">Age distribution of patients by risk level</p>
              </div>
              <div className="chart-content" style={{ height: '300px' }}>
                <Bar data={ageChartData} options={ageOptions} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <h2 className="chart-title">Risk Category Distribution</h2>
                <p className="chart-subtitle">Patient count by risk category</p>
              </div>
              <div className="chart-content" style={{ height: '300px' }}>
                <Bar data={scoreChartData} options={scoreOptions} />
              </div>
            </div>

          </div>
        </main>
      </div>
  );
};

export default Analytics;