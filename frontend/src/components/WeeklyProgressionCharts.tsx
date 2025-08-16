import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './WeeklyProgressionCharts.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface WeeklyProgressionData {
  week: number;
  parameters: any;
  lab_report: any;
  changes_from_baseline: any;
}

interface WeeklyProgressionChartsProps {
  weeklyProgression: WeeklyProgressionData[];
}

const WeeklyProgressionCharts: React.FC<WeeklyProgressionChartsProps> = ({ weeklyProgression }) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('vitals');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  if (!weeklyProgression || weeklyProgression.length === 0) {
    return <div>No weekly progression data available</div>;
  }

  // Debug logging
  console.log('WeeklyProgressionCharts received data:', weeklyProgression);
  console.log('First week data:', weeklyProgression[0]);

  const weeks = weeklyProgression.map(w => `Week ${w.week}`);
  
  // Extract data for different metric categories with better error handling
  const getMetricData = (category: string, metric: string) => {
    return weeklyProgression.map(week => {
      try {
        if (category === 'vitals') {
          return week.lab_report?.vital_signs?.[metric]?.value || week.parameters?.vitals?.[metric] || 0;
        } else if (category === 'metabolic') {
          return week.lab_report?.comprehensive_metabolic_panel?.[metric]?.value || week.parameters?.metabolic?.[metric] || 0;
        } else if (category === 'lipids') {
          return week.lab_report?.lipid_panel?.[metric]?.value || week.parameters?.lipids?.[metric] || 0;
        } else if (category === 'cbc') {
          return week.lab_report?.complete_blood_count?.[metric]?.value || week.parameters?.cbc?.[metric] || 0;
        } else if (category === 'liver') {
          return week.lab_report?.liver_function?.[metric]?.value || week.parameters?.liver?.[metric] || 0;
        } else if (category === 'thyroid') {
          return week.lab_report?.thyroid_function?.[metric]?.value || week.parameters?.thyroid?.[metric] || 0;
        } else if (category === 'lifestyle') {
          return week.parameters?.lifestyle?.[metric] || 0;
        } else if (category === 'physical') {
          return week.parameters?.physical?.[metric] || 0;
        }
        return 0;
      } catch (error) {
        console.error(`Error getting metric data for ${category}.${metric}:`, error);
        return 0;
      }
    });
  };

  const getMetricUnit = (category: string, metric: string) => {
    try {
      if (category === 'vitals') {
        return weeklyProgression[0]?.lab_report?.vital_signs?.[metric]?.unit || '';
      } else if (category === 'metabolic') {
        return weeklyProgression[0]?.lab_report?.comprehensive_metabolic_panel?.[metric]?.unit || '';
      } else if (category === 'lipids') {
        return weeklyProgression[0]?.lab_report?.lipid_panel?.[metric]?.unit || '';
      } else if (category === 'cbc') {
        return weeklyProgression[0]?.lab_report?.complete_blood_count?.[metric]?.unit || '';
      } else if (category === 'liver') {
        return weeklyProgression[0]?.lab_report?.liver_function?.[metric]?.unit || '';
      } else if (category === 'thyroid') {
        return weeklyProgression[0]?.lab_report?.thyroid_function?.[metric]?.unit || '';
      } else if (category === 'lifestyle') {
        // Lifestyle metrics typically don't have units, but we can provide context
        const metricUnits: { [key: string]: string } = {
          'exercise_frequency': 'times/week',
          'sleep_duration': 'hours',
          'stress_level': '1-10 scale',
          'weight_kg': 'kg'
        };
        return metricUnits[metric] || '';
      } else if (category === 'physical') {
        const metricUnits: { [key: string]: string } = {
          'weight_kg': 'kg',
          'height_cm': 'cm',
          'bmi': 'kg/m²'
        };
        return metricUnits[metric] || '';
      }
      return '';
    } catch (error) {
      console.error(`Error getting metric unit for ${category}.${metric}:`, error);
      return '';
    }
  };

  const getReferenceRange = (category: string, metric: string) => {
    try {
      if (category === 'vitals') {
        return weeklyProgression[0]?.lab_report?.vital_signs?.[metric]?.reference_range || '';
      } else if (category === 'metabolic') {
        return weeklyProgression[0]?.lab_report?.comprehensive_metabolic_panel?.[metric]?.reference_range || '';
      } else if (category === 'lipids') {
        return weeklyProgression[0]?.lab_report?.lipid_panel?.[metric]?.reference_range || '';
      } else if (category === 'cbc') {
        return weeklyProgression[0]?.lab_report?.complete_blood_count?.[metric]?.reference_range || '';
      } else if (category === 'liver') {
        return weeklyProgression[0]?.lab_report?.liver_function?.[metric]?.reference_range || '';
      } else if (category === 'thyroid') {
        return weeklyProgression[0]?.lab_report?.thyroid_function?.[metric]?.reference_range || '';
      }
      return '';
    } catch (error) {
      console.error(`Error getting reference range for ${category}.${metric}:`, error);
      return '';
    }
  };

  const getMetricLabel = (metric: string) => {
    return metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getMetricsForCategory = (category: string) => {
    const firstWeek = weeklyProgression[0];
    if (!firstWeek) return [];

    try {
      switch (category) {
        case 'vitals':
          return Object.keys(firstWeek.lab_report?.vital_signs || firstWeek.parameters?.vitals || {});
        case 'metabolic':
          return Object.keys(firstWeek.lab_report?.comprehensive_metabolic_panel || firstWeek.parameters?.metabolic || {});
        case 'lipids':
          return Object.keys(firstWeek.lab_report?.lipid_panel || firstWeek.parameters?.lipids || {});
        case 'cbc':
          return Object.keys(firstWeek.lab_report?.complete_blood_count || firstWeek.parameters?.cbc || {});
        case 'liver':
          return Object.keys(firstWeek.lab_report?.liver_function || firstWeek.parameters?.liver || {});
        case 'thyroid':
          return Object.keys(firstWeek.lab_report?.thyroid_function || firstWeek.parameters?.thyroid || {});
        case 'lifestyle':
          return Object.keys(firstWeek.parameters?.lifestyle || {});
        case 'physical':
          return Object.keys(firstWeek.parameters?.physical || {});
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error getting metrics for category ${category}:`, error);
      return [];
    }
  };

  const createChartData = (category: string, metrics: string[]) => {
    const datasets = metrics.map((metric, index) => {
      const colors = [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
      ];
      
      return {
        label: getMetricLabel(metric),
        data: getMetricData(category, metric),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.1,
      };
    });

    return {
      labels: weeks,
      datasets,
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: true,
        text: `${getMetricLabel(selectedMetric)} Metrics Over Time`,
        font: {
          size: 18,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const metric = context.dataset.label;
            const value = context.parsed.y;
            const unit = getMetricUnit(selectedMetric, context.dataIndex === 0 ? 
              Object.keys(getMetricsForCategory(selectedMetric))[context.datasetIndex] : '');
            const range = getReferenceRange(selectedMetric, context.dataIndex === 0 ? 
              Object.keys(getMetricsForCategory(selectedMetric))[context.datasetIndex] : '');
            return `${metric}: ${value} ${unit} (Ref: ${range})`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Week',
          font: {
            weight: 'bold' as const,
          },
        },
        grid: {
          display: true,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Value',
          font: {
            weight: 'bold' as const,
          },
        },
        grid: {
          display: true,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  const metrics = getMetricsForCategory(selectedMetric);
  const chartData = createChartData(selectedMetric, metrics);

  return (
    <div className="weekly-progression-charts">
      <div className="chart-controls">
        <div className="control-group">
          <label>Metric Category:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="metric-selector"
          >
            <option value="vitals">Vital Signs</option>
            <option value="metabolic">Metabolic Panel</option>
            <option value="lipids">Lipid Profile</option>
            <option value="lifestyle">Lifestyle Factors</option>
            <option value="physical">Physical Measurements</option>
            <option value="cbc">Complete Blood Count</option>
            <option value="liver">Liver Function</option>
            <option value="thyroid">Thyroid Function</option>
          </select>
        </div>
        
        <div className="control-group">
          <label>Chart Type:</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
            className="chart-type-selector"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
          </select>
        </div>
      </div>

      <div className="chart-container">
        {chartType === 'line' ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <Bar data={chartData} options={chartOptions} />
        )}
      </div>

      <div className="metrics-summary">
        <h4>Metrics in {getMetricLabel(selectedMetric)} Category:</h4>
        <div className="metrics-grid">
          {metrics.map((metric) => {
            const firstValue = getMetricData(selectedMetric, metric)[0];
            const lastValue = getMetricData(selectedMetric, metric)[getMetricData(selectedMetric, metric).length - 1];
            const change = lastValue - firstValue;
            const unit = getMetricUnit(selectedMetric, metric);
            const range = getReferenceRange(selectedMetric, metric);
            
            return (
              <div key={metric} className="metric-card">
                <h5>{getMetricLabel(metric)}</h5>
                <div className="metric-values">
                  <span className="value">
                    {firstValue} {unit}
                  </span>
                  <span className="arrow">→</span>
                  <span className="value">
                    {lastValue} {unit}
                  </span>
                </div>
                <div className="metric-change">
                  {change > 0 ? '+' : ''}{change} {unit}
                  <span className={`change-indicator ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}`}>
                    {change > 0 ? '↗' : change < 0 ? '↘' : '→'}
                  </span>
                </div>
                <div className="metric-range">
                  Ref: {range}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeeklyProgressionCharts; 