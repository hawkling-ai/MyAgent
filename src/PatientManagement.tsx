import React from 'react';
import PatientList from './PatientList';
import PatientGenerator from './PatientGenerator';

interface Patient {
  id: string;
  full_name: string;
  age: string;
  gender: string;
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
        <h1>Patient Management System</h1>
        <p>Manage and view your patients</p>
        
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