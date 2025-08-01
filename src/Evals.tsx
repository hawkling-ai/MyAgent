import React, { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
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

// Zod schema for structured output
const DifferentialSchema = z.object({
  condition: z.string().describe('The medical condition being evaluated'),
  conclusion: z.enum(['positive', 'negative', 'needs follow-up']).describe('Assessment of the condition: positive/likely, negative/unlikely, or needs follow-up')
});

const DifferentialDiagnosisSchema = z.object({
  differentials: z.array(DifferentialSchema).describe('List of differential diagnoses with assessments'),
  reasoning: z.string().describe('Brief explanation of the diagnostic reasoning')
});

type DifferentialDiagnosis = z.infer<typeof DifferentialDiagnosisSchema>;

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
  provider: 'openai' | 'anthropic' | 'baseten';
  prompt: string;
}

interface BasetenModel {
  id: string;
  name: string;
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

const DEFAULT_PROMPT = `You are a medical diagnostic assistant. Given the patient demographics below, provide a structured differential diagnosis list.

For each condition in your differential, assess whether it is:
- Positive: High probability based on demographics and risk factors
- Negative: Low probability or can be ruled out
- Needs follow-up: Requires additional testing or information

Consider demographic risk factors, prevalence rates, and epidemiological data when making your assessment.

You MUST respond with a JSON object that exactly matches this schema:

{
  "differentials": [
    {
      "condition": "string - The medical condition being evaluated",
      "conclusion": "string - Must be exactly one of: 'positive', 'negative', or 'needs follow-up'"
    }
  ],
  "reasoning": "string - Brief explanation of your diagnostic reasoning based on the patient's demographics"
}

Example response:
{
  "differentials": [
    {"condition": "Type 2 Diabetes", "conclusion": "positive"},
    {"condition": "Hypertension", "conclusion": "positive"},
    {"condition": "Sickle Cell Disease", "conclusion": "needs follow-up"},
    {"condition": "Cystic Fibrosis", "conclusion": "negative"}
  ],
  "reasoning": "Based on the patient's age, ethnicity, and gender, metabolic conditions are more likely while genetic conditions specific to other populations are less probable."
}

Be comprehensive but focused on conditions relevant to the patient's demographics.`;

// Function to parse Baseten models from environment variables
const parseBasetenModels = (): BasetenModel[] => {
  const models: BasetenModel[] = [];
  let index = 1;
  
  while (true) {
    const modelId = process.env[`REACT_APP_BASETEN_MODEL_ID_${index}`];
    if (!modelId) break;
    
    // Get custom name or extract from model ID (everything after last '/')
    const customName = process.env[`REACT_APP_BASETEN_MODEL_NAME_${index}`];
    const defaultName = modelId.includes('/') ? modelId.split('/').pop() : modelId;
    const modelName = customName || defaultName || `Model ${index}`;
    
    models.push({
      id: modelId,
      name: modelName
    });
    
    index++;
  }
  
  return models;
};

const Evals: React.FC<EvalsProps> = ({ providerId }) => {
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic' | 'baseten'>('openai');
  const [modelConfigs, setModelConfigs] = useState<Record<string, ModelConfig>>({
    openai: { provider: 'openai', prompt: DEFAULT_PROMPT },
    anthropic: { provider: 'anthropic', prompt: DEFAULT_PROMPT },
    baseten: { provider: 'baseten', prompt: DEFAULT_PROMPT }
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [currentEvalProgress, setCurrentEvalProgress] = useState({ current: 0, total: 0 });
  
  // Baseten model management
  const [availableBasetenModels] = useState<BasetenModel[]>(() => {
    const models = parseBasetenModels();
    console.log('🔧 Parsed Baseten models:', models);
    return models;
  });
  const [selectedBasetenModel, setSelectedBasetenModel] = useState<string>(
    availableBasetenModels.length > 0 ? availableBasetenModels[0].id : ''
  );
  
  // Model Configuration section collapse state
  const [modelConfigCollapsed, setModelConfigCollapsed] = useState(false);

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

  // Handle model provider selection (no auto-collapse)
  const handleProviderSelection = (provider: 'openai' | 'anthropic' | 'baseten') => {
    setSelectedProvider(provider);
    // Don't auto-collapse - let user manually control with +/- button
  };

  // Toggle model configuration section collapse
  const toggleModelConfigSection = () => {
    setModelConfigCollapsed(!modelConfigCollapsed);
  };

  // No longer needed - using structured output

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
- Race: ${patientData.race}`;

    try {
      let structuredOutput: DifferentialDiagnosis;
      let rawOutput = '';
      
      if (modelProvider === 'openai') {
        const openAIKey = process.env.REACT_APP_OPENAI_API_KEY;
        if (!openAIKey) {
          throw new Error('OpenAI API key not configured. Please add REACT_APP_OPENAI_API_KEY to your .env file');
        }

        const model = new ChatOpenAI({
          modelName: 'gpt-4o',
          temperature: 0.7,
          apiKey: openAIKey,
        });

        const structuredModel = model.withStructuredOutput(DifferentialDiagnosisSchema);
        
        const result = await structuredModel.invoke([
          { role: 'system', content: 'You are a medical diagnostic assistant. Always respond with structured JSON output.' },
          { role: 'user', content: fullPrompt }
        ]);

        structuredOutput = result;
        rawOutput = JSON.stringify(result, null, 2);
        
      } else if (modelProvider === 'anthropic') {
        const claudeKey = process.env.REACT_APP_CLAUDE_API_KEY;
        if (!claudeKey) {
          throw new Error('Claude API key not configured. Please add REACT_APP_CLAUDE_API_KEY to your .env file');
        }

        const model = new ChatAnthropic({
          modelName: 'claude-sonnet-4-20250514',
          temperature: 0.7,
          apiKey: claudeKey,
        });

        const structuredModel = model.withStructuredOutput(DifferentialDiagnosisSchema);
        
        const result = await structuredModel.invoke([
          { role: 'user', content: fullPrompt }
        ]);

        structuredOutput = result;
        rawOutput = JSON.stringify(result, null, 2);
        
      } else if (modelProvider === 'baseten') {
        const basetenKey = process.env.REACT_APP_BASETEN_API_KEY;
        
        if (!basetenKey) {
          throw new Error('Baseten API key not configured. Please add REACT_APP_BASETEN_API_KEY to your .env file');
        }
        
        if (!selectedBasetenModel) {
          throw new Error('No Baseten model selected. Please configure REACT_APP_BASETEN_MODEL_ID_1 in your .env file');
        }

        const response = await fetch(`https://model-${selectedBasetenModel}.api.baseten.co/v1/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Api-Key ${basetenKey}`
          },
          body: JSON.stringify({
            prompt: fullPrompt + '\n\nIMPORTANT: Respond ONLY with a valid JSON object, no other text. The JSON must match this exact schema:\n{\n  "differentials": [\n    {"condition": "string", "conclusion": "positive|negative|needs follow-up"}\n  ],\n  "reasoning": "string"\n}',
            max_length: 500,
            temperature: 0.7,
            top_p: 0.9
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Baseten API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        rawOutput = data.model_output || data.output || data.text || JSON.stringify(data);
        
        // Try to parse Baseten response as structured output
        try {
          const parsed = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
          structuredOutput = DifferentialDiagnosisSchema.parse(parsed);
        } catch (parseError) {
          // Fallback: create a basic structure
          structuredOutput = {
            differentials: [],
            reasoning: 'Failed to parse structured response from Baseten model'
          };
        }
      } else {
        throw new Error(`Unsupported model provider: ${modelProvider}`);
      }

      // Extract differentials from structured output
      const parsedDifferentials = structuredOutput.differentials;
      
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
          <div className={`model-config-section ${modelConfigCollapsed ? 'collapsed' : 'expanded'}`}>
            <div className="model-config-header" onClick={toggleModelConfigSection}>
              <h2>Model Configuration</h2>
              <div className="collapse-indicator">
                {modelConfigCollapsed ? '+' : '−'}
              </div>
            </div>
            
            {!modelConfigCollapsed && (
              <div className="model-tabs">
            {/* OpenAI Tab */}
            <div className={`model-tab ${selectedProvider === 'openai' ? 'active' : ''}`}>
              <button 
                className="model-tab-header"
                onClick={() => handleProviderSelection('openai')}
              >
                <span className="provider-name">OpenAI</span>
                <span className="model-name">GPT-4o</span>
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
                onClick={() => handleProviderSelection('anthropic')}
              >
                <span className="provider-name">Anthropic</span>
                <span className="model-name">Claude 4 Sonnet</span>
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

            {/* Baseten Tab */}
            <div className={`model-tab ${selectedProvider === 'baseten' ? 'active' : ''}`}>
              <button 
                className="model-tab-header"
                onClick={() => handleProviderSelection('baseten')}
              >
                <span className="provider-name">Baseten</span>
                <span className="model-name">
                  {availableBasetenModels.length > 0 
                    ? availableBasetenModels.find(m => m.id === selectedBasetenModel)?.name || 'Select Model'
                    : 'No Models Configured'
                  }
                </span>
              </button>
              
              {selectedProvider === 'baseten' && (
                <div className="model-tab-content">
                  {availableBasetenModels.length > 0 ? (
                    <>
                      <div className="form-group">
                        <label>Select Model</label>
                        <select
                          value={selectedBasetenModel}
                          onChange={(e) => setSelectedBasetenModel(e.target.value)}
                          className="form-control"
                        >
                          {availableBasetenModels.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                        <div className="model-info">
                          <small className="text-muted">
                            Model ID: {selectedBasetenModel}
                          </small>
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label>Evaluation Prompt</label>
                        <textarea
                          value={modelConfigs.baseten.prompt}
                          onChange={(e) => updateModelConfig('baseten', e.target.value)}
                          placeholder="Enter your evaluation prompt for medical diagnosis..."
                          className="form-control"
                          rows={8}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="baseten-setup">
                      <h4>No Baseten Models Configured</h4>
                      <p>To use Baseten models, add the following to your .env file:</p>
                      <pre className="config-example">
{`REACT_APP_BASETEN_API_KEY=your_api_key_here
REACT_APP_BASETEN_MODEL_ID_1=meta-llama/Llama-4-Scout-17B-16E-Instruct
REACT_APP_BASETEN_MODEL_NAME_1=Llama-4-Scout-17B-16E-Instruct`}
                      </pre>
                      <p>Add additional models with incrementing numbers (_2, _3, etc.)</p>
                    </div>
                  )}
                </div>
              )}
            </div>
              </div>
            )}
          </div>

          {/* Selected Model Summary (shown when collapsed) */}
          {modelConfigCollapsed && (
            <div className="selected-model-summary">
              <div className="summary-item">
                <span className="label">Selected Model:</span>
                <span className="value">
                  {selectedProvider === 'openai' && 'OpenAI GPT-4o'}
                  {selectedProvider === 'anthropic' && 'Anthropic Claude 4 Sonnet'}
                  {selectedProvider === 'baseten' && (
                    availableBasetenModels.find(m => m.id === selectedBasetenModel)?.name || 'Baseten Model'
                  )}
                </span>
              </div>
            </div>
          )}

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
                    
                    {(() => {
                      try {
                        const parsed = JSON.parse(result.rawOutput);
                        if (parsed.reasoning) {
                          return (
                            <div className="reasoning-section">
                              <h4>Diagnostic Reasoning</h4>
                              <p>{parsed.reasoning}</p>
                            </div>
                          );
                        }
                      } catch (e) {
                        // Not JSON or no reasoning field
                      }
                      return null;
                    })()}
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