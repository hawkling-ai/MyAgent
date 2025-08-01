import React, { useState } from 'react';
import OpenAI from 'openai';
import { useMutation, gql } from '@apollo/client';

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

interface PatientGeneratorProps {
  onPatientsGenerated: (patients: Patient[]) => void;
  providerId?: string;
  onRefreshPatientList?: () => void;
}

interface DemographicDistribution {
  ageRanges: {
    range: string;
    percentage: number;
    minAge: number;
    maxAge: number;
  }[];
  genderDistribution: {
    gender: string;
    percentage: number;
  }[];
  raceEthnicityDistribution: {
    raceEthnicity: string;
    percentage: number;
  }[];
}

const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
  'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Joshua', 'Michelle',
  'Kenneth', 'Laura', 'Kevin', 'Sarah', 'Brian', 'Kimberly', 'George', 'Deborah',
  'Edward', 'Dorothy', 'Ronald', 'Lisa', 'Timothy', 'Nancy', 'Jason', 'Karen',
  'Jeffrey', 'Betty', 'Ryan', 'Helen', 'Jacob', 'Sandra', 'Gary', 'Donna'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
  'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell'
];


// GraphQL mutation to create a client in Healthie
const CREATE_CLIENT = gql`
  mutation CreateClient($input: createClientInput!) {
    createClient(input: $input) {
      user {
        id
        full_name
        email
        phone_number
        dob
        gender
        created_at
      }
      messages {
        field
        message
      }
    }
  }
`;

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set REACT_APP_OPENAI_API_KEY environment variable.');
  }
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Note: In production, API calls should go through your backend
  });
};

// Function to get demographic distribution from ChatGPT
const getDemographicDistribution = async (condition: string): Promise<DemographicDistribution> => {
  const client = getOpenAIClient();
  
  const prompt = `Please provide the demographic distribution for patients diagnosed with ${condition}. 
  
  Return the data in the following JSON format:
  {
    "ageRanges": [
      {"range": "18-30", "percentage": 15, "minAge": 18, "maxAge": 30},
      {"range": "31-45", "percentage": 25, "minAge": 31, "maxAge": 45},
      {"range": "46-65", "percentage": 40, "minAge": 46, "maxAge": 65},
      {"range": "66+", "percentage": 20, "minAge": 66, "maxAge": 90}
    ],
    "genderDistribution": [
      {"gender": "Male", "percentage": 50},
      {"gender": "Female", "percentage": 50}
    ],
    "raceEthnicityDistribution": [
      {"raceEthnicity": "White", "percentage": 60},
      {"raceEthnicity": "Hispanic or Latino", "percentage": 18},
      {"raceEthnicity": "Black or African American", "percentage": 12},
      {"raceEthnicity": "Asian", "percentage": 6},
      {"raceEthnicity": "American Indian or Alaska Native", "percentage": 2},
      {"raceEthnicity": "Native Hawaiian or Pacific Islander", "percentage": 1},
      {"raceEthnicity": "Middle Eastern or North African", "percentage": 1}
    ]
  }
  
  Use these exact race/ethnicity categories: American Indian or Alaska Native, Asian, Black or African American, Hispanic or Latino, Middle Eastern or North African, Native Hawaiian or Pacific Islander, White.
  
  Use actual medical and epidemiological data for ${condition}. Make sure percentages add up to 100% for each category.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a medical epidemiologist with access to demographic data about various medical conditions. Provide accurate demographic distributions based on real medical data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from ChatGPT');
    }

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    console.log(jsonMatch[0]);
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error getting demographic distribution:', error);
    // Fallback to default distributions
    return {
      ageRanges: [
        { range: "18-30", percentage: 25, minAge: 18, maxAge: 30 },
        { range: "31-45", percentage: 30, minAge: 31, maxAge: 45 },
        { range: "46-65", percentage: 30, minAge: 46, maxAge: 65 },
        { range: "66+", percentage: 15, minAge: 66, maxAge: 90 }
      ],
      genderDistribution: [
        { gender: "Male", percentage: 50 },
        { gender: "Female", percentage: 50 }
      ],
      raceEthnicityDistribution: [
        { raceEthnicity: "White", percentage: 61 },
        { raceEthnicity: "Hispanic or Latino", percentage: 18 },
        { raceEthnicity: "Black or African American", percentage: 12 },
        { raceEthnicity: "Asian", percentage: 6 },
        { raceEthnicity: "American Indian or Alaska Native", percentage: 1 },
        { raceEthnicity: "Native Hawaiian or Pacific Islander", percentage: 1 },
        { raceEthnicity: "Middle Eastern or North African", percentage: 1 }
      ]
    };
  }
};

// Helper function to select based on percentage distribution
const selectFromDistribution = <T extends { percentage: number }>(items: T[]): T => {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const item of items) {
    cumulative += item.percentage;
    if (random <= cumulative) {
      return item;
    }
  }
  
  return items[items.length - 1]; // Fallback to last item
};

function PatientGenerator({ onPatientsGenerated, providerId, onRefreshPatientList }: PatientGeneratorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [condition, setCondition] = useState('');
  const [numberOfPatients, setNumberOfPatients] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingDistribution, setIsLoadingDistribution] = useState(false);
  const [isSavingToHealthie, setIsSavingToHealthie] = useState(false);

  const [createClient] = useMutation(CREATE_CLIENT);

  // Function to save a patient to Healthie API
  const savePatientToHealthie = async (patient: Patient): Promise<string | null> => {
    try {
      const [firstName, ...lastNameParts] = patient.full_name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      // Create metadata object with race/ethnicity and condition info
      const metadata = JSON.stringify({
        primary_race: patient.race_ethnicity,
        secondary_race: patient.secondary_race_ethnicity,
        condition: patient.condition,
        generated_patient: true,
        generated_at: new Date().toISOString(),
        demographic_source: 'AI_generated'
      });

      const response = await createClient({
        variables: {
          input: {
            first_name: firstName,
            last_name: lastName,
            email: patient.email,
            phone_number: patient.phone_number,
            dob: patient.dob,
            gender: patient.gender,
            dietitian_id: providerId,
            metadata: metadata,
            timezone: 'America/New_York'
          }
        }
      });

      if (response.data?.createClient?.messages?.length > 0) {
        console.error('Healthie API errors:', response.data.createClient.messages);
        return null;
      }

      return response.data?.createClient?.user?.id || null;
    } catch (error) {
      console.error('Error saving patient to Healthie:', error);
      return null;
    }
  };

  const generateRandomPatient = (index: number, distribution: DemographicDistribution): Patient => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // Select age based on distribution
    const selectedAgeRange = selectFromDistribution(distribution.ageRanges);
    const age = Math.floor(Math.random() * (selectedAgeRange.maxAge - selectedAgeRange.minAge + 1)) + selectedAgeRange.minAge;
    
    // Select gender based on distribution
    const selectedGender = selectFromDistribution(distribution.genderDistribution);
    const gender = selectedGender.gender;
    
    // Select race/ethnicity based on distribution
    const selectedRaceEthnicity = selectFromDistribution(distribution.raceEthnicityDistribution);
    const raceEthnicity = selectedRaceEthnicity.raceEthnicity;
    
    // Secondary race/ethnicity (less common - only ~5% of people identify as multiracial)
    const secondaryRaceEthnicity = Math.random() > 0.95 ? selectFromDistribution(distribution.raceEthnicityDistribution).raceEthnicity : '';
    
    // Generate birth date based on age
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - age;
    const birthMonth = Math.floor(Math.random() * 12) + 1;
    const birthDay = Math.floor(Math.random() * 28) + 1;
    const dob = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
    
    // Generate realistic email and phone with UUID to prevent duplicates
    const uuid = crypto.randomUUID().slice(0, 8); // Use first 8 characters of UUID
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${uuid}@email.com`;
    const phone = `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
    
    // Generate created date (sometime in the past year)
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 365));

    return {
      id: `generated-${index}-${Date.now()}`,
      full_name: `${firstName} ${lastName}`,
      age: age.toString(),
      gender,
      race_ethnicity: raceEthnicity,
      secondary_race_ethnicity: secondaryRaceEthnicity,
      email,
      phone_number: phone,
      dob,
      created_at: createdDate.toISOString(),
      condition: condition
    };
  };

  const handleGeneratePatients = async () => {
    if (!condition.trim() || numberOfPatients <= 0) {
      alert('Please enter a valid condition and number of patients');
      return;
    }

    try {
      setIsGenerating(true);
      setIsLoadingDistribution(true);
      
      // Get demographic distribution from ChatGPT
      const distribution = await getDemographicDistribution(condition);
      setIsLoadingDistribution(false);
      
      // Generate patients based on the distribution
      const generatedPatients: Patient[] = [];
      for (let i = 0; i < numberOfPatients; i++) {
        generatedPatients.push(generateRandomPatient(i, distribution));
      }
      
      // Always save patients to Healthie API
      if (providerId) {
        setIsSavingToHealthie(true);
        let savedCount = 0;
        
        for (const patient of generatedPatients) {
          const healthieId = await savePatientToHealthie(patient);
          if (healthieId) {
            savedCount++;
            // Update the patient with the Healthie ID
            patient.id = healthieId;
          }
        }
        
        setIsSavingToHealthie(false);
        
        if (savedCount === generatedPatients.length) {
          alert(`✅ Successfully saved all ${savedCount} patients to Healthie!`);
          // Refresh the patient list to show newly created patients
          if (onRefreshPatientList) {
            setTimeout(() => onRefreshPatientList(), 500); // Small delay to ensure DB is updated
          }
        } else if (savedCount > 0) {
          alert(`⚠️ Saved ${savedCount} out of ${generatedPatients.length} patients to Healthie. Some patients may have failed to save.`);
          // Still refresh if some patients were saved
          if (onRefreshPatientList) {
            setTimeout(() => onRefreshPatientList(), 500);
          }
        } else {
          alert(`❌ Failed to save patients to Healthie. Please check the console for errors.`);
        }
      } else {
        alert(`⚠️ No provider ID provided. Patients generated but not saved to Healthie.`);
      }
      
      onPatientsGenerated(generatedPatients);
      setIsGenerating(false);
      setIsModalOpen(false);
      setCondition('');
      setNumberOfPatients(10);
    } catch (error) {
      setIsGenerating(false);
      setIsLoadingDistribution(false);
      console.error('Error generating patients:', error);
      
      if (error instanceof Error && error.message.includes('OpenAI API key')) {
        alert('OpenAI API key not configured. Please set REACT_APP_OPENAI_API_KEY environment variable.\n\nUsing default demographic distributions for now.');
      } else {
        alert('Error generating patients with AI demographics. Using default distributions.');
      }
      
      // Generate with default distribution as fallback
      const fallbackDistribution: DemographicDistribution = {
        ageRanges: [
          { range: "18-30", percentage: 25, minAge: 18, maxAge: 30 },
          { range: "31-45", percentage: 30, minAge: 31, maxAge: 45 },
          { range: "46-65", percentage: 30, minAge: 46, maxAge: 65 },
          { range: "66+", percentage: 15, minAge: 66, maxAge: 90 }
        ],
        genderDistribution: [
          { gender: "Male", percentage: 50 },
          { gender: "Female", percentage: 50 }
        ],
        raceEthnicityDistribution: [
          { raceEthnicity: "White", percentage: 61 },
          { raceEthnicity: "Hispanic or Latino", percentage: 18 },
          { raceEthnicity: "Black or African American", percentage: 12 },
          { raceEthnicity: "Asian", percentage: 6 },
          { raceEthnicity: "American Indian or Alaska Native", percentage: 1 },
          { raceEthnicity: "Native Hawaiian or Pacific Islander", percentage: 1 },
          { raceEthnicity: "Middle Eastern or North African", percentage: 1 }
        ]
      };
      
      const generatedPatients: Patient[] = [];
      for (let i = 0; i < numberOfPatients; i++) {
        generatedPatients.push(generateRandomPatient(i, fallbackDistribution));
      }
      
      // Always save patients to Healthie API (fallback case)
      if (providerId) {
        setIsSavingToHealthie(true);
        let savedCount = 0;
        
        for (const patient of generatedPatients) {
          const healthieId = await savePatientToHealthie(patient);
          if (healthieId) {
            savedCount++;
            patient.id = healthieId;
          }
        }
        
        setIsSavingToHealthie(false);
        
        if (savedCount === generatedPatients.length) {
          alert(`✅ Successfully saved all ${savedCount} patients to Healthie!`);
          // Refresh the patient list to show newly created patients
          if (onRefreshPatientList) {
            setTimeout(() => onRefreshPatientList(), 500); // Small delay to ensure DB is updated
          }
        } else if (savedCount > 0) {
          alert(`⚠️ Saved ${savedCount} out of ${generatedPatients.length} patients to Healthie. Some patients may have failed to save.`);
          // Still refresh if some patients were saved
          if (onRefreshPatientList) {
            setTimeout(() => onRefreshPatientList(), 500);
          }
        } else {
          alert(`❌ Failed to save patients to Healthie. Please check the console for errors.`);
        }
      } else {
        alert(`⚠️ No provider ID provided. Patients generated but not saved to Healthie.`);
      }
      
      onPatientsGenerated(generatedPatients);
      setIsModalOpen(false);
      setCondition('');
      setNumberOfPatients(10);
    }
  };

  return (
    <>
      <button 
        className="generate-patients-btn" 
        onClick={() => setIsModalOpen(true)}
      >
        Generate Test Patients
      </button>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate Test Patients</h3>
              <button 
                className="modal-close" 
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="ai-info">
                <p className="ai-description">
                  🤖 This tool uses AI to get realistic demographic distributions for the specified medical condition, 
                  then generates patients that match real-world epidemiological data.
                </p>
              </div>
              
              <div className="form-group">
                <label htmlFor="condition">Medical Condition:</label>
                <input
                  id="condition"
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g., Diabetes, Hypertension, Asthma"
                  className="form-input"
                  disabled={isGenerating}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="numberOfPatients">Number of Patients:</label>
                <input
                  id="numberOfPatients"
                  type="number"
                  min="1"
                  max="100"
                  value={numberOfPatients}
                  onChange={(e) => setNumberOfPatients(parseInt(e.target.value) || 1)}
                  className="form-input"
                  disabled={isGenerating}
                />
              </div>
              
              {providerId && (
                <div className="form-group">
                  <div className="info-message">
                    <p>💾 Generated patients will be automatically saved to your Healthie account.</p>
                  </div>
                </div>
              )}
              
              {isLoadingDistribution && (
                <div className="loading-status">
                  <p>🔍 Getting demographic data...</p>
                </div>
              )}
              
              {isGenerating && !isLoadingDistribution && !isSavingToHealthie && (
                <div className="loading-status">
                  <p>👥 Generating patients based on AI demographics...</p>
                </div>
              )}
              
              {isSavingToHealthie && (
                <div className="loading-status">
                  <p>💾 Saving patients to Healthie API...</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setIsModalOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleGeneratePatients}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Patients'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PatientGenerator;