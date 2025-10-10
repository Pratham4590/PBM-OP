'use server';
/**
 * @fileOverview An AI flow to extract all raw text from an image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractTextInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ExtractTextInput = z.infer<typeof ExtractTextInputSchema>;

const ExtractTextOutputSchema = z.object({
  text: z.string().describe('All the text extracted from the image.'),
});
export type ExtractTextOutput = z.infer<typeof ExtractTextOutputSchema>;


export async function extractTextFromImage(input: ExtractTextInput): Promise<ExtractTextOutput> {
  return extractTextFromImageFlow(input);
}


const prompt = ai.definePrompt(
  {
    name: 'extractTextPrompt',
    input: { schema: ExtractTextInputSchema },
    output: { schema: ExtractTextOutputSchema },
    prompt: `You are a highly accurate OCR (Optical Character Recognition) engine. Your sole task is to extract all text content from the provided image, preserving the original line breaks and structure as best as possible. Do not interpret, summarize, or reformat the text.

Use the following image as your data source:
{{media url=photoDataUri}}

Return the extracted text.`,
  }
);


const extractTextFromImageFlow = ai.defineFlow(
  {
    name: 'extractTextFromImageFlow',
    inputSchema: ExtractTextInputSchema,
    outputSchema: ExtractTextOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to extract any text from the image.');
    }
    return output;
  }
);
