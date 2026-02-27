import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export interface PostContent {
    title: string;
    hook: string;
    caption: string;
    hashtags: string[];
    canvaInstruction: string;
}

export type Tone = 'Educational' | 'Urgent' | 'Promotional' | 'Myth-busting';

/** Topic/theme hints per tone to guide AI content style */
export const TONE_TOPIC_PROMPTS: Record<Tone, string> = {
    Educational: 'Use a "Did you know?" or fun-fact style. Share useful tips, facts, or identification info.',
    Urgent: 'Use a "DANGER" or "Act now" style. Create urgency around health risks, infestations, or time-sensitive threats.',
    Promotional: 'Use a "Special offer" or "Save now" style. Highlight discounts, seasonal deals, or limited-time packages.',
    'Myth-busting': 'Use a "Myth vs fact" or "Myth busted" style. Debunk common misconceptions about pest control.'
};

export async function generateContent(pest: string, tone: Tone, location: string, companyName: string): Promise<PostContent> {
    const topicHint = TONE_TOPIC_PROMPTS[tone];
    try {
        const result = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: z.object({
                title: z.string().describe("A catchy title for the social media post"),
                hook: z.string().describe("An engaging opening line or hook"),
                caption: z.string().describe(`The main body of the post. MUST sound natural, highly engaging, and mention the location (${location}) and the company name (${companyName}). Make sure the tone is ${tone}.`),
                hashtags: z.array(z.string()).describe("A list of 3-5 relevant hashtags"),
                canvaInstruction: z.string().describe("A descriptive Canva design recipe for a graphic designer to create the accompanying image. Include specifics on Background, Text Overlay, and Accent Colors.")
            }),
            prompt: `You are an expert social media manager for a pest control company. 
Create a ${tone.toLowerCase()} social media post about ${pest}. 
Topic style: ${topicHint}
The company is called "${companyName}" and they are located in the county/area of "${location}". 
This needs to be highly localized and specifically target homeowners in ${location}. 
In addition to the caption, provide a detailed "Canva Template Recipe" so a designer knows exactly how to build an image for this post.`
        });

        return result.object;
    } catch (error) {
        console.error("Failed to generate AI content, falling back to basic template", error);
        const titlePrefix = tone === 'Urgent' ? 'DANGER:' : tone === 'Promotional' ? 'Special offer:' : tone === 'Myth-busting' ? 'Myth busted:' : 'Did you know?';
        return {
            title: `${titlePrefix} ${pest} in ${location}`,
            hook: `Don't let ${pest} take over your home!`,
            caption: `Living in ${location} means dealing with ${pest}. If you spot one, there are likely many more hidden. Call ${companyName} today for a free inspection!`,
            hashtags: [`#${pest.replace(/\s/g, '')}Control`, `#${location.replace(/\s/g, '')}PestControl`, '#ProtectYourHome'],
            canvaInstruction: `Background: Clean, bright image of a home in ${location}. Text Overlay: "Got ${pest}?" in bold, visible letters. Accent Colors: Use brand colors.`
        };
    }
}
