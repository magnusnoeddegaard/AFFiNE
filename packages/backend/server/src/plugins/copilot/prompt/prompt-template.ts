/**
 * Interface for prompt templates
 */
export interface PromptTemplate {
  /**
   * Generate a prompt with the given variables
   * @param variables Variables to insert into the template
   * @returns Generated prompt string
   */
  generate(variables?: Record<string, any>): string;
}

/**
 * Simple string prompt template
 */
export class StringPromptTemplate implements PromptTemplate {
  private template: string;
  
  constructor(template: string) {
    this.template = template;
  }
  
  generate(variables: Record<string, any> = {}): string {
    let result = this.template;
    
    // Replace variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return result;
  }
}

/**
 * Prompt template with conditional sections
 */
export class ConditionalPromptTemplate implements PromptTemplate {
  private sections: {
    text: string;
    condition?: (variables: Record<string, any>) => boolean;
  }[];
  
  constructor(sections: { text: string; condition?: (variables: Record<string, any>) => boolean }[]) {
    this.sections = sections;
  }
  
  generate(variables: Record<string, any> = {}): string {
    // Filter sections based on conditions
    const applicableSections = this.sections.filter(section => 
      !section.condition || section.condition(variables)
    );
    
    // Combine and process the sections
    let result = applicableSections.map(section => section.text).join('\n\n');
    
    // Replace variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return result;
  }
}

/**
 * Composite prompt template combining multiple templates
 */
export class CompositePromptTemplate implements PromptTemplate {
  private templates: PromptTemplate[];
  
  constructor(templates: PromptTemplate[]) {
    this.templates = templates;
  }
  
  generate(variables: Record<string, any> = {}): string {
    return this.templates
      .map(template => template.generate(variables))
      .join('\n\n');
  }
}