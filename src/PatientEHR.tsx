import React, { useState } from 'react';

interface Patient {
  id: string;
  full_name: string;
  age: string;
  gender: string;
  primary_race?: string;
  secondary_race?: string;
  primary_ethnicity?: string;
  secondary_ethnicity?: string;
  metadata?: string;
  email: string;
  phone_number: string;
  dob: string;
  created_at: string;
  soapDocument?: SOAPNote; // Added for pre-filled SOAP document
}

interface PatientEHRProps {
  patient: Patient;
  onBack: () => void;
}

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

function PatientEHR({ patient, onBack }: PatientEHRProps) {

  // Helper function to extract race/ethnicity from patient data
  const extractRaceEthnicity = (patient: Patient) => {
    let primaryRace = patient.primary_race;
    let secondaryRace = patient.secondary_race;

    // If native fields are empty, try to extract from metadata
    if (!primaryRace && patient.metadata) {
      try {
        const metadata = JSON.parse(patient.metadata);
        primaryRace = metadata.primary_race || metadata.race_ethnicity;
        secondaryRace = metadata.secondary_race || metadata.secondary_race_ethnicity;
      } catch (error) {
        console.warn('Failed to parse patient metadata:', error);
      }
    }

    return {
      race_ethnicity: primaryRace || 'Not Available',
      secondary_race_ethnicity: secondaryRace || 'Not Available'
    };
  };

  const raceEthnicityData = extractRaceEthnicity(patient);

  // Check if SOAP document is provided
  const initialSoapNote = patient.soapDocument || {
    subjective: "",
    objective: "",
    assessment: "",
    plan: ""
  };

  // Initialize SOAP note with provided document or default values
  const [soapNote, setSoapNote] = useState<SOAPNote>(initialSoapNote);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleSOAPChange = (field: keyof SOAPNote, value: string) => {
    setSoapNote(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="patient-ehr">
      {/* Header with back button */}
      <div className="patient-ehr__header" style={{
        backgroundColor: '#000',
        padding: '20px',
        borderBottom: '2px solid #000',
        marginBottom: '20px'
      }}>
        <button
          onClick={onBack}
          style={{
            backgroundColor: '#fff',
            color: '#000',
            border: '2px solid #000',
            padding: '10px 15px',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#000';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.color = '#000';
          }}
        >
          ← Back to Patient List
        </button>
        <h1 style={{ margin: 0, color: '#fff' }}>
          Electronic Clinical Record
        </h1>
        <h2 style={{ margin: '5px 0 0 0', color: '#fff', fontWeight: 'normal' }}>
          {patient.full_name}
        </h2>
      </div>

      <div className="patient-ehr__content" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {/* Demographics Section */}
        <div className="demographics-section" style={{
          backgroundColor: 'white',
          border: '2px solid #000',
          padding: '25px',
          marginBottom: '25px'
        }}>
          <h3 style={{
            color: '#000',
            borderBottom: '2px solid #000',
            paddingBottom: '10px',
            marginBottom: '20px',
            fontFamily: 'Cormorant Garamond, serif'
          }}>
            Subject Demographics
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            <div className="demo-group">
              <h4 style={{ color: '#000', marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Biometric Data</h4>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Subject Identifier:</strong> {patient.full_name}
              </div>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Chronological Age:</strong> {patient.age || 'N/A'}
              </div>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Biological Sex:</strong> {patient.gender || 'N/A'}
              </div>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Date of Birth:</strong> {patient.dob ? formatDate(patient.dob) : 'N/A'}
              </div>
            </div>

            <div className="demo-group">
              <h4 style={{ color: '#000', marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Contact Parameters</h4>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Primary Contact:</strong> {patient.phone_number || 'N/A'}
              </div>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Enrollment Date:</strong> {patient.created_at ? formatDate(patient.created_at) : 'N/A'}
              </div>
            </div>

            <div className="demo-group">
              <h4 style={{ color: '#000', marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Demographic Classification</h4>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Primary Demographics:</strong> {raceEthnicityData.race_ethnicity}
              </div>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Secondary Demographics:</strong> {raceEthnicityData.secondary_race_ethnicity}
              </div>
            </div>
          </div>
        </div>

        {/* SOAP Note Section */}
        <div className="soap-section" style={{
          backgroundColor: 'white',
          border: '2px solid #000',
          padding: '25px'
        }}>
          <h3 style={{
            color: '#000',
            borderBottom: '2px solid #000',
            paddingBottom: '10px',
            marginBottom: '20px',
            fontFamily: 'Cormorant Garamond, serif'
          }}>
            SOAP Clinical Assessment
          </h3>

          {/* Subjective */}
          <div className="soap-field" style={{ marginBottom: '25px' }}>
            <h4 style={{ 
              color: '#000', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                backgroundColor: '#000',
                color: 'white',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>S</span>
              Subjective Findings
            </h4>
            <textarea
              value={soapNote.subjective}
              onChange={(e) => handleSOAPChange('subjective', e.target.value)}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                border: '1px solid #000',
                fontSize: '14px',
                lineHeight: '1.5',
                resize: 'vertical',
                fontFamily: 'Inter, sans-serif'
              }}
              placeholder="Enter subjective clinical observations..."
            />
          </div>

          {/* Objective */}
          <div className="soap-field" style={{ marginBottom: '25px' }}>
            <h4 style={{ 
              color: '#000', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                backgroundColor: '#000',
                color: 'white',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>O</span>
              Objective Measurements
            </h4>
            <textarea
              value={soapNote.objective}
              onChange={(e) => handleSOAPChange('objective', e.target.value)}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '12px',
                border: '1px solid #000',
                fontSize: '14px',
                lineHeight: '1.5',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
              placeholder="Enter objective clinical data..."
            />
          </div>

          {/* Assessment */}
          <div className="soap-field" style={{ marginBottom: '25px' }}>
            <h4 style={{ 
              color: '#666', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                backgroundColor: '#666',
                color: 'white',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>A</span>
              Clinical Assessment
              <span style={{ fontSize: '12px', fontStyle: 'italic' }}>(Pending physician review)</span>
            </h4>
            <textarea
              value={soapNote.assessment}
              onChange={(e) => handleSOAPChange('assessment', e.target.value)}
              disabled
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #ccc',
                fontSize: '14px',
                lineHeight: '1.5',
                backgroundColor: '#f8f9fa',
                color: '#666',
                cursor: 'not-allowed',
                resize: 'vertical'
              }}
              placeholder="Clinical assessment pending authorized provider input..."
            />
          </div>

          {/* Plan */}
          <div className="soap-field">
            <h4 style={{ 
              color: '#666', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                backgroundColor: '#666',
                color: 'white',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>P</span>
              Treatment Protocol
              <span style={{ fontSize: '12px', fontStyle: 'italic' }}>(Pending physician review)</span>
            </h4>
            <textarea
              value={soapNote.plan}
              onChange={(e) => handleSOAPChange('plan', e.target.value)}
              disabled
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #ccc',
                fontSize: '14px',
                lineHeight: '1.5',
                backgroundColor: '#f8f9fa',
                color: '#666',
                cursor: 'not-allowed',
                resize: 'vertical'
              }}
              placeholder="Treatment protocol pending authorized provider input..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientEHR;