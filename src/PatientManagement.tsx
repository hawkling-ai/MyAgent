import React from 'react';
import PatientList from './PatientList';
import PatientGenerator from './PatientGenerator';

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
  race_ethnicity: string;
  secondary_race_ethnicity: string;
  email: string;
  phone_number: string;
  dob: string;
  created_at: string;
  condition?: string;
}

interface PatientManagementProps {
  providerId: string;
}

function PatientManagement({ providerId }: PatientManagementProps) {
  const refreshPatientListRef = React.useRef<(() => void) | undefined>(undefined);

  const handlePatientsGenerated = (patients: Patient[]) => {
    console.log(`Generated ${patients.length} patients and saved to Healthie`);
    
    // Refresh the patient list to show newly created patients
    if (refreshPatientListRef.current) {
      refreshPatientListRef.current();
    }
  };

  const handleRefetchReady = React.useCallback((refetchFn: () => void) => {
    refreshPatientListRef.current = refetchFn;
  }, []);

  return (
    <div className="patient-management">
      <div className="patient-management__header">
        <h1>Clinical Data Analytics Platform</h1>
        <p>Advanced medical data visualization and analysis for AI research</p>
        
        <div className="patient-management__controls">
          <PatientGenerator 
            onPatientsGenerated={handlePatientsGenerated} 
            providerId={providerId}
            onRefreshPatientList={refreshPatientListRef.current}
          />
        </div>
      </div>
      
      <PatientList 
        providerId={providerId}
        onRefetchReady={handleRefetchReady}
      />
    </div>
  );
}

export default PatientManagement;