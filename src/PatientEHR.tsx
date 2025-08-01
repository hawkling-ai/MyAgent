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
}

interface PatientEHRProps {
  patient: Patient;
  onBack: () => void;
}

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

function PatientEHR({ patient, onBack }: PatientEHRProps) {
  // Helper function to encrypt patient name for privacy
  const encryptPatientName = (name: string): string => {
    if (!name) return 'N/A';
    
    // Simple encryption: Base64 encoding + character substitution for display
    const base64 = btoa(name);
    // Add some visual obfuscation while keeping it readable for demo purposes
    const encrypted = base64
      .replace(/[A-Z]/g, (char) => String.fromCharCode(((char.charCodeAt(0) - 65 + 7) % 26) + 65))
      .replace(/[a-z]/g, (char) => String.fromCharCode(((char.charCodeAt(0) - 97 + 7) % 26) + 97))
      .substring(0, 12) + '***';
    
    return `🔒 ${encrypted}`;
  };

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

  // Initialize SOAP note with pre-filled subjective and objective data
  const [soapNote, setSoapNote] = useState<SOAPNote>({
    subjective: "Patient reports feeling well overall. No acute complaints at this time. Denies fever, chills, or recent illness. Sleep patterns are normal, averaging 7-8 hours per night. Appetite is good with no significant weight changes. Reports good energy levels and no fatigue.",
    objective: `Vital Signs: BP 120/80, HR 72 bpm, RR 16, Temp 98.6°F, O2 Sat 98% on room air

Physical Examination:
- General: Alert, oriented, well-appearing, in no acute distress
- HEENT: Normocephalic, atraumatic. PERRL, EOMI. TMs clear bilaterally
- Neck: Supple, no lymphadenopathy, no thyromegaly
- Cardiovascular: Regular rate and rhythm, no murmurs, rubs, or gallops
- Pulmonary: Clear to auscultation bilaterally, no wheezes, rales, or rhonchi
- Abdomen: Soft, non-tender, non-distended, normal bowel sounds
- Extremities: No edema, no cyanosis, pulses intact`,
    assessment: "",
    plan: ""
  });

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
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderBottom: '2px solid #dee2e6',
        marginBottom: '20px'
      }}>
        <button
          onClick={onBack}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Patient List
        </button>
        <h1 style={{ margin: 0, color: '#2c3e50' }}>
          Electronic Health Record
        </h1>
        <h2 style={{ margin: '5px 0 0 0', color: '#495057', fontWeight: 'normal' }}>
          {encryptPatientName(patient.full_name)}
        </h2>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d', fontStyle: 'italic' }}>
          Patient identity encrypted for privacy
        </p>
      </div>

      <div className="patient-ehr__content" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {/* Demographics Section */}
        <div className="demographics-section" style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '25px',
          marginBottom: '25px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            color: '#2c3e50',
            borderBottom: '2px solid #3498db',
            paddingBottom: '10px',
            marginBottom: '20px'
          }}>
            Patient Demographics
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            <div className="demo-group">
              <h4 style={{ color: '#495057', marginBottom: '15px' }}>Basic Information</h4>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Full Name:</strong> {encryptPatientName(patient.full_name)}
              </div>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Age:</strong> {patient.age || 'N/A'}
              </div>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Gender:</strong> {patient.gender || 'N/A'}
              </div>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Date of Birth:</strong> {patient.dob ? formatDate(patient.dob) : 'N/A'}
              </div>
            </div>

            <div className="demo-group">
              <h4 style={{ color: '#495057', marginBottom: '15px' }}>Contact Information</h4>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Phone:</strong> {patient.phone_number || 'N/A'}
              </div>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Patient Since:</strong> {patient.created_at ? formatDate(patient.created_at) : 'N/A'}
              </div>
            </div>

            <div className="demo-group">
              <h4 style={{ color: '#495057', marginBottom: '15px' }}>Race & Ethnicity</h4>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Primary Race/Ethnicity:</strong> {raceEthnicityData.race_ethnicity}
              </div>
              <div className="demo-field" style={{ marginBottom: '10px' }}>
                <strong>Secondary Race/Ethnicity:</strong> {raceEthnicityData.secondary_race_ethnicity}
              </div>
            </div>
          </div>
        </div>

        {/* SOAP Note Section */}
        <div className="soap-section" style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '25px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            color: '#2c3e50',
            borderBottom: '2px solid #e74c3c',
            paddingBottom: '10px',
            marginBottom: '20px'
          }}>
            SOAP Note
          </h3>

          {/* Subjective */}
          <div className="soap-field" style={{ marginBottom: '25px' }}>
            <h4 style={{ 
              color: '#2c3e50', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                backgroundColor: '#3498db',
                color: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>S</span>
              Subjective
            </h4>
            <textarea
              value={soapNote.subjective}
              onChange={(e) => handleSOAPChange('subjective', e.target.value)}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                border: '1px solid #ced4da',
                borderRadius: '5px',
                fontSize: '14px',
                lineHeight: '1.5',
                resize: 'vertical'
              }}
              placeholder="Enter subjective information..."
            />
          </div>

          {/* Objective */}
          <div className="soap-field" style={{ marginBottom: '25px' }}>
            <h4 style={{ 
              color: '#2c3e50', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                backgroundColor: '#2ecc71',
                color: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>O</span>
              Objective
            </h4>
            <textarea
              value={soapNote.objective}
              onChange={(e) => handleSOAPChange('objective', e.target.value)}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '12px',
                border: '1px solid #ced4da',
                borderRadius: '5px',
                fontSize: '14px',
                lineHeight: '1.5',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
              placeholder="Enter objective findings..."
            />
          </div>

          {/* Assessment */}
          <div className="soap-field" style={{ marginBottom: '25px' }}>
            <h4 style={{ 
              color: '#95a5a6', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                backgroundColor: '#95a5a6',
                color: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>A</span>
              Assessment
              <span style={{ fontSize: '12px', fontStyle: 'italic' }}>(To be completed)</span>
            </h4>
            <textarea
              value={soapNote.assessment}
              onChange={(e) => handleSOAPChange('assessment', e.target.value)}
              disabled
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #ced4da',
                borderRadius: '5px',
                fontSize: '14px',
                lineHeight: '1.5',
                backgroundColor: '#f8f9fa',
                color: '#6c757d',
                cursor: 'not-allowed',
                resize: 'vertical'
              }}
              placeholder="Assessment to be completed by provider..."
            />
          </div>

          {/* Plan */}
          <div className="soap-field">
            <h4 style={{ 
              color: '#95a5a6', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                backgroundColor: '#95a5a6',
                color: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>P</span>
              Plan
              <span style={{ fontSize: '12px', fontStyle: 'italic' }}>(To be completed)</span>
            </h4>
            <textarea
              value={soapNote.plan}
              onChange={(e) => handleSOAPChange('plan', e.target.value)}
              disabled
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #ced4da',
                borderRadius: '5px',
                fontSize: '14px',
                lineHeight: '1.5',
                backgroundColor: '#f8f9fa',
                color: '#6c757d',
                cursor: 'not-allowed',
                resize: 'vertical'
              }}
              placeholder="Treatment plan to be completed by provider..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientEHR;