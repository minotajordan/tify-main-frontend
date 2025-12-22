import { CreateMLCEngine, MLCEngine, InitProgressCallback } from '@mlc-ai/web-llm';
import { GeneratedForm } from './localFormGenerator';

// Using a lightweight model optimized for browser
// const SELECTED_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
// Alternatively Phi-3.5 is also great. Let's try Llama 3.2 1B as it is very efficient.
const SELECTED_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

export interface WebLlmState {
  isLoading: boolean;
  progress: number;
  text: string;
  isReady: boolean;
}

class WebLlmService {
  private engine: MLCEngine | null = null;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(onProgress?: InitProgressCallback): Promise<void> {
    if (this.engine) return;
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    this.isInitializing = true;

    this.initializationPromise = (async () => {
      try {
        console.log('Initializing WebLLM with model:', SELECTED_MODEL);
        this.engine = await CreateMLCEngine(SELECTED_MODEL, {
          initProgressCallback: onProgress,
          logLevel: 'INFO', // Change to WARN or ERROR in production
        });
        console.log('WebLLM Initialized successfully');
      } catch (error) {
        console.error('Failed to initialize WebLLM:', error);
        this.engine = null;
        throw error;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initializationPromise;
  }

  async generateForm(prompt: string): Promise<GeneratedForm | null> {
    if (!this.engine) {
      throw new Error('WebLLM engine not initialized. Call initialize() first.');
    }

    const systemPrompt = `
    You are an expert AI Form Architect. Your goal is to interpret user requests (often indirect or informal) and generate a precise JSON structure for a web form.

    ### INPUT PROCESSING
    - The user may speak in Spanish, English, or Portuguese.
    - Analyze the *intent* and *domain* (e.g., University, Gaming, Health, Event).
    - If the user is vague (e.g., "contact form"), infer standard fields (Name, Email, Message).
    - If the user is specific (e.g., "names in one field"), follow strict instructions.
    - Treat "cedula", "DNI", "id" as "number" type with label "Documento de Identidad".
    - Treat "habeas data", "terms", "privacidad" as "habeasData" type.

    ### FIELD TYPES & MAPPING
    Allowed types: 'text', 'number', 'email', 'date', 'select', 'checkbox', 'textarea', 'file', 'habeasData'.

    ### OUTPUT FORMAT
    Return ONLY valid JSON. No markdown.
    Structure:
    {
      "title": "Inferred Title",
      "description": "Brief professional description",
      "fields": [
        { "type": "...", "label": "...", "required": true/false, "options": [...] }
      ]
    }

    ### EXAMPLES (Few-Shot Learning)

    User: "Creame un formulario para obtener informacion basica de las personas, nombres completos en un solo campo, pregunta si es mujer o hombre y el municipio, telefono cedula y el abeas data"
    Output:
    {
      "title": "Registro de Información Básica",
      "description": "Por favor complete sus datos personales.",
      "fields": [
        { "type": "text", "label": "Nombre Completo", "required": true },
        { "type": "select", "label": "Género", "required": true, "options": ["Masculino", "Femenino", "Otro", "Prefiero no decir"] },
        { "type": "text", "label": "Municipio", "required": true },
        { "type": "number", "label": "Teléfono", "required": true },
        { "type": "number", "label": "Cédula / Documento de Identidad", "required": true },
        { "type": "habeasData", "label": "Autorizo el tratamiento de datos personales", "required": true }
      ]
    }

    User: "Necesito recolectar hojas de vida para un puesto de desarrollador, que pongan su linkedin"
    Output:
    {
      "title": "Postulación: Desarrollador",
      "description": "Envía tu perfil para nuestra vacante.",
      "fields": [
        { "type": "text", "label": "Nombre Completo", "required": true },
        { "type": "email", "label": "Correo Electrónico", "required": true },
        { "type": "text", "label": "Perfil de LinkedIn", "required": true },
        { "type": "file", "label": "Adjuntar Hoja de Vida (PDF)", "required": true },
        { "type": "textarea", "label": "Experiencia / Portafolio", "required": false }
      ]
    }

    User: "Encuesta rápida para saber si les gustó la comida del evento"
    Output:
    {
      "title": "Encuesta de Satisfacción",
      "description": "Tu opinión es importante para mejorar nuestros eventos.",
      "fields": [
        { "type": "text", "label": "Nombre (Opcional)", "required": false },
        { "type": "select", "label": "¿Qué te pareció la comida?", "required": true, "options": ["Deliciosa", "Buena", "Regular", "Mala"] },
        { "type": "textarea", "label": "Comentarios adicionales", "required": false }
      ]
    }
    `;

    try {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `User Request: "${prompt}"` },
      ];

      const response = await this.engine.chat.completions.create({
        messages,
        temperature: 0.1, // Low temperature for consistent JSON
        max_tokens: 1024,
        response_format: { type: 'json_object' }, // Enforce JSON output if supported by model, otherwise prompt does it
      });

      const content = response.choices[0].message.content;
      if (!content) return null;

      console.log('WebLLM Raw Output:', content);

      // Clean up potential markdown if the model ignores the instruction
      const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();

      const parsed = JSON.parse(jsonString);
      // Ensure fields exists to prevent UI crashes
      if (!parsed.fields || !Array.isArray(parsed.fields)) {
        parsed.fields = [];
      }

      return parsed as GeneratedForm;
    } catch (error) {
      console.error('Error generating form with WebLLM:', error);
      return null;
    }
  }

  isReady(): boolean {
    return !!this.engine;
  }
}

export const webLlmService = new WebLlmService();
