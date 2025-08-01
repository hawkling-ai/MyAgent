import React, { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import './App.scss';

interface EvalResult {
  patientId: string;
  patientName: string;
  originalCondition: string;
  rawOutput: string;
  parsedDifferentials: Differential[];
  evalScore: boolean;
  timestamp: Date;
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

interface ModelConfig {
  provider: 'openai' | 'anthropic';
  prompt: string;
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

const DEFAULT_PROMPT = `Given the patient demographics below, provide a differential diagnosis list. 
For each condition, indicate whether it is:
- Positive/Likely: High probability based on demographics
- Negative/Unlikely: Low probability  
- Needs follow-up: Requires additional testing

Consider demographic risk factors and prevalence rates when making your assessment.`;

const Evals: React.FC<EvalsProps> = ({ providerId }) => {
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic'>('openai');
  const [modelConfigs, setModelConfigs] = useState<Record<string, ModelConfig>>({
    openai: { provider: 'openai', prompt: DEFAULT_PROMPT },
    anthropic: { provider: 'anthropic', prompt: DEFAULT_PROMPT }
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [currentEvalProgress, setCurrentEvalProgress] = useState({ current: 0, total: 0 });

  const { loading, error, data } = useQuery(GET_PATIENTS);

  // Extract race/ethnicity and diagnosis from patient data
  const extractDiagnosis = (patient: any) => {
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
    
    if ((!race || race === 'Unknown') && patient.metadata) {
      const metadata = typeof patient.metadata === 'string' 
        ? JSON.parse(patient.metadata) 
        : patient.metadata;
      race = metadata.race || race;
      ethnicity = metadata.ethnicity || ethnicity;
    }
    
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

  const updateModelConfig = (provider: string, prompt: string) => {
    setModelConfigs(prev => ({
      ...prev,
      [provider]: { ...prev[provider], prompt }
    }));
  };

  const parseDifferentials = (rawOutput: string): Differential[] => {
    const differentials: Differential[] = [];
    const lines = rawOutput.split('\n');
    
    lines.forEach(line => {
      // Handle numbered lists
      const numberedMatch = line.match(/^\d+\.\s*(.+?):\s*(.+)/);
      if (numberedMatch) {
        const condition = numberedMatch[1].trim();
        const assessment = numberedMatch[2].toLowerCase();
        
        if (assessment.includes('positive') || assessment.includes('likely') || assessment.includes('confirmed')) {
          differentials.push({ condition, conclusion: 'positive' });
        } else if (assessment.includes('negative') || assessment.includes('unlikely') || assessment.includes('ruled out')) {
          differentials.push({ condition, conclusion: 'negative' });
        } else if (assessment.includes('follow') || assessment.includes('uncertain') || assessment.includes('possible')) {
          differentials.push({ condition, conclusion: 'needs follow-up' });
        }
        return;
      }
      
      // Handle bullet points
      const bulletMatch = line.match(/^[-*•]\s*(.+?):\s*(.+)/);
      if (bulletMatch) {
        const condition = bulletMatch[1].trim();
        const assessment = bulletMatch[2].toLowerCase();
        
        if (assessment.includes('positive') || assessment.includes('likely') || assessment.includes('confirmed')) {
          differentials.push({ condition, conclusion: 'positive' });
        } else if (assessment.includes('negative') || assessment.includes('unlikely') || assessment.includes('ruled out')) {
          differentials.push({ condition, conclusion: 'negative' });
        } else if (assessment.includes('follow') || assessment.includes('uncertain') || assessment.includes('possible')) {
          differentials.push({ condition, conclusion: 'needs follow-up' });
        }
        return;
      }
      
      // Original regex patterns as fallback
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

  const evaluatePatient = async (patient: Patient, modelProvider: string): Promise<EvalResult> => {
    const config = modelConfigs[modelProvider];
    const patientData = {
      age: patient.age,
      gender: patient.gender,
      ethnicity: patient.ethnicity,
      race: patient.race,
      diagnosis: patient.diagnosis
    };

    const fullPrompt = `${config.prompt}

Patient Data:
- Age: ${patientData.age}
- Gender: ${patientData.gender}
- Ethnicity: ${patientData.ethnicity}
- Race: ${patientData.race}

Please provide a differential diagnosis list. For each condition, indicate whether it is:
- Positive/Likely: High probability based on demographics
- Negative/Unlikely: Low probability
- Needs follow-up: Requires additional testing`;

    try {
      let rawOutput = '';
      
      if (modelProvider === 'openai') {
        const openAIKey = process.env.REACT_APP_OPENAI_API_KEY;
        if (!openAIKey) {
          throw new Error('OpenAI API key not configured. Please add REACT_APP_OPENAI_API_KEY to your .env file');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: 'You are a medical diagnostic assistant. Provide differential diagnoses based on patient demographics.' },
              { role: 'user', content: fullPrompt }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        rawOutput = data.choices[0].message.content;
        
      } else if (modelProvider === 'anthropic') {
        const claudeKey = process.env.REACT_APP_CLAUDE_API_KEY;
        if (!claudeKey) {
          throw new Error('Claude API key not configured. Please add REACT_APP_CLAUDE_API_KEY to your .env file');
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            messages: [
              { role: 'user', content: fullPrompt }
            ],
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Claude API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        rawOutput = data.content[0].text;
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
        evalScore,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error evaluating patient:', error);
      return {
        patientId: patient.id,
        patientName: patient.name,
        originalCondition: patient.diagnosis!,
        rawOutput: `Error: ${error instanceof Error ? error.message : 'Failed to get model response'}`,
        parsedDifferentials: [],
        evalScore: false,
        timestamp: new Date()
      };
    }
  };

  const handleEvaluate = async () => {
    const config = modelConfigs[selectedProvider];
    if (!config.prompt || selectedPatients.length === 0) {
      alert('Please enter a prompt and select at least one patient');
      return;
    }

    setIsEvaluating(true);
    setResults([]);
    setCurrentEvalProgress({ current: 0, total: selectedPatients.length });

    const selectedPatientObjects = patients.filter(p => selectedPatients.includes(p.id));
    
    // Evaluate patients sequentially to avoid rate limits
    const newResults: EvalResult[] = [];
    for (let i = 0; i < selectedPatientObjects.length; i++) {
      setCurrentEvalProgress({ current: i + 1, total: selectedPatients.length });
      const result = await evaluatePatient(selectedPatientObjects[i], selectedProvider);
      newResults.push(result);
      setResults([...newResults]);
    }

    setIsEvaluating(false);
    setCurrentEvalProgress({ current: 0, total: 0 });
  };

  if (loading) return <div className="loading">Loading patients...</div>;
  if (error) return <div className="error">Error loading patients: {error.message}</div>;

  const accuracyRate = results.length > 0 
    ? (results.filter(r => r.evalScore).length / results.length * 100).toFixed(1)
    : 0;

  const passCount = results.filter(r => r.evalScore).length;
  const failCount = results.filter(r => !r.evalScore).length;

  return (
    <div className="evals-container">
      <div className="evals-layout">
        {/* Left Pane - Model Configuration */}
        <div className="evals-left-pane">
          <h2>Model Configuration</h2>
          
          <div className="model-tabs">
            {/* OpenAI Tab */}
            <div className={`model-tab ${selectedProvider === 'openai' ? 'active' : ''}`}>
              <button 
                className="model-tab-header"
                onClick={() => setSelectedProvider('openai')}
              >
                <span className="provider-name">OpenAI</span>
                <span className="model-name">GPT-4 Turbo</span>
              </button>
              
              {selectedProvider === 'openai' && (
                <div className="model-tab-content">
                  <div className="form-group">
                    <label>Evaluation Prompt</label>
                    <textarea
                      value={modelConfigs.openai.prompt}
                      onChange={(e) => updateModelConfig('openai', e.target.value)}
                      placeholder="Enter your evaluation prompt for medical diagnosis..."
                      className="form-control"
                      rows={8}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Anthropic Tab */}
            <div className={`model-tab ${selectedProvider === 'anthropic' ? 'active' : ''}`}>
              <button 
                className="model-tab-header"
                onClick={() => setSelectedProvider('anthropic')}
              >
                <span className="provider-name">Anthropic</span>
                <span className="model-name">Claude 3.5 Sonnet</span>
              </button>
              
              {selectedProvider === 'anthropic' && (
                <div className="model-tab-content">
                  <div className="form-group">
                    <label>Evaluation Prompt</label>
                    <textarea
                      value={modelConfigs.anthropic.prompt}
                      onChange={(e) => updateModelConfig('anthropic', e.target.value)}
                      placeholder="Enter your evaluation prompt for medical diagnosis..."
                      className="form-control"
                      rows={8}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Patient Selection */}
          <div className="patient-selection">
            <div className="selection-header">
              <h3>Select Patients ({patientsWithDiagnosis.length} available)</h3>
              <button onClick={handleSelectAll} className="select-all-btn">
                {selectedPatients.length === patientsWithDiagnosis.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="patient-list">
              {patientsWithDiagnosis.map(patient => (
                <label key={patient.id} className="patient-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedPatients.includes(patient.id)}
                    onChange={() => handlePatientToggle(patient.id)}
                  />
                  <span className="patient-info">
                    <span className="patient-name">{patient.name}</span>
                    <span className="patient-details">
                      {patient.age}y {patient.gender} • {patient.diagnosis}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button 
            onClick={handleEvaluate} 
            disabled={isEvaluating || selectedPatients.length === 0 || !modelConfigs[selectedProvider].prompt}
            className="evaluate-btn"
          >
            {isEvaluating ? `Evaluating...` : 'Run Evaluation'}
          </button>
        </div>

        {/* Right Pane - Results Visualization */}
        <div className="evals-right-pane">
          <h2>Evaluation Results</h2>
          
          {isEvaluating && (
            <div className="evaluation-progress">
              <div className="progress-text">
                Evaluating patient {currentEvalProgress.current} of {currentEvalProgress.total}
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(currentEvalProgress.current / currentEvalProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="results-summary">
                <div className="accuracy-score">
                  <span className="score-label">Accuracy</span>
                  <span className="score-value">{accuracyRate}%</span>
                </div>
                <div className="score-breakdown">
                  <div className="pass-count">
                    <span className="count-label">Pass</span>
                    <span className="count-value">{passCount}</span>
                  </div>
                  <div className="fail-count">
                    <span className="count-label">Fail</span>
                    <span className="count-value">{failCount}</span>
                  </div>
                </div>
              </div>

              <div className="results-grid">
                {results.map((result, index) => (
                  <div key={index} className={`result-card ${result.evalScore ? 'success' : 'failure'}`}>
                    <div className="result-header">
                      <h3>{result.patientName}</h3>
                      <span className={`eval-badge ${result.evalScore ? 'pass' : 'fail'}`}>
                        {result.evalScore ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                    
                    <div className="result-condition">
                      <span className="label">Original Diagnosis:</span>
                      <span className="value">{result.originalCondition}</span>
                    </div>

                    <div className="differentials">
                      <h4>Differential Diagnoses</h4>
                      {result.parsedDifferentials.length > 0 ? (
                        <ul className="differential-list">
                          {result.parsedDifferentials.map((diff, i) => (
                            <li key={i} className={`differential-item ${diff.conclusion}`}>
                              <span className="condition">{diff.condition}</span>
                              <span className="conclusion">{diff.conclusion.replace('-', ' ')}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-differentials">No differentials parsed</p>
                      )}
                    </div>

                    <details className="raw-output">
                      <summary>View Raw Output</summary>
                      <pre>{result.rawOutput}</pre>
                    </details>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {!isEvaluating && results.length === 0 && (
            <div className="empty-state">
              <p>No evaluation results yet. Configure a model and run an evaluation to see results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Evals;