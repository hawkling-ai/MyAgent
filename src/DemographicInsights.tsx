import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EvalResult {
  patientId: string;
  patientName: string;
  patientInitials: string;
  originalCondition: string;
  rawOutput: string;
  parsedDifferentials: Differential[];
  evalScore: boolean;
  timestamp: Date;
}

interface Differential {
  condition: string;
  conclusion: "positive" | "negative" | "needs follow-up";
  reasoning: string;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  ethnicity: string;
  race: string;
  diagnosis?: string;
  metadata?: any;
}

interface DemographicInsightsProps {
  results: EvalResult[];
  patients: Patient[];
}

const DemographicInsights: React.FC<DemographicInsightsProps> = ({
  results,
  patients,
}) => {
  // State for selected variable
  const [selectedVariable, setSelectedVariable] = useState<'gender' | 'ethnicity' | 'age' | 'disease'>('gender');

  // Color schemes based on STYLE.md requirements
  const COLORS = {
    success: "#0a7c42", // Success/Pass - using green for success
    failure: "#e32d2d", // Failure/Fail - using red for failure
    neutral: "#53565A", // Neutral/background - using secondary gray
    background: "#FFFFFF",
  };

  // Helper function to find patient data for a result
  const findPatient = (patientId: string): Patient | undefined => {
    return patients.find((p) => p.id === patientId);
  };

  // Helper function to categorize age into groups
  const getAgeGroup = (age: number): string => {
    if (age < 20) return "0-19";
    if (age < 40) return "20-39";
    if (age < 60) return "40-59";
    if (age < 80) return "60-79";
    return "80+";
  };

  // Generate data based on selected variable
  const getChartData = () => {
    const stats: { [key: string]: { pass: number; fail: number } } = {};

    results.forEach((result) => {
      const patient = findPatient(result.patientId);
      if (!patient) return;

      let key: string;
      
      switch (selectedVariable) {
        case 'gender':
          key = patient.gender || "Unknown";
          break;
        case 'ethnicity':
          key = patient.ethnicity || "Unknown";
          break;
        case 'age':
          key = getAgeGroup(patient.age);
          break;
        case 'disease':
          key = result.originalCondition;
          break;
        default:
          key = "Unknown";
      }

      if (!stats[key]) {
        stats[key] = { pass: 0, fail: 0 };
      }

      if (result.evalScore) {
        stats[key].pass++;
      } else {
        stats[key].fail++;
      }
    });

    const chartData = Object.entries(stats).map(([category, counts]) => ({
      category: category.length > 20 ? category.substring(0, 20) + "..." : category,
      fullCategory: category,
      pass: counts.pass,
      fail: counts.fail,
      total: counts.pass + counts.fail,
    }));

    // Sort by age order if selected variable is age, otherwise by total count
    if (selectedVariable === 'age') {
      const ageOrder = ['0-19', '20-39', '40-59', '60-79', '80+'];
      return chartData.sort((a, b) => {
        const indexA = ageOrder.indexOf(a.fullCategory);
        const indexB = ageOrder.indexOf(b.fullCategory);
        return indexA - indexB;
      });
    } else {
      return chartData.sort((a, b) => b.total - a.total); // Sort by total count descending
    }
  };

  const chartData = getChartData();

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = chartData.find(d => d.category === label);
      return (
        <div className="demographic-tooltip">
          <p className="tooltip-label">{data?.fullCategory || label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
          <p>Total: {data?.total}</p>
        </div>
      );
    }
    return null;
  };

  // Variable labels for dropdown
  const variableLabels = {
    gender: 'Gender',
    ethnicity: 'Ethnicity', 
    age: 'Age Groups',
    disease: 'Disease/Diagnosis'
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="demographic-insights">
      <div className="insights-header">
        <h3>🔍 Demographic Insights</h3>
        <p className="insights-subtitle">
          Explore how model performance varies across patient groups.
        </p>
      </div>

      <div className="chart-controls">
        <label htmlFor="variable-select" className="control-label">
          Select Variable:
        </label>
        <select
          id="variable-select"
          value={selectedVariable}
          onChange={(e) => setSelectedVariable(e.target.value as 'gender' | 'ethnicity' | 'age' | 'disease')}
          className="variable-dropdown"
        >
          {Object.entries(variableLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="single-chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#53565A" />
            <XAxis 
              dataKey="category" 
              stroke="#000"
              angle={0}
              textAnchor="middle"
              height={60}
              interval={0}
              tick={{ fontSize: 12, textAnchor: 'middle' }}
            />
            <YAxis 
              stroke="#000"
              label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pass" stackId="a" fill={COLORS.success} name="Pass" />
            <Bar dataKey="fail" stackId="a" fill={COLORS.failure} name="Fail" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DemographicInsights;