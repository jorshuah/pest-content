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

/** Topic/theme hints per tone - varied formats to encourage creativity */
export const TONE_TOPIC_PROMPTS: Record<Tone, string> = {
    Educational: 'Use a surprising angle: a little-known fact, a "what most people don\'t know" hook, or a before/after insight. Avoid generic "Did you know?" - be specific and memorable. Consider: list format, question hook, or a short story.',
    Urgent: 'Create real urgency with a specific scenario (e.g. "If you see this in your kitchen tonight..."). Use vivid, concrete details - not vague warnings. Consider: countdown, "last chance" framing, or a mini case study.',
    Promotional: 'Lead with value: a specific offer, a seasonal angle, or a "limited to [location]" hook. Avoid generic "Special offer" - make it feel exclusive. Consider: urgency + discount, bundle deal, or free inspection hook.',
    'Myth-busting': 'Pick one strong myth and demolish it with a surprising fact. Use "Most [location] homeowners think X... but here\'s the truth" or "The #1 myth about [pest] - and why it\'s dangerous." Be provocative but accurate.'
};

/** Optional context to avoid repeating content for the same profile */
export interface AvoidContent {
    pests: string[];
    titles: string[];
    captions: string[];
    tones?: string[];
}

const CREATIVE_FORMAT_HINTS = [
    'Try a bold opening question that stops the scroll.',
    'Use a specific number or stat if relevant (e.g. "3 signs", "24 hours").',
    'Include a relatable scenario for homeowners in the area.',
    'Vary sentence length - mix short punchy lines with one longer one.',
    'Avoid clichés like "Don\'t let pests take over" - find a fresher angle.',
    'Use a short relatable story or anecdote.',
    'Start with an unexpected emoji.',
    'Format your caption with lots of negative space (blank lines) between punchy sentences.',
];

export async function generateContent(
    pest: string,
    tone: Tone,
    location: string,
    companyName: string,
    options?: { avoidContent?: AvoidContent }
): Promise<PostContent> {
    const topicHint = TONE_TOPIC_PROMPTS[tone];
    const formatHint = CREATIVE_FORMAT_HINTS[Math.floor(Math.random() * CREATIVE_FORMAT_HINTS.length)];
    const avoid = options?.avoidContent;

    let avoidSection = '';
    if (avoid && (avoid.pests.length > 0 || avoid.titles.length > 0 || (avoid.tones && avoid.tones.length > 0))) {
        const avoidPests = avoid.pests.length > 0 ? `Pests already covered recently: ${[...new Set(avoid.pests)].join(', ')}.` : '';
        const avoidTitles = avoid.titles.length > 0 ? `Titles to avoid repeating: ${avoid.titles.slice(-5).join(' | ')}.` : '';
        const avoidTones = avoid.tones && avoid.tones.length > 0 ? `Recently used tones: ${[...new Set(avoid.tones.slice(-3))].join(', ')} (do your best to differentiate the style).` : '';
        avoidSection = `\n\nIMPORTANT - Avoid repetition for this profile: ${avoidPests} ${avoidTitles} ${avoidTones} Create something completely fresh and different from the above.`;
    }

    try {
        const result = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: z.object({
                title: z.string().describe("A catchy, scroll-stopping title - avoid generic phrasing"),
                hook: z.string().describe("An engaging opening line that makes people want to keep reading"),
                caption: z.string().describe(`The main body. MUST mention ${location} and ${companyName}. Sound natural and engaging. Mix short and long sentences.`),
                hashtags: z.array(z.string()).describe("3-5 relevant hashtags"),
                canvaInstruction: z.string().describe("A detailed Canva recipe: Background, Text Overlay, Accent Colors. Be specific - avoid generic 'use brand colors'.")
            }),
            prompt: `You are a creative social media expert for pest control companies. Your posts stand out - they're not generic.

Create a ${tone.toLowerCase()} post about ${pest}.
Topic style: ${topicHint}
Format tip: ${formatHint}

Company: "${companyName}" in "${location}". Target homeowners in ${location} - be hyper-local. Include local slang or weather references if relevant.
${avoidSection}

Create a detailed "Canva Template Recipe" with specific visual directions (colors, layout, imagery) - not vague.`
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
