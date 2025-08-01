import { DocumentGenerator, DocumentGenerationOptions } from './DocumentGenerator';
import { documentValidator, ValidationOptions } from './DocumentValidator';

// Test document validation functionality
export async function testDocumentValidation() {
  console.log('🧪 Testing Document Validation System...\n');

  const generator = new DocumentGenerator();

  // Test cases with different validation scenarios
  const testCases: DocumentGenerationOptions[] = [
    {
      disease: 'Hypertension',
      model: 'gpt-3.5-turbo',
      patientAge: 55,
      patientGender: 'Male',
      patientRace: 'Hispanic or Latino',
      validateDocument: true,
      maxRetries: 2
    },
    {
      disease: 'Type 2 Diabetes',
      model: 'gpt-4',
      patientAge: 62,
      patientGender: 'Female',
      patientRace: 'Black or African American',
      validateDocument: true,
      maxRetries: 1
    },
    {
      disease: 'Asthma',
      model: 'gpt-3.5-turbo',
      patientAge: 28,
      patientGender: 'Female',
      patientRace: 'White',
      validateDocument: false // Test without validation
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📋 Test Case ${i + 1}: ${testCase.disease} (Validation: ${testCase.validateDocument ? 'ON' : 'OFF'})`);
    console.log(`Patient: ${testCase.patientAge}yo ${testCase.patientGender}, ${testCase.patientRace}\n`);
    
    try {
      const startTime = Date.now();
      const document = await generator.generateSOAPDocument(testCase);
      const endTime = Date.now();
      
      console.log('✅ Document Generated Successfully');
      console.log(`⏱️  Generation Time: ${(endTime - startTime) / 1000}s`);
      
      if (document.validation) {
        console.log('\n📊 Validation Results:');
        console.log(`Score: ${document.validation.score}/100`);
        console.log(`Valid: ${document.validation.isValid ? '✅' : '❌'}`);
        console.log(`Summary: ${document.validation.summary}`);
        
        if (document.validation.issues.length > 0) {
          console.log('\n🔍 Issues Found:');
          document.validation.issues.forEach((issue, index) => {
            const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`  ${index + 1}. ${icon} [${issue.category}] ${issue.message}`);
            if (issue.suggestion) {
              console.log(`     💡 ${issue.suggestion}`);
            }
          });
        }
        
        // Specific validation checks
        const containsDiseaseName = document.fullDocument.toLowerCase().includes(testCase.disease.toLowerCase());
        console.log(`\n🎯 Disease Name Check: ${containsDiseaseName ? '❌ FOUND' : '✅ CLEAN'}`);
        
        const hasVitalSigns = /\d+\/\d+|\d+\s*bpm|\d+\.?\d*°[FC]|\d+\.?\d*\s*lbs?|\d+\.?\d*\s*kg/.test(document.fullDocument);
        console.log(`📏 Vital Signs Present: ${hasVitalSigns ? '✅' : '❌'}`);
        
        const hasPronouns = new RegExp(`\\b(${testCase.patientGender?.toLowerCase() === 'male' ? 'he|him|his' : 'she|her'})\\b`).test(document.fullDocument.toLowerCase());
        console.log(`👤 Gender-Appropriate Pronouns: ${hasPronouns ? '✅' : '❌'}`);
        
      } else {
        console.log('ℹ️  No validation performed (disabled)');
      }
      
      console.log('\n📄 Generated SOAP Document:');
      console.log('=' .repeat(80));
      console.log(document.fullDocument);
      console.log('=' .repeat(80));
      
    } catch (error) {
      console.error(`❌ Test Case ${i + 1} Failed:`, error);
    }
    
    console.log('\n' + '-'.repeat(100) + '\n');
  }
}

// Test manual validation of sample documents
export async function testManualValidation() {
  console.log('🧪 Testing Manual Document Validation...\n');

  // Sample documents with known issues for testing
  const testDocuments = [
    {
      name: 'Good Document',
      content: `SUBJECTIVE:
45-year-old male presents with chief complaint of chest tightness and fatigue for the past 3 weeks. He reports shortness of breath with exertion and occasional palpitations. No chest pain. Past medical history significant for family history of cardiovascular disease. Takes no medications. No known allergies.

OBJECTIVE:
Vital Signs: BP 158/96, HR 88 bpm, Temp 98.2°F, RR 16, O2 Sat 97% on room air
Physical exam reveals an overweight male in no acute distress. Heart exam shows regular rate and rhythm with no murmurs. Lungs clear bilaterally. Extremities show no edema.

ASSESSMENT:
Patient presents with elevated blood pressure readings and symptoms suggestive of cardiovascular strain. Clinical picture consistent with early stage hypertensive disease process requiring intervention.

PLAN:
Lifestyle modifications including dietary changes and regular exercise. Follow-up in 2 weeks for blood pressure monitoring. Consider antihypertensive therapy if readings remain elevated.`,
      options: {
        disease: 'Hypertension',
        patientAge: 45,
        patientGender: 'Male',
        patientRace: 'White'
      }
    },
    {
      name: 'Document with Disease Name (Should Fail)',
      content: `SUBJECTIVE:
Patient has hypertension and reports elevated blood pressure readings at home.

OBJECTIVE:
BP 180/110, consistent with hypertensive crisis.

ASSESSMENT:
Hypertension, poorly controlled.

PLAN:
Increase antihypertensive medications.`,
      options: {
        disease: 'Hypertension',
        patientAge: 50,
        patientGender: 'Male',
        patientRace: 'White'
      }
    },
    {
      name: 'Incomplete Document (Should Have Issues)',
      content: `Patient feels bad. BP high. Need meds.`,
      options: {
        disease: 'Hypertension',
        patientAge: 60,
        patientGender: 'Female',
        patientRace: 'White'
      }
    }
  ];

  for (const testDoc of testDocuments) {
    console.log(`📋 Testing: ${testDoc.name}`);
    
    try {
      const validation = await documentValidator.validateDocument(
        testDoc.content,
        testDoc.options as ValidationOptions
      );
      
      console.log(`Score: ${validation.score}/100 | Valid: ${validation.isValid ? '✅' : '❌'}`);
      console.log(`Summary: ${validation.summary}`);
      
      if (validation.issues.length > 0) {
        console.log('Issues:');
        validation.issues.slice(0, 3).forEach((issue, index) => {
          const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`  ${icon} ${issue.message}`);
        });
      }
      
    } catch (error) {
      console.error('Validation failed:', error);
    }
    
    console.log('\n' + '-'.repeat(50) + '\n');
  }
}

// Performance test for batch validation
export async function testBatchValidation() {
  console.log('🧪 Testing Batch Validation Performance...\n');

  const batchTestData = [
    { disease: 'Hypertension', age: 45, gender: 'Male' },
    { disease: 'Diabetes', age: 55, gender: 'Female' },
    { disease: 'Asthma', age: 30, gender: 'Male' }
  ];

  const generator = new DocumentGenerator();
  const documents: { content: string; options: ValidationOptions }[] = [];

  // Generate test documents
  console.log('📝 Generating test documents...');
  for (const testData of batchTestData) {
    try {
      const doc = await generator.generateSOAPDocument({
        disease: testData.disease,
        patientAge: testData.age,
        patientGender: testData.gender,
        validateDocument: false // Generate without validation first
      });
      
      documents.push({
        content: doc.fullDocument,
        options: {
          disease: testData.disease,
          patientAge: testData.age,
          patientGender: testData.gender
        }
      });
    } catch (error) {
      console.error(`Failed to generate document for ${testData.disease}:`, error);
    }
  }

  if (documents.length > 0) {
    console.log(`\n📊 Batch validating ${documents.length} documents...`);
    const startTime = Date.now();
    
    try {
      const results = await documentValidator.validateMultipleDocuments(documents);
      const endTime = Date.now();
      
      console.log(`⏱️  Batch validation completed in ${(endTime - startTime) / 1000}s`);
      console.log(`📈 Average score: ${Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)}/100`);
      console.log(`✅ Valid documents: ${results.filter(r => r.isValid).length}/${results.length}`);
      
    } catch (error) {
      console.error('Batch validation failed:', error);
    }
  }
}

// Export comprehensive test runner
export const runAllValidationTests = async () => {
  await testDocumentValidation();
  console.log('\n' + '='.repeat(100) + '\n');
  await testManualValidation();
  console.log('\n' + '='.repeat(100) + '\n');
  await testBatchValidation();
};