/**
 * FAQ (Frequently Asked Questions) Configuration
 * 
 * This file contains configuration for FAQ questions that appear on the welcome page.
 * These questions use a specific free model to ensure anyone can use them without cost.
 */

// Free model configuration for FAQ questions
export const FAQ_CONFIG = {
  // The model to use for FAQ questions (must be a free model)
  model: 'qwen/qwen3-30b-a3b:free',
  
  // The provider for the FAQ model
  provider: 'openrouter',
  
  // Alternative free models that can be used
  alternativeModels: [
    'google/gemma-2-9b-it:free',
    'google/gemini-2.0-pro-exp-02-05:free',
    'meta-llama/llama-3.1-8b-instruct:free',
  ],
  
  // Model parameters optimized for FAQ responses
  params: {
    temperature: 0.7,  // Slightly creative but consistent
    top_p: 0.9,        // Good balance of creativity and focus
    max_tokens: 1000,  // Reasonable length for FAQ responses
  },
} as const;

// Helper function to check if a model is free
export const isFreeModel = (model: string): boolean => {
  return model.includes(':free') || (FAQ_CONFIG.alternativeModels as readonly string[]).includes(model);
};

// Helper function to get the best free model for FAQ
export const getFAQModel = (): { model: string; provider: string } => {
  return {
    model: FAQ_CONFIG.model,
    provider: FAQ_CONFIG.provider,
  };
};
