import React from 'react';
import {
  useQuery,
  gql
} from "@apollo/client";

const GET_PATIENTS = gql`
  query GetPatients {
    users(active_status: "active", should_paginate: false) {
      id
      full_name
      age
      gender
      email
      phone_number
      dob
      created_at
    }
  }
`;

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

interface PatientListProps {
  providerId: string;
  onRefetchReady?: (refetch: () => void) => void;
}

function PatientList({ providerId, onRefetchReady }: PatientListProps) {
  const { loading, error, data, refetch } = useQuery(GET_PATIENTS);

  // Pass the refetch function to parent component - use useCallback to prevent infinite loops
  const stableRefetch = React.useCallback(() => {
    refetch();
  }, [refetch]);

  React.useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(stableRefetch);
    }
  }, [onRefetchReady, stableRefetch]);

  if (loading) {
    return (
      <div className="patient-list__loading">
        <h3>Loading patients...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="patient-list__error">
        <h3>Error loading patients</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  const patients: Patient[] = data?.users || [];

  if (patients.length === 0) {
    return (
      <div className="patient-list__empty">
        <h3>No patients found</h3>
        <p>This provider has no active patients. Generate some test patients to see them here.</p>
      </div>
    );
  }

  return (
    <div className="patient-list">
      <div className="patient-list__header">
        <h2>Active Patients ({patients.length})</h2>
      </div>
      
      <div className="patient-list__table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Race/Ethnicity</th>
              <th>Secondary Race/Ethnicity</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Date of Birth</th>
              <th>Patient Since</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id} className="patient-row">
                <td className="patient-name">
                  <strong>{patient.full_name || 'N/A'}</strong>
                </td>
                <td>{patient.age || 'N/A'}</td>
                <td>{patient.gender || 'N/A'}</td>
                <td>{patient.race_ethnicity || 'Not Available'}</td>
                <td>{patient.secondary_race_ethnicity || 'Not Available'}</td>
                <td>{patient.email || 'N/A'}</td>
                <td>{patient.phone_number || 'N/A'}</td>
                <td>{patient.dob || 'N/A'}</td>
                <td>{patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PatientList;