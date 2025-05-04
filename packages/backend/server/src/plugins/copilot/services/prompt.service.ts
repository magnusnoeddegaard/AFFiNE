import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../base/logger';

@Injectable()
export class PromptService {
  private promptTemplates: Record<string, string> = {};

  constructor(private readonly logger: LoggerService) {
    // Logger context is handled differently
    this.initializePromptTemplates();
  }

  /**
   * Initialize default prompt templates
   */
  private initializePromptTemplates() {
    this.promptTemplates = {
      'text-generation':
        'You are an AI assistant helping with tasks. {{input}}',
      'image-generation': 'Create a detailed image of {{input}}',
      summarization: 'Summarize the following text: {{input}}',
      translation: 'Translate the following text to {{language}}: {{input}}',
      'grammar-correction':
        'Correct the grammar in the following text: {{input}}',
    };
  }

  /**
   * Get a prompt template by name
   * @param templateName Template name
   * @returns Prompt template string
   */
  getPromptTemplate(templateName: string): string {
    const template = this.promptTemplates[templateName];

    if (!template) {
      this.logger.warn(
        `Prompt template not found: ${templateName}`,
        'PromptService'
      );
      return '{{input}}'; // Default template
    }

    return template;
  }

  /**
   * Register a new prompt template
   * @param templateName Template name
   * @param template Prompt template string
   */
  registerPromptTemplate(templateName: string, template: string) {
    this.promptTemplates[templateName] = template;
    this.logger.debug(
      `Registered new prompt template: ${templateName}`,
      'PromptService'
    );
  }

  /**
   * Format a prompt template with variables
   * @param templateName Template name
   * @param variables Variables to inject into the template
   * @returns Formatted prompt
   */
  formatPrompt(
    templateName: string,
    variables: Record<string, string>
  ): string {
    let template = this.getPromptTemplate(templateName);

    // Replace variables in the template
    Object.entries(variables).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return template;
  }
}
