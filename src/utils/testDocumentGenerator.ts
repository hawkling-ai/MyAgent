import { DocumentGenerator, DocumentGenerationOptions } from './DocumentGenerator';

// Test script to validate document generation functionality
export async function testDocumentGeneration() {
  const generator = new DocumentGenerator();
  
  console.log('🧪 Testing SOAP Document Generation...\n');

  // Test cases with different diseases and models
  const testCases: DocumentGenerationOptions[] = [
    {
      disease: 'Type 2 Diabetes',
      model: 'gpt-4',
      patientAge: 55,
      patientGender: 'Male',
      patientRace: 'Hispanic or Latino'
    },
    {
      disease: 'Hypertension',
      model: 'gpt-3.5-turbo',
      patientAge: 42,
      patientGender: 'Female',
      patientRace: 'Black or African American'
    },
    {
      disease: 'Asthma',
      model: 'gpt-4',
      patientAge: 28,
      patientGender: 'Female',
      patientRace: 'White'
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📋 Test Case ${i + 1}: ${testCase.disease} (${testCase.model})`);
    console.log(`Patient: ${testCase.patientAge}yo ${testCase.patientGender}, ${testCase.patientRace}\n`);
    
    try {
      const document = await generator.generateSOAPDocument(testCase);
      
      console.log('✅ Document Generated Successfully');
      console.log('📄 SOAP Document:');
      console.log('==========================================');
      console.log(document.fullDocument);
      console.log('==========================================\n');
      
      // Validate that disease name is not mentioned explicitly
      const containsDiseaseName = document.fullDocument.toLowerCase().includes(testCase.disease.toLowerCase());
      if (containsDiseaseName) {
        console.log('⚠️  WARNING: Disease name found in document - check subtlety');
      } else {
        console.log('✅ Disease name successfully omitted from document');
      }
      
      console.log(`📊 Document Stats:
      - Total length: ${document.fullDocument.length} characters
      - Subjective length: ${document.subjective.length} characters
      - Objective length: ${document.objective.length} characters
      - Assessment length: ${document.assessment.length} characters
      - Plan length: ${document.plan.length} characters\n`);
      
    } catch (error) {
      console.error(`❌ Test Case ${i + 1} Failed:`, error);
    }
    
    // Add delay between tests to avoid rate limiting
    if (i < testCases.length - 1) {
      console.log('⏳ Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('🎉 Document Generation Testing Complete!');
}

// Test multiple document generation for variety
export async function testMultipleDocuments() {
  console.log('🔄 Testing Multiple Document Generation...\n');
  
  const generator = new DocumentGenerator();
  
  try {
    const documents = await generator.generateMultipleDocuments('Migraine', 2, 'gpt-4');
    
    console.log(`✅ Generated ${documents.length} documents for Migraine`);
    
    documents.forEach((doc, index) => {
      console.log(`\n📋 Document ${index + 1}:`);
      console.log('==========================================');
      console.log(doc.fullDocument);
      console.log('==========================================');
      
      // Check for disease name mentions
      const containsDiseaseName = doc.fullDocument.toLowerCase().includes('migraine');
      console.log(containsDiseaseName ? '⚠️  Disease name found' : '✅ Disease name omitted');
    });
    
  } catch (error) {
    console.error('❌ Multiple document generation failed:', error);
  }
}

// Usage example function
export function exampleUsage() {
  console.log(`
📚 DocumentGenerator Usage Examples:

// Basic usage
import { documentGenerator } from './utils/DocumentGenerator';

const document = await documentGenerator.generateSOAPDocument({
  disease: 'Hypertension',
  model: 'gpt-4',
  patientAge: 45,
  patientGender: 'Male',
  patientRace: 'White'
});

console.log(document.fullDocument);

// Generate multiple variations
const documents = await documentGenerator.generateMultipleDocuments('Diabetes', 3, 'gpt-3.5-turbo');

// Access individual sections
console.log('Subjective:', document.subjective);
console.log('Objective:', document.objective);
console.log('Assessment:', document.assessment);
console.log('Plan:', document.plan);
  `);
}

// Export test runner for easy execution
export const runAllTests = async () => {
  await testDocumentGeneration();
  console.log('\n' + '='.repeat(60) + '\n');
  await testMultipleDocuments();
};