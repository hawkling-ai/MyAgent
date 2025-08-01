# Document Validator - Usage Guide

## ✅ Document Validation System Overview

The DocumentValidator ensures that generated SOAP documents meet three critical requirements:
1. **Disease Subtlety**: The disease name is never explicitly mentioned
2. **Patient Specificity**: Content is tailored to the specific patient demographics
3. **Medical Authenticity**: Document appears as a real medical record

## 🚀 Key Features

### **Comprehensive Validation Checks**
- ❌ **Disease Name Detection**: Detects explicit disease mentions and common variations
- 👤 **Patient-Specific Content**: Validates age/gender/demographic appropriateness  
- 🏥 **Medical Authenticity**: Checks for vital signs, medical terminology, professional language
- 📋 **Document Structure**: Ensures proper SOAP format and completeness

### **Intelligent Retry System**
- Automatic retry with improved prompts if validation fails
- Best document selection when full validation isn't achieved
- Configurable retry attempts and validation strictness

### **Detailed Reporting**
- 0-100 scoring system with detailed issue breakdown
- Error/Warning/Info categorization with severity levels
- Actionable suggestions for improvement

## 📖 Usage Examples

### Basic Usage with Validation
```typescript
import { documentGenerator } from './utils/DocumentGenerator';

// Generate document with automatic validation
const document = await documentGenerator.generateSOAPDocument({
  disease: 'Hypertension',
  model: 'gpt-4',
  patientAge: 45,
  patientGender: 'Male',
  patientRace: 'Hispanic or Latino',
  validateDocument: true,  // Enable validation (default: true)
  maxRetries: 2           // Retry up to 2 times if validation fails
});

// Check validation results
if (document.validation) {
  console.log(`Validation Score: ${document.validation.score}/100`);
  console.log(`Valid: ${document.validation.isValid}`);
  console.log(`Summary: ${document.validation.summary}`);
  
  // Review any issues found
  document.validation.issues.forEach(issue => {
    console.log(`${issue.type.toUpperCase()}: ${issue.message}`);
    if (issue.suggestion) {
      console.log(`Suggestion: ${issue.suggestion}`);
    }
  });
}
```

### Manual Document Validation
```typescript
import { documentValidator } from './utils/DocumentValidator';

// Validate an existing document
const existingDocument = `SUBJECTIVE: Patient reports chest pain...`;

const validationResult = await documentValidator.validateDocument(
  existingDocument,
  {
    disease: 'Hypertension',
    patientAge: 55,
    patientGender: 'Male',
    patientRace: 'White',
    strictMode: true  // More rigorous validation
  }
);

console.log(`Score: ${validationResult.score}/100`);
console.log(`Issues found: ${validationResult.issues.length}`);
```

### Batch Validation
```typescript
// Validate multiple documents at once
const documents = [
  { content: document1, options: { disease: 'Diabetes', patientAge: 60 } },
  { content: document2, options: { disease: 'Asthma', patientAge: 25 } }
];

const results = await documentValidator.validateMultipleDocuments(documents);
const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
console.log(`Average validation score: ${averageScore}/100`);
```

## 📊 Validation Categories & Scoring

### **Error Categories** (High Impact)
- **disease_mention**: Disease name found explicitly (Score: -10 to -7)
- **structure**: Missing SOAP sections (Score: -8)

### **Warning Categories** (Medium Impact)  
- **patient_specificity**: Generic content, missing demographics (Score: -3 to -5)
- **medical_authenticity**: Missing vital signs, unprofessional language (Score: -3 to -6)

### **Info Categories** (Low Impact)
- General suggestions for improvement (Score: -1 to -2)

## ⚡ Advanced Features

### **Disease Variation Detection**
The validator automatically detects common disease variations:
- "Hypertension" → detects "high blood pressure", "HTN", "elevated BP"
- "Diabetes" → detects "DM", "diabetes mellitus", "hyperglycemia"
- "Asthma" → detects "reactive airway disease", "bronchial asthma"

### **Age-Appropriate Content Validation**
- **Pediatric** (< 18): Expects terms like "pediatric", "growth", "development"
- **Adult** (18-64): Looks for "occupation", "family history", "lifestyle"
- **Geriatric** (65+): Validates for "elderly", "geriatric", "senior" considerations

### **Medical Authenticity Checks**
- ✅ Vital signs with numeric values (BP, HR, Temp, RR)
- ✅ Professional medical terminology density
- ✅ Complete clinical workflow elements
- ✅ Realistic measurements and lab values

### **Retry Intelligence** 
When validation fails, the system:
1. Analyzes specific failure reasons
2. Enhances prompt with targeted guidance
3. Uses stricter validation criteria on retries
4. Returns best document if no perfect match found

## 🎯 Validation Scores Guide

- **90-100**: Excellent - Professional medical document, fully compliant
- **80-89**: Good - Minor issues, generally acceptable
- **70-79**: Acceptable - Some concerns but usable
- **Below 70**: Poor - Significant issues requiring attention

## 🔧 Configuration Options

### DocumentGenerationOptions
```typescript
{
  disease: string;              // Target condition
  model?: string;               // OpenAI model (gpt-4, gpt-3.5-turbo)
  patientAge?: number;          // Patient age for demographics
  patientGender?: string;       // Patient gender
  patientRace?: string;         // Patient race/ethnicity
  validateDocument?: boolean;   // Enable validation (default: true)
  maxRetries?: number;          // Max retry attempts (default: 2)
}
```

### ValidationOptions
```typescript
{
  disease: string;                    // Disease to check against
  patientAge?: number;               // Expected patient age
  patientGender?: string;            // Expected patient gender
  patientRace?: string;              // Expected patient race
  strictMode?: boolean;              // More rigorous validation
  allowedDiseaseVariations?: string[]; // Custom disease synonyms
}
```

## 🧪 Testing & Quality Assurance

The validation system includes comprehensive test suites:
- Unit tests for each validation category
- Integration tests with OpenAI API
- Performance tests for batch validation
- Edge case testing with problematic documents

Run tests with:
```typescript
import { runAllValidationTests } from './utils/testDocumentValidation';
await runAllValidationTests();
```

This ensures your generated SOAP documents maintain the highest quality standards while preserving clinical subtlety and authenticity.