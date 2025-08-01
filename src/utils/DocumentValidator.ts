export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100 score
  issues: ValidationIssue[];
  summary: string;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'disease_mention' | 'patient_specificity' | 'medical_authenticity' | 'structure';
  message: string;
  severity: number; // 1-10, 10 being most severe
  suggestion?: string;
}

export interface ValidationOptions {
  disease: string;
  patientAge?: number;
  patientGender?: string;
  patientRace?: string;
  strictMode?: boolean; // More rigorous validation
  allowedDiseaseVariations?: string[]; // Allowed variations/synonyms
}

export class DocumentValidator {
  private medicalTerms: Set<string>;
  private structuralRequirements: string[];
  private authenticityIndicators: string[];

  constructor() {
    // Common medical terms that should be present in authentic medical records
    this.medicalTerms = new Set([
      'blood pressure', 'heart rate', 'temperature', 'respiratory rate',
      'pulse', 'oxygen saturation', 'weight', 'height', 'bmi',
      'vital signs', 'physical examination', 'assessment', 'plan',
      'history', 'symptoms', 'complaint', 'medication', 'allergies',
      'follow-up', 'patient', 'presents', 'reports', 'denies',
      'examination reveals', 'normal', 'abnormal', 'within normal limits'
    ]);

    // Required structural elements for SOAP notes
    this.structuralRequirements = [
      'subjective', 'objective', 'assessment', 'plan'
    ];

    // Indicators of medical record authenticity
    this.authenticityIndicators = [
      'vital signs', 'chief complaint', 'history of present illness',
      'physical exam', 'clinical impression', 'treatment plan',
      'medications', 'follow-up', 'patient education'
    ];
  }

  async validateDocument(
    document: string,
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // 1. Check for disease name mentions
    const diseaseIssues = this.validateDiseaseSubtlety(document, options);
    issues.push(...diseaseIssues);
    score -= diseaseIssues.reduce((sum, issue) => sum + issue.severity, 0);

    // 2. Check patient-specific content
    const patientIssues = this.validatePatientSpecificity(document, options);
    issues.push(...patientIssues);
    score -= patientIssues.reduce((sum, issue) => sum + (issue.severity * 0.5), 0);

    // 3. Check medical authenticity
    const authenticityIssues = this.validateMedicalAuthenticity(document);
    issues.push(...authenticityIssues);
    score -= authenticityIssues.reduce((sum, issue) => sum + (issue.severity * 0.7), 0);

    // 4. Check document structure
    const structureIssues = this.validateDocumentStructure(document);
    issues.push(...structureIssues);
    score -= structureIssues.reduce((sum, issue) => sum + (issue.severity * 0.3), 0);

    // Ensure score doesn't go below 0
    score = Math.max(0, Math.round(score));

    const isValid = score >= 70 && !issues.some(issue => 
      issue.type === 'error' && issue.category === 'disease_mention'
    );

    return {
      isValid,
      score,
      issues: issues.sort((a, b) => b.severity - a.severity),
      summary: this.generateSummary(score, issues, isValid)
    };
  }

  private validateDiseaseSubtlety(
    document: string,
    options: ValidationOptions
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const docLower = document.toLowerCase();
    const diseaseLower = options.disease.toLowerCase();

    // Check for exact disease name
    if (docLower.includes(diseaseLower)) {
      issues.push({
        type: 'error',
        category: 'disease_mention',
        message: `Disease name "${options.disease}" found explicitly in document`,
        severity: 10,
        suggestion: 'Remove explicit disease mentions and use subtle clinical presentations instead'
      });
    }

    // Check for common disease variations and abbreviations
    const diseaseVariations = this.getDiseaseVariations(options.disease);
    diseaseVariations.forEach(variation => {
      if (docLower.includes(variation.toLowerCase())) {
        issues.push({
          type: 'warning',
          category: 'disease_mention',
          message: `Disease variation "${variation}" found in document`,
          severity: 7,
          suggestion: 'Consider using more subtle clinical terminology'
        });
      }
    });

    // Check for overly obvious diagnostic language
    const obviousTerms = [
      'diagnosed with', 'diagnosis of', 'confirmed diagnosis',
      'shows signs of', 'consistent with', 'suggestive of'
    ];

    obviousTerms.forEach(term => {
      if (docLower.includes(term)) {
        issues.push({
          type: 'warning',
          category: 'disease_mention',
          message: `Potentially obvious diagnostic language found: "${term}"`,
          severity: 4,
          suggestion: 'Use more subtle clinical language to maintain subtlety'
        });
      }
    });

    return issues;
  }

  private validatePatientSpecificity(
    document: string,
    options: ValidationOptions
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const docLower = document.toLowerCase();

    // Check for age-appropriate content
    if (options.patientAge) {
      const ageSpecificTerms = this.getAgeSpecificTerms(options.patientAge);
      const foundAgeTerms = ageSpecificTerms.filter(term => 
        docLower.includes(term.toLowerCase())
      );

      if (foundAgeTerms.length === 0) {
        issues.push({
          type: 'warning',
          category: 'patient_specificity',
          message: `Document lacks age-appropriate content for ${options.patientAge}-year-old patient`,
          severity: 3,
          suggestion: 'Include age-relevant clinical considerations and terminology'
        });
      }
    }

    // Check for gender-appropriate content
    if (options.patientGender) {
      const genderSpecificIssues = this.validateGenderSpecificity(
        document, 
        options.patientGender
      );
      issues.push(...genderSpecificIssues);
    }

    // Check for demographic considerations
    if (options.patientRace) {
      const demographicIssues = this.validateDemographicConsiderations(
        document,
        options.patientRace
      );
      issues.push(...demographicIssues);
    }

    // Check for generic vs. specific patient presentation
    const genericPhrases = [
      'the patient', 'patient reports', 'patient denies', 'patient presents'
    ];
    let genericCount = 0;
    genericPhrases.forEach(phrase => {
      const matches = (docLower.match(new RegExp(phrase, 'g')) || []).length;
      genericCount += matches;
    });

    if (genericCount > 10) {
      issues.push({
        type: 'info',
        category: 'patient_specificity',
        message: 'Document uses many generic patient references',
        severity: 2,
        suggestion: 'Consider adding more specific patient details and personalized presentation'
      });
    }

    return issues;
  }

  private validateMedicalAuthenticity(document: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const docLower = document.toLowerCase();

    // Check for vital signs
    const vitalSigns = ['blood pressure', 'heart rate', 'temperature', 'respiratory rate'];
    const foundVitals = vitalSigns.filter(vital => docLower.includes(vital));
    
    if (foundVitals.length < 2) {
      issues.push({
        type: 'warning',
        category: 'medical_authenticity',
        message: 'Document lacks sufficient vital signs measurements',
        severity: 5,
        suggestion: 'Include realistic vital signs in the objective section'
      });
    }

    // Check for medical terminology density
    const medicalTermCount = Array.from(this.medicalTerms).filter(term => 
      docLower.includes(term)
    ).length;

    if (medicalTermCount < 5) {
      issues.push({
        type: 'warning',
        category: 'medical_authenticity',
        message: 'Document lacks sufficient medical terminology',
        severity: 4,
        suggestion: 'Include more clinical terminology to enhance authenticity'
      });
    }

    // Check for realistic measurements and values
    const hasNumericValues = /\d+/.test(document);
    if (!hasNumericValues) {
      issues.push({
        type: 'warning',
        category: 'medical_authenticity',
        message: 'Document lacks numeric measurements or values',
        severity: 6,
        suggestion: 'Include realistic vital signs, lab values, or measurements'
      });
    }

    // Check for professional medical language
    const informalTerms = ['feels', 'seems', 'looks', 'appears to be', 'maybe', 'probably'];
    const foundInformal = informalTerms.filter(term => docLower.includes(term));
    
    if (foundInformal.length > 2) {
      issues.push({
        type: 'warning',
        category: 'medical_authenticity',
        message: 'Document contains informal medical language',
        severity: 3,
        suggestion: 'Use more precise, professional medical terminology'
      });
    }

    // Check for complete clinical workflow
    const workflowElements = [
      'chief complaint', 'history', 'examination', 'assessment', 'plan'
    ];
    const foundElements = workflowElements.filter(element => 
      docLower.includes(element) || docLower.includes(element.replace(' ', ''))
    );

    if (foundElements.length < 3) {
      issues.push({
        type: 'warning',
        category: 'medical_authenticity',
        message: 'Document lacks complete clinical workflow elements',
        severity: 4,
        suggestion: 'Ensure all major clinical workflow components are present'
      });
    }

    return issues;
  }

  private validateDocumentStructure(document: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const docLower = document.toLowerCase();

    // Check for SOAP structure
    const soapSections = ['subjective', 'objective', 'assessment', 'plan'];
    const missingSections = soapSections.filter(section => 
      !docLower.includes(section)
    );

    missingSections.forEach(section => {
      issues.push({
        type: 'error',
        category: 'structure',
        message: `Missing SOAP section: ${section.toUpperCase()}`,
        severity: 8,
        suggestion: `Add the ${section.toUpperCase()} section to complete SOAP format`
      });
    });

    // Check document length
    if (document.length < 200) {
      issues.push({
        type: 'warning',
        category: 'structure',
        message: 'Document appears too short for a complete SOAP note',
        severity: 5,
        suggestion: 'Expand the document with more clinical details'
      });
    }

    if (document.length > 3000) {
      issues.push({
        type: 'info',
        category: 'structure',
        message: 'Document is quite lengthy for a typical SOAP note',
        severity: 2,
        suggestion: 'Consider condensing to focus on key clinical points'
      });
    }

    return issues;
  }

  private getDiseaseVariations(disease: string): string[] {
    const variations: { [key: string]: string[] } = {
      'hypertension': ['high blood pressure', 'htn', 'elevated bp', 'hypertensive'],
      'diabetes': ['dm', 'diabetes mellitus', 'diabetic', 'high blood sugar', 'hyperglycemia'],
      'asthma': ['reactive airway disease', 'bronchial asthma', 'asthmatic'],
      'depression': ['major depressive disorder', 'mdd', 'depressive disorder', 'depressed'],
      'anxiety': ['anxiety disorder', 'anxious', 'generalized anxiety', 'gad'],
      'obesity': ['overweight', 'obese', 'increased bmi', 'weight management'],
      'migraine': ['headache', 'cephalgia', 'migrainous'],
      'copd': ['chronic obstructive pulmonary disease', 'emphysema', 'chronic bronchitis']
    };

    return variations[disease.toLowerCase()] || [];
  }

  private getAgeSpecificTerms(age: number): string[] {
    if (age < 18) {
      return ['pediatric', 'adolescent', 'growth', 'development', 'school', 'parent'];
    } else if (age >= 65) {
      return ['elderly', 'geriatric', 'aging', 'retirement', 'medicare', 'senior'];
    } else {
      return ['adult', 'working', 'occupation', 'family history', 'lifestyle'];
    }
  }

  private validateGenderSpecificity(document: string, gender: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const docLower = document.toLowerCase();

    // Check for appropriate pronouns
    const expectedPronouns = gender.toLowerCase() === 'male' ? ['he', 'him', 'his'] : ['she', 'her'];
    const foundPronouns = expectedPronouns.filter(pronoun => docLower.includes(pronoun));

    if (foundPronouns.length === 0) {
      issues.push({
        type: 'info',
        category: 'patient_specificity',
        message: `Document lacks gender-appropriate pronouns for ${gender} patient`,
        severity: 2,
        suggestion: 'Consider including appropriate pronouns to personalize the record'
      });
    }

    return issues;
  }

  private validateDemographicConsiderations(document: string, race: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // This is a placeholder for demographic-specific medical considerations
    // In a real implementation, this would check for relevant demographic health considerations
    
    return issues;
  }

  private generateSummary(score: number, issues: ValidationIssue[], isValid: boolean): string {
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    
    if (score >= 90) {
      return `Excellent SOAP document (${score}/100). ${errorCount} errors, ${warningCount} warnings.`;
    } else if (score >= 80) {
      return `Good SOAP document (${score}/100). ${errorCount} errors, ${warningCount} warnings.`;
    } else if (score >= 70) {
      return `Acceptable SOAP document (${score}/100). ${errorCount} errors, ${warningCount} warnings.`;
    } else {
      return `Poor SOAP document (${score}/100). Needs improvement. ${errorCount} errors, ${warningCount} warnings.`;
    }
  }

  // Utility method for batch validation
  async validateMultipleDocuments(
    documents: { content: string; options: ValidationOptions }[]
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    for (const doc of documents) {
      const result = await this.validateDocument(doc.content, doc.options);
      results.push(result);
    }
    
    return results;
  }
}

// Export singleton instance
export const documentValidator = new DocumentValidator();