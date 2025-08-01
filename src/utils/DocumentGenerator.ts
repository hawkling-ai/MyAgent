import OpenAI from 'openai';
import { documentValidator, ValidationResult, ValidationOptions } from './DocumentValidator';

export interface DocumentGenerationOptions {
  disease: string;
  model?: string;
  patientAge?: number;
  patientGender?: string;
  patientRace?: string;
  validateDocument?: boolean; // Enable validation
  maxRetries?: number; // Max retries if validation fails
}

export interface SOAPDocument {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  fullDocument: string;
  validation?: ValidationResult; // Include validation results
}

export class DocumentGenerator {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set REACT_APP_OPENAI_API_KEY environment variable.');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async generateSOAPDocument(options: DocumentGenerationOptions): Promise<SOAPDocument> {
    const {
      disease,
      model = 'gpt-4',
      patientAge = Math.floor(Math.random() * 60) + 20,
      patientGender = Math.random() > 0.5 ? 'Male' : 'Female',
      patientRace = 'Not specified',
      validateDocument = true,
      maxRetries = 2
    } = options;

    let attempts = 0;
    let bestDocument: SOAPDocument | null = null;
    let bestValidation: ValidationResult | null = null;

    while (attempts <= maxRetries) {
      try {
        const prompt = this.buildPrompt(disease, patientAge, patientGender, patientRace, attempts);

        const response = await this.openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are an experienced physician writing clinical documentation. Generate realistic SOAP notes that present clinical findings and symptoms without explicitly naming the underlying condition. The condition should be inferrable from the constellation of symptoms, signs, and clinical presentation, but never directly stated. Use proper medical terminology and realistic clinical scenarios."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from OpenAI');
        }

        const document = this.parseSOAPDocument(content);

        if (validateDocument) {
          const validationOptions: ValidationOptions = {
            disease,
            patientAge,
            patientGender,
            patientRace,
            strictMode: attempts > 0 // Use strict mode on retries
          };

          const validation = await documentValidator.validateDocument(
            document.fullDocument,
            validationOptions
          );

          document.validation = validation;

          // If validation passes or this is our best attempt so far
          if (validation.isValid) {
            return document;
          } else if (!bestDocument || validation.score > (bestValidation?.score || 0)) {
            bestDocument = document;
            bestValidation = validation;
          }
        } else {
          return document;
        }

        attempts++;
      } catch (error) {
        attempts++;
        if (attempts > maxRetries) {
          console.error('Error generating SOAP document:', error);
          throw new Error(`Failed to generate SOAP document after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Return the best document we generated, even if it didn't pass validation
    if (bestDocument) {
      console.warn('Returning best document that did not pass full validation:', bestValidation?.summary);
      return bestDocument;
    }

    throw new Error('Failed to generate any valid SOAP document');
  }

  private buildPrompt(disease: string, age: number, gender: string, race: string, attempt: number = 0): string {
    const retryGuidance = attempt > 0 ? `

RETRY GUIDANCE (Attempt ${attempt + 1}):
- Be extra careful to avoid any mention of "${disease}" or related terms
- Focus on subtle clinical presentations and symptoms only
- Include more specific vital signs and measurements
- Use professional medical language throughout
- Ensure age-appropriate and gender-appropriate content` : '';

    return `Generate a realistic SOAP note for a ${age}-year-old ${gender} patient who presents with clinical findings consistent with ${disease}. 

CRITICAL REQUIREMENTS:
1. ABSOLUTELY DO NOT mention "${disease}", its abbreviations, or common synonyms anywhere in the document
2. Present symptoms, signs, and findings that would lead a clinician to suspect this condition WITHOUT naming it
3. Make the presentation subtle but clinically accurate with realistic vital signs
4. Use proper medical terminology and professional formatting throughout
5. Include specific numeric values (BP, HR, temp, etc.) for authenticity
6. Consider demographic factors (age: ${age}, gender: ${gender}, race: ${race}) in your clinical presentation
7. Use appropriate pronouns and age-specific terminology${retryGuidance}

Format the response as a standard SOAP note with clear sections:

SUBJECTIVE:
[Patient's chief complaint, history of present illness, review of systems, past medical history, medications, allergies, social history - be specific and personal]

OBJECTIVE:
[Vital signs with specific numbers, physical examination findings, laboratory results if relevant, diagnostic findings]

ASSESSMENT:
[Clinical impression and differential diagnosis - describe the clinical picture WITHOUT naming the specific condition]

PLAN:
[Treatment recommendations, diagnostic workup, follow-up plans, patient education]

Make this a realistic clinical encounter that demonstrates the typical presentation patterns for this condition while maintaining complete clinical subtlety.`;
  }

  private parseSOAPDocument(content: string): SOAPDocument {
    const sections = {
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    };

    // Extract each section using regex patterns
    const subjectiveMatch = content.match(/SUBJECTIVE:?\s*([\s\S]*?)(?=OBJECTIVE:|$)/i);
    const objectiveMatch = content.match(/OBJECTIVE:?\s*([\s\S]*?)(?=ASSESSMENT:|$)/i);
    const assessmentMatch = content.match(/ASSESSMENT:?\s*([\s\S]*?)(?=PLAN:|$)/i);
    const planMatch = content.match(/PLAN:?\s*([\s\S]*?)$/i);

    if (subjectiveMatch) sections.subjective = subjectiveMatch[1].trim();
    if (objectiveMatch) sections.objective = objectiveMatch[1].trim();
    if (assessmentMatch) sections.assessment = assessmentMatch[1].trim();
    if (planMatch) sections.plan = planMatch[1].trim();

    return {
      subjective: sections.subjective,
      objective: sections.objective,
      assessment: sections.assessment,
      plan: sections.plan,
      fullDocument: content
    };
  }

  // Utility method to generate multiple documents for testing
  async generateMultipleDocuments(
    disease: string, 
    count: number = 3, 
    model: string = 'gpt-4'
  ): Promise<SOAPDocument[]> {
    const documents: SOAPDocument[] = [];
    
    for (let i = 0; i < count; i++) {
      const options: DocumentGenerationOptions = {
        disease,
        model,
        patientAge: Math.floor(Math.random() * 60) + 20,
        patientGender: Math.random() > 0.5 ? 'Male' : 'Female',
        patientRace: ['White', 'Hispanic or Latino', 'Black or African American', 'Asian'][Math.floor(Math.random() * 4)]
      };
      
      try {
        const document = await this.generateSOAPDocument(options);
        documents.push(document);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to generate document ${i + 1}:`, error);
      }
    }
    
    return documents;
  }
}

// Export a singleton instance for easy use
export const documentGenerator = new DocumentGenerator();