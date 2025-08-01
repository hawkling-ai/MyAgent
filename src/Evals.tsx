import React, { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import './App.scss';

interface EvalResult {
  patientId: string;
  patientName: string;
  originalCondition: string;
  rawOutput: string;
  parsedDifferentials: Differential[];
  evalScore: boolean;
}

interface Differential {
  condition: string;
  conclusion: 'positive' | 'negative' | 'needs follow-up';
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

const GET_PATIENTS = gql`
  query GetPatients {
    users(active_status: "active", should_paginate: false) {
      id
      full_name
      age
      gender
      primary_race
      secondary_race
      primary_ethnicity
      secondary_ethnicity
      metadata
      created_at
    }
  }
`;

interface EvalsProps {
  providerId: string;
}

const Evals: React.FC<EvalsProps> = ({ providerId }) => {
  const [modelProvider, setModelProvider] = useState('openai');
  const [prompt, setPrompt] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

  const { loading, error, data } = useQuery(GET_PATIENTS);

  // Extract race/ethnicity and diagnosis from patient data
  const extractDiagnosis = (patient: any) => {
    // Check metadata for condition
    if (patient.metadata) {
      const metadata = typeof patient.metadata === 'string' 
        ? JSON.parse(patient.metadata) 
        : patient.metadata;
      return metadata.condition || metadata.diagnosis || null;
    }
    return null;
  };

  const extractRaceEthnicity = (patient: any) => {
    let race = patient.primary_race || 'Unknown';
    let ethnicity = patient.primary_ethnicity || 'Unknown';
    
    // If native fields are empty, try metadata
    if ((!race || race === 'Unknown') && patient.metadata) {
      const metadata = typeof patient.metadata === 'string' 
        ? JSON.parse(patient.metadata) 
        : patient.metadata;
      race = metadata.race || race;
      ethnicity = metadata.ethnicity || ethnicity;
    }
    
    // Combine secondary if available
    if (patient.secondary_race) {
      race += `, ${patient.secondary_race}`;
    }
    if (patient.secondary_ethnicity) {
      ethnicity += `, ${patient.secondary_ethnicity}`;
    }
    
    return { race, ethnicity };
  };

  const patients: Patient[] = data?.users?.map((user: any) => {
    const { race, ethnicity } = extractRaceEthnicity(user);
    return {
      id: user.id,
      name: user.full_name || 'Unknown',
      age: user.age || 0,
      gender: user.gender || 'Unknown',
      ethnicity,
      race,
      diagnosis: extractDiagnosis(user),
      metadata: user.metadata
    };
  }) || [];

  const patientsWithDiagnosis = patients.filter(p => p.diagnosis);

  const handlePatientToggle = (patientId: string) => {
    setSelectedPatients(prev => 
      prev.includes(patientId) 
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPatients.length === patientsWithDiagnosis.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(patientsWithDiagnosis.map(p => p.id));
    }
  };

  const parseDifferentials = (rawOutput: string): Differential[] => {
    // Simple parsing logic - can be enhanced based on actual model output format
    const differentials: Differential[] = [];
    const lines = rawOutput.split('\n');
    
    lines.forEach(line => {
      const positiveMatch = line.match(/(\w+[\w\s]*):?\s*(positive|likely|confirmed)/i);
      const negativeMatch = line.match(/(\w+[\w\s]*):?\s*(negative|unlikely|ruled out)/i);
      const followUpMatch = line.match(/(\w+[\w\s]*):?\s*(follow[- ]up|uncertain|possible)/i);
      
      if (positiveMatch) {
        differentials.push({ condition: positiveMatch[1].trim(), conclusion: 'positive' });
      } else if (negativeMatch) {
        differentials.push({ condition: negativeMatch[1].trim(), conclusion: 'negative' });
      } else if (followUpMatch) {
        differentials.push({ condition: followUpMatch[1].trim(), conclusion: 'needs follow-up' });
      }
    });
    
    return differentials;
  };

  const evaluatePatient = async (patient: Patient): Promise<EvalResult> => {
    // Prepare patient data for evaluation
    const patientData = {
      age: patient.age,
      gender: patient.gender,
      ethnicity: patient.ethnicity,
      race: patient.race,
      diagnosis: patient.diagnosis
    };

    const fullPrompt = `${prompt}

Patient Data:
- Age: ${patientData.age}
- Gender: ${patientData.gender}
- Ethnicity: ${patientData.ethnicity}
- Race: ${patientData.race}

Please provide a differential diagnosis list for this patient. Format your response as a list of conditions with their likelihood (positive, negative, or needs follow-up).`;

    try {
      let rawOutput = '';
      
      if (modelProvider === 'openai') {
        // Use OpenAI API
        const openAIKey = process.env.REACT_APP_OPENAI_API_KEY;
        if (!openAIKey) {
          throw new Error('OpenAI API key not configured');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a medical diagnostic assistant. Provide differential diagnoses based on patient demographics.' },
              { role: 'user', content: fullPrompt }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        rawOutput = data.choices[0].message.content;
        
      } else if (modelProvider === 'anthropic') {
        // Use Claude API
        const claudeKey = process.env.REACT_APP_CLAUDE_API_KEY;
        if (!claudeKey) {
          throw new Error('Claude API key not configured');
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            messages: [
              { role: 'user', content: fullPrompt }
            ],
            max_tokens: 500
          })
        });

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.statusText}`);
        }

        const data = await response.json();
        rawOutput = data.content[0].text;
        
      } else {
        throw new Error(`Unsupported model provider: ${modelProvider}`);
      }

      const parsedDifferentials = parseDifferentials(rawOutput);
      
      // Check if original condition is in the differential list
      const evalScore = parsedDifferentials.some(
        diff => diff.condition.toLowerCase().includes(patient.diagnosis!.toLowerCase()) && 
                diff.conclusion === 'positive'
      );

      return {
        patientId: patient.id,
        patientName: patient.name,
        originalCondition: patient.diagnosis!,
        rawOutput,
        parsedDifferentials,
        evalScore
      };
    } catch (error) {
      console.error('Error evaluating patient:', error);
      return {
        patientId: patient.id,
        patientName: patient.name,
        originalCondition: patient.diagnosis!,
        rawOutput: `Error: ${error instanceof Error ? error.message : 'Failed to get model response'}`,
        parsedDifferentials: [],
        evalScore: false
      };
    }
  };

  const handleEvaluate = async () => {
    if (!prompt || selectedPatients.length === 0) {
      alert('Please enter a prompt and select at least one patient');
      return;
    }

    setIsEvaluating(true);
    setResults([]);

    const selectedPatientObjects = patients.filter(p => selectedPatients.includes(p.id));
    
    // Evaluate patients sequentially to avoid rate limits
    const newResults: EvalResult[] = [];
    for (const patient of selectedPatientObjects) {
      const result = await evaluatePatient(patient);
      newResults.push(result);
      setResults([...newResults]);
    }

    setIsEvaluating(false);
  };

  if (loading) return <div className="loading">Loading patients...</div>;
  if (error) return <div className="error">Error loading patients: {error.message}</div>;

  const accuracyRate = results.length > 0 
    ? (results.filter(r => r.evalScore).length / results.length * 100).toFixed(1)
    : 0;

  return (
    <div className="evals-container">
      <h1>Medical Decision-Making Agent Evaluation</h1>
      
      <div className="eval-form">
        <div className="form-group">
          <label>Model Provider:</label>
          <select 
            value={modelProvider} 
            onChange={(e) => setModelProvider(e.target.value)}
            className="form-control"
          >
            <option value="openai">OpenAI (GPT-4)</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Evaluation Prompt:</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter the prompt template for evaluating medical conditions..."
            className="form-control"
            rows={4}
          />
        </div>

        <div className="patient-selection">
          <h3>Select Patients with Diagnoses ({patientsWithDiagnosis.length} available)</h3>
          <button onClick={handleSelectAll} className="select-all-btn">
            {selectedPatients.length === patientsWithDiagnosis.length ? 'Deselect All' : 'Select All'}
          </button>
          
          <div className="patient-list">
            {patientsWithDiagnosis.map(patient => (
              <label key={patient.id} className="patient-checkbox">
                <input
                  type="checkbox"
                  checked={selectedPatients.includes(patient.id)}
                  onChange={() => handlePatientToggle(patient.id)}
                />
                <span>
                  {patient.name} - {patient.age}y {patient.gender} - Diagnosis: {patient.diagnosis}
                </span>
              </label>
            ))}
          </div>
        </div>

        <button 
          onClick={handleEvaluate} 
          disabled={isEvaluating || selectedPatients.length === 0}
          className="evaluate-btn"
        >
          {isEvaluating ? `Evaluating... (${results.length}/${selectedPatients.length})` : 'Run Evaluation'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="results-section">
          <h2>Evaluation Results</h2>
          <div className="summary">
            <p>Overall Accuracy: {accuracyRate}% ({results.filter(r => r.evalScore).length}/{results.length})</p>
          </div>

          <div className="results-grid">
            {results.map((result, index) => (
              <div key={index} className={`result-card ${result.evalScore ? 'success' : 'failure'}`}>
                <h3>{result.patientName}</h3>
                <p className="original-condition">Original Diagnosis: <strong>{result.originalCondition}</strong></p>
                
                <div className="eval-score">
                  <span className={result.evalScore ? 'score-pass' : 'score-fail'}>
                    {result.evalScore ? '✓ PASS' : '✗ FAIL'}
                  </span>
                </div>

                <div className="differentials">
                  <h4>Parsed Differentials:</h4>
                  <ul>
                    {result.parsedDifferentials.map((diff, i) => (
                      <li key={i} className={`differential-${diff.conclusion}`}>
                        {diff.condition} - <em>{diff.conclusion}</em>
                      </li>
                    ))}
                  </ul>
                </div>

                <details className="raw-output">
                  <summary>Raw Model Output</summary>
                  <pre>{result.rawOutput}</pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Evals;