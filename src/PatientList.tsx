
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
  onPatientClick?: (patient: Patient) => void;
}

function PatientList({ providerId, onRefetchReady, onPatientClick }: PatientListProps) {
  const { loading, error, data, refetch } = useQuery(GET_PATIENTS);
  const [bulkArchiveClients] = useMutation(BULK_ARCHIVE_CLIENTS);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [conditionFilter, setConditionFilter] = useState<string>('');

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

  // Helper function to extract condition from patient metadata
  const extractCondition = (patient: any): string => {
    if (patient.metadata) {
      try {
        const metadata = JSON.parse(patient.metadata);
        return metadata.condition || 'Not Available';
      } catch (error) {
        console.warn('Failed to parse patient metadata:', error);
      }
    }
    return 'Not Available';
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

  const allPatients: Patient[] = data?.users || [];

  // Get unique conditions for filter dropdown
  const uniqueConditions = Array.from(new Set(
    allPatients
      .map(patient => extractCondition(patient))
      .filter(condition => condition !== 'Not Available')
  )).sort();

  // Filter patients based on condition filter
  const filteredPatients = conditionFilter === '' 
    ? allPatients 
    : allPatients.filter(patient => extractCondition(patient) === conditionFilter);

  if (allPatients.length === 0) {
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
          <h2>
            Active Patients ({filteredPatients.length}
            {conditionFilter && ` filtered by ${conditionFilter}`}
            {conditionFilter && allPatients.length !== filteredPatients.length && ` of ${allPatients.length} total`})
          </h2>
          
          {/* Condition Filter */}
          {uniqueConditions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <label htmlFor="condition-filter" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                Filter by Condition:
              </label>
              <select
                id="condition-filter"
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '5px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              >
                <option value="">All Conditions</option>
                {uniqueConditions.map(condition => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </select>
              {conditionFilter && (
                <button
                  onClick={() => setConditionFilter('')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    border: '1px solid #ccc',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filter
                </button>
              )}
            </div>
          )}
          
          {allPatients.length > 0 && (
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
              <strong>This will archive ALL {allPatients.length} active patients!</strong>
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

      {/* Show message when no patients match filter */}
      {filteredPatients.length === 0 && allPatients.length > 0 && (
        <div className="patient-list__empty">
          <h3>No patients found for "{conditionFilter}"</h3>
          <p>Try selecting a different condition or clearing the filter.</p>
          <button
            onClick={() => setConditionFilter('')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Clear Filter
          </button>
        </div>
      )}
      
      {filteredPatients.length > 0 && (
        <div className="patient-list__table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Condition</th>
              <th>Race/Ethnicity</th>
              <th>Secondary Race/Ethnicity</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Date of Birth</th>
              <th>Patient Since</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => {
              const raceEthnicityData = extractRaceEthnicity(patient);
              const condition = extractCondition(patient);
              return (
                <tr 
                  key={patient.id} 
                  className="patient-row"
                  onClick={() => onPatientClick && onPatientClick(patient)}
                  style={{
                    cursor: onPatientClick ? 'pointer' : 'default',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (onPatientClick) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (onPatientClick) {
                      e.currentTarget.style.backgroundColor = '';
                    }
                  }}
                >
                  <td className="patient-name">
                    <strong style={{ 
                      color: onPatientClick ? '#007bff' : 'inherit',
                      textDecoration: onPatientClick ? 'underline' : 'none'
                    }}>
                      {patient.full_name || 'N/A'}
                    </strong>
                    {onPatientClick && (
                      <span style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        marginLeft: '8px',
                        fontWeight: 'normal'
                      }}>
                        (Click to view EHR)
                      </span>
                    )}
                  </td>
                  <td>{patient.age || 'N/A'}</td>
                  <td>{patient.gender || 'N/A'}</td>
                  <td>
                    <span style={{ 
                      backgroundColor: condition !== 'Not Available' ? '#e7f3ff' : '#f8f9fa',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: condition !== 'Not Available' ? 'bold' : 'normal',
                      color: condition !== 'Not Available' ? '#0066cc' : '#666'
                    }}>
                      {condition}
                    </span>
                  </td>
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
      )}
    </div>
  );
}

export default PatientList;