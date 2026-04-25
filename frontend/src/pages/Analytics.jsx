import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import Header from '../components/Header.jsx';
import useAnalytics from '../utils/useAnalytics.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

// Bucket labels for age groups and risk score bands
const AGE_LABELS = ['20-29', '30-39', '40-49', '50-59', '60-69', '70+'];
const SCORE_BANDS = ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80-90', '90-100'];

// Shared chart options for the age distribution bar chart
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
        // Appends patient count with correct pluralisation
        label: (ctx) =>
            ` ${ctx.dataset.label}: ${ctx.parsed.y} patient${ctx.parsed.y !== 1 ? 's' : ''}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#1e293b' },
      grid: { color: 'rgba(148,163,184,0.1)' },
      title: { display: true, text: 'Age Group', color: '#1e293b', font: { size: 12 } },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#1e293b', precision: 0 },
      grid: { color: 'rgba(148,163,184,0.1)' },
      title: { display: true, text: 'Number of Patients', color: '#1e293b', font: { size: 12 } },
    },
  },
};

// Shared chart options for the risk score histogram
const histogramOptions = {
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
        // Shows patient count per score band on hover
        label: (ctx) =>
            ` ${ctx.parsed.y} patient${ctx.parsed.y !== 1 ? 's' : ''}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#1e293b' },
      grid: { color: 'rgba(148,163,184,0.1)' },
      title: { display: true, text: 'Risk Score Band', color: '#1e293b', font: { size: 12 } },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#1e293b', precision: 0 },
      grid: { color: 'rgba(148,163,184,0.1)' },
      title: { display: true, text: 'Number of Patients', color: '#1e293b', font: { size: 12 } },
    },
  },
};

// Options for the risk trend line chart
const trendOptions = {
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
        // Shows the average risk score and how many patients that month
        label: (ctx) => ` Avg Risk Score: ${ctx.parsed.y}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#1e293b' },
      grid: { color: 'rgba(148,163,184,0.1)' },
      title: { display: true, text: 'Month', color: '#1e293b', font: { size: 12 } },
    },
    y: {
      beginAtZero: false,
      min: 0,
      max: 100,
      ticks: { color: '#1e293b', precision: 1 },
      grid: { color: 'rgba(148,163,184,0.1)' },
      title: { display: true, text: 'Average Risk Score', color: '#1e293b', font: { size: 12 } },
    },
  },
};

// Builds grouped bar chart data split by high/medium/low risk per age group
const buildAgeChartData = (rows) => {
  // Looks up count for a given risk level and age group from the flat rows array
  const countFor = (riskLevel, ageGroup) => {
    const row = rows.find(
        (r) => r.age_group === ageGroup && r.risk_category === riskLevel
    );
    return row ? row.count : 0;
  };

  return {
    labels: AGE_LABELS,
    datasets: [
      {
        label: 'High Risk',
        data: AGE_LABELS.map((g) => countFor('high', g)),
        backgroundColor: '#EF4444',
        borderRadius: 4,
      },
      {
        label: 'Medium Risk',
        data: AGE_LABELS.map((g) => countFor('medium', g)),
        backgroundColor: '#F59E0B',
        borderRadius: 4,
      },
      {
        label: 'Low Risk',
        data: AGE_LABELS.map((g) => countFor('low', g)),
        backgroundColor: '#10B981',
        borderRadius: 4,
      },
    ],
  };
};

// Builds histogram data with colour-coded bars based on score severity
const buildHistogramData = (rows) => {
  // Colours bars red (≥70), amber (≥40), or green (below 40)
  const barColor = (band) => {
    const lower = parseInt(band.split('-')[0], 10);
    if (lower >= 70) return '#EF4444';
    if (lower >= 40) return '#F59E0B';
    return '#10B981';
  };

  const counts = SCORE_BANDS.map((band) => {
    const row = rows.find((r) => r.score_band === band);
    return row ? row.count : 0;
  });

  return {
    labels: SCORE_BANDS,
    datasets: [
      {
        label: 'Number of Patients',
        data: counts,
        backgroundColor: SCORE_BANDS.map(barColor),
        borderRadius: 4,
        // Full-width bars so they touch, giving a true histogram appearance
        categoryPercentage: 1.0,
        barPercentage: 1.0,
      },
    ],
  };
};

// Builds line chart data from monthly average risk scores.
// Each point on the line is one month's average across all the clinician's patients.
const buildTrendChartData = (rows) => {
  return {
    labels: rows.map((r) => r.month),
    datasets: [
      {
        label: 'Avg Risk Score',
        data: rows.map((r) => r.avg_risk_score),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        pointBackgroundColor: '#3B82F6',
        pointRadius: 5,
        tension: 0.3,
        fill: true,
      },
    ],
  };
};

// Renders the Analytics page with three charts: age distribution, risk score histogram, and risk trend
const Analytics = () => {
  const { data, loading, error } = useAnalytics();

  // Loading and error guards before rendering charts
  if (loading)
    return (
        <div className="analytics-page">
          <Header />
          <p style={{ color: '#94a3b8', padding: '2rem' }}>Loading analytics…</p>
        </div>
    );

  if (error)
    return (
        <div className="analytics-page">
          <Header />
          <p style={{ color: '#EF4444', padding: '2rem' }}>Error: {error}</p>
        </div>
    );

  // Renders empty page shell if data is missing or incomplete
  if (!data || !data.ageDistribution || !data.riskScoreDistribution)
    return (
        <div className="analytics-page">
          <Header />
        </div>
    );

  const ageChartData       = buildAgeChartData(data.ageDistribution);
  const histogramChartData = buildHistogramData(data.riskScoreDistribution);
  // Falls back to empty array if riskTrend is missing so the chart renders gracefully
  const trendChartData     = buildTrendChartData(data.riskTrend || []);

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
                <h2 className="chart-title">Risk Score Distribution</h2>
                <p className="chart-subtitle">Number of patients per 10-point risk score band</p>
              </div>
              <div className="chart-content" style={{ height: '300px' }}>
                <Bar data={histogramChartData} options={histogramOptions} />
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <h2 className="chart-title">Average Risk Score Trend</h2>
                <p className="chart-subtitle">Monthly average risk score across all patients</p>
              </div>
              <div className="chart-content" style={{ height: '300px' }}>
                <Line data={trendChartData} options={trendOptions} />
              </div>
            </div>

          </div>
        </main>
      </div>
  );
};

export default Analytics;