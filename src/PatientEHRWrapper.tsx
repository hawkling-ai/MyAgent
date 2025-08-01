import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { gql, useQuery } from "@apollo/client";
import PatientEHR from "./PatientEHR";
import type { SOAPNote } from "./PatientEHR";

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
  soapDocument?: SOAPNote;
}

interface PatientEHRWrapperProps {
  providerId: string;
}

function PatientEHRWrapper({ providerId }: PatientEHRWrapperProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_PATIENTS);
  const [patient, setPatient] = useState<Patient | null>(null);

  // Helper function to extract condition from patient metadata
  const extractCondition = (patient: any): string => {
    if (patient.metadata) {
      try {
        const metadata = JSON.parse(patient.metadata);
        return metadata.condition || "Not Available";
      } catch (error) {
        console.warn("Failed to parse patient metadata:", error);
      }
    }
    return "Not Available";
  };

  // Helper function to extract race/ethnicity from patient data
  const extractRaceEthnicity = (patient: any) => {
    let primaryRace = patient.primary_race;
    let secondaryRace = patient.secondary_race;

    // If native fields are empty, try to extract from metadata
    if (!primaryRace && patient.metadata) {
      try {
        const metadata = JSON.parse(patient.metadata);
        primaryRace = metadata.primary_race || metadata.race_ethnicity;
        secondaryRace =
          metadata.secondary_race || metadata.secondary_race_ethnicity;
      } catch (error) {
        console.warn("Failed to parse patient metadata:", error);
      }
    }

    return {
      race_ethnicity: primaryRace || "Not Available",
      secondary_race_ethnicity: secondaryRace || "Not Available",
    };
  };

  // Helper function to extract SOAP data from patient metadata
  const extractSOAPDocument = (patient: any): SOAPNote | undefined => {
    if (patient.metadata) {
      try {
        const metadata = JSON.parse(patient.metadata);
        if (metadata.subjective || metadata.objective) {
          return {
            subjective: metadata.subjective || "",
            objective: metadata.objective || "",
            assessment: "", // Not stored in metadata currently
            plan: "" // Not stored in metadata currently
          };
        }
      } catch (error) {
        console.warn("Failed to parse patient metadata for SOAP:", error);
      }
    }
    return undefined;
  };


  useEffect(() => {
    if (data && id) {
      // Find the patient by ID
      const foundPatient = data.users.find((user: any) => user.id === id);

      if (foundPatient) {
        const raceEthnicityData = extractRaceEthnicity(foundPatient);
        const condition = extractCondition(foundPatient);
        const soapDocument = extractSOAPDocument(foundPatient);

        const patientData: Patient = {
          ...foundPatient,
          ...raceEthnicityData,
          condition,
          soapDocument,
        };

        setPatient(patientData);
      }
    }
  }, [data, id]);

  const handleBack = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="patient-list__loading">
        <h3>Loading patient data...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="patient-list__error">
        <h3>Error loading patient data</h3>
        <p>{error.message}</p>
        <button onClick={handleBack} className="btn-primary">
          Back to Patient List
        </button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="patient-list__error">
        <h3>Patient not found</h3>
        <p>The patient with ID {id} could not be found.</p>
        <button onClick={handleBack} className="btn-primary">
          Back to Patient List
        </button>
      </div>
    );
  }

  return <PatientEHR patient={patient} onBack={handleBack} />;
}

export default PatientEHRWrapper;
