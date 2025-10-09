'use server';
/**
 * @fileOverview An AI flow to extract reel data from an image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractReelsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a reel list, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractReelsInput = z.infer<typeof ExtractReelsInputSchema>;

const ExtractedReelSchema = z.object({
  reelNumber: z.string().describe('The extracted reel number, typically 9-12 digits long.'),
  reelWeight: z.number().describe('The extracted reel weight in kilograms.'),
});

const ExtractReelsOutputSchema = z.object({
  reels: z
    .array(ExtractedReelSchema)
    .describe('An array of all the reel numbers and weights found in the image.'),
});
export type ExtractReelsOutput = z.infer<typeof ExtractReelsOutputSchema>;


export async function extractReelsFromImage(input: ExtractReelsInput): Promise<ExtractReelsOutput> {
  return extractReelsFlow(input);
}


const prompt = ai.definePrompt(
  {
    name: 'extractReelsPrompt',
    input: { schema: ExtractReelsInputSchema },
    output: { schema: ExtractReelsOutputSchema },
    prompt: `You are an expert OCR system for an industrial manufacturing plant. Your task is to extract reel numbers and their corresponding weights from an image of a packing list or inventory sheet.

The reel number is always a long number, usually 9 to 12 digits.
The reel weight is a number, often with decimals, representing kilograms (kg).

Look for lines or rows that contain both a reel number and a weight. Extract all pairs you can find in the image.

Use the following image as your data source:
{{media url=photoDataUri}}

Return the data as a structured list of reel objects.`,
  }
);


const extractReelsFlow = ai.defineFlow(
  {
    name: 'extractReelsFlow',
    inputSchema: ExtractReelsInputSchema,
    outputSchema: ExtractReelsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to extract any reel data from the image.');
    }
    return output;
  }
);
