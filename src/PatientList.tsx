import React, { useState } from 'react';
import {
  useQuery,
  useMutation,
  gql
} from "@apollo/client";

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
      email
      phone_number
      dob
      created_at
    }
  }
`;

const BULK_ARCHIVE_CLIENTS = gql`
  mutation BulkArchiveClients($input: bulkUpdateClientsInput!) {
    bulkUpdateClients(input: $input) {
      messages {
        field
        message
      }
    }
  }
`;

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

interface PatientListProps {
  providerId: string;
  onRefetchReady?: (refetch: () => void) => void;
}

function PatientList({ providerId, onRefetchReady }: PatientListProps) {
  const { loading, error, data, refetch } = useQuery(GET_PATIENTS);
  const [bulkArchiveClients] = useMutation(BULK_ARCHIVE_CLIENTS);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Helper function to extract race/ethnicity from patient data
  const extractRaceEthnicity = (patient: any) => {
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

  // Function to archive all patients
  const handleDeleteAllPatients = async () => {
    if (!data?.users || data.users.length === 0) {
      alert('No patients to delete');
      return;
    }

    setIsDeleting(true);
    
    try {
      const patientIds = data.users.map((patient: any) => patient.id);
      
      const response = await bulkArchiveClients({
        variables: {
          input: {
            ids: patientIds,
            active_status: false
          }
        }
      });

      if (response.data?.bulkUpdateClients?.messages?.length > 0) {
        console.error('Errors archiving patients:', response.data.bulkUpdateClients.messages);
        alert('Some patients could not be archived. Check console for details.');
      } else {
        alert(`Successfully archived ${patientIds.length} patients!`);
      }
      
      // Refresh the patient list
      refetch();
    } catch (error) {
      console.error('Error archiving patients:', error);
      alert('Failed to archive patients. Check console for details.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

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
        <div className="patient-list__header-content">
          <h2>Active Patients ({patients.length})</h2>
          {patients.length > 0 && (
            <button
              className="delete-all-patients-btn"
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={isDeleting}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: isDeleting ? 0.6 : 1
              }}
            >
              {isDeleting ? 'Archiving...' : '🗑️ Archive All Patients'}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div 
          className="confirmation-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="confirmation-dialog"
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '10px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h3 style={{ color: '#dc3545', marginBottom: '20px' }}>
              ⚠️ Archive All Patients
            </h3>
            <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
              <strong>This will archive ALL {patients.length} active patients!</strong>
            </p>
            <p style={{ marginBottom: '30px', lineHeight: '1.6', color: '#666' }}>
              Archived patients will no longer appear in the active patient list but can be recovered by setting their status back to active. This action cannot be undone easily.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ccc',
                  backgroundColor: 'white',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllPatients}
                disabled={isDeleting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                {isDeleting ? 'Archiving...' : 'Yes, Archive All Patients'}
              </button>
            </div>
          </div>
        </div>
      )}
      
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
            {patients.map((patient) => {
              const raceEthnicityData = extractRaceEthnicity(patient);
              return (
                <tr key={patient.id} className="patient-row">
                  <td className="patient-name">
                    <strong>{patient.full_name || 'N/A'}</strong>
                  </td>
                  <td>{patient.age || 'N/A'}</td>
                  <td>{patient.gender || 'N/A'}</td>
                  <td>{raceEthnicityData.race_ethnicity}</td>
                  <td>{raceEthnicityData.secondary_race_ethnicity}</td>
                  <td>{patient.email || 'N/A'}</td>
                  <td>{patient.phone_number || 'N/A'}</td>
                  <td>{patient.dob || 'N/A'}</td>
                  <td>{patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PatientList;