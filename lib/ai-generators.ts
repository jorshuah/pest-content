import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import type { Climate, Month } from './seasonal-engine';
import type { Tone } from './content-generator';

/** AI-generated seasonal pest priorities for a month + climate */
export async function generateSeasonalPests(month: Month, climate: Climate): Promise<{ pest: string; reason: string }[]> {
    try {
        const result = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: z.object({
                pests: z.array(z.object({
                    pest: z.string().describe('Common pest name'),
                    reason: z.string().describe('Why this pest is active/priority this month in this climate')
                })).describe('3-5 pest priorities for this month and climate')
            }),
            prompt: `You are a pest control industry expert. For ${month} in a ${climate} climate region (e.g. ${climate === 'Temperate' ? 'Northeast US, Midwest' : climate === 'Tropical' ? 'Florida, Gulf Coast' : 'Southwest, desert'}), list the top 3-5 pests that are most active or concerning for homeowners this month. For each, give a brief reason why (seasonal behavior, breeding, migration, etc.). Be specific and practical for pest control marketing.`
        });
        return result.object.pests;
    } catch (error) {
        console.error('Failed to generate seasonal pests', error);
        return [];
    }
}

/** AI-generated content template (reusable, not account-specific) */
export async function generateContentTemplates(count: number = 8): Promise<{ title: string; pest: string; tone: Tone; preview: string; tags: string[] }[]> {
    const tones: Tone[] = ['Educational', 'Urgent', 'Promotional', 'Myth-busting'];
    const commonPests = ['Rodents', 'Mosquitoes', 'Termites', 'Ants', 'Bed Bugs', 'Cockroaches', 'Spiders', 'Wasps', 'Silverfish', 'Stink Bugs'];

    try {
        const result = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: z.object({
                templates: z.array(z.object({
                    title: z.string().describe('Catchy template title'),
                    pest: z.string().describe('Pest type'),
                    tone: z.enum(['Educational', 'Urgent', 'Promotional', 'Myth-busting']),
                    preview: z.string().describe('2-3 sentence preview of the post idea'),
                    tags: z.array(z.string()).describe('3-5 hashtags')
                })).length(count)
            }),
            prompt: `You are a social media expert for pest control companies. Create ${count} unique content template ideas for pest control social posts. Mix different pests (${commonPests.join(', ')}) and tones (Educational, Urgent, Promotional, Myth-busting). Each template should be practical, engaging, and ready for a pest control company to customize with their location/name. Make titles catchy and previews specific.`
        });

        return result.object.templates.map(t => ({
            ...t,
            tags: t.tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        }));
    } catch (error) {
        console.error('Failed to generate content templates', error);
        return [];
    }
}
