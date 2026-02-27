export type Climate = 'Tropical' | 'Dry' | 'Temperate';
export type Month =
    | 'January' | 'February' | 'March' | 'April' | 'May' | 'June'
    | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';

export interface PestPriority {
    pest: string;
    reason: string;
}

const SEASONAL_DATA: Record<Climate, Record<string, PestPriority[]>> = {
    'Tropical': {
        'January': [
            { pest: 'Mosquitoes', reason: 'High humidity breeding' },
            { pest: 'Cockroaches', reason: 'Year-round activity' }
        ],
        'February': [
            { pest: 'Mosquitoes', reason: 'Continued wet season' },
            { pest: 'Termites', reason: 'Early swarmers' }
        ],
        'June': [
            { pest: 'Mosquitoes', reason: 'Peak breeding season' },
            { pest: 'Termites', reason: 'Swarming season' },
            { pest: 'Cockroaches', reason: 'High activity' }
        ],
        // ... extend for other months
        'default': [
            { pest: 'General Pests', reason: 'Routine maintenance' }
        ]
    },
    'Dry': {
        'June': [
            { pest: 'Scorpions', reason: 'Summer heat activity' },
            { pest: 'Ants', reason: 'Seeking water indoors' }
        ],
        'default': [
            { pest: 'Spiders', reason: 'Dry climate common' }
        ]
    },
    'Temperate': {
        'January': [
            { pest: 'Rodents', reason: 'Seeking warmth indoors' },
            { pest: 'Spiders', reason: 'Overwintering' }
        ],
        'February': [
            { pest: 'Rodents', reason: 'Continued cold seeking warmth' },
            { pest: 'Silverfish', reason: 'Indoor humidity' }
        ],
        'March': [
            { pest: 'Ants', reason: 'Spring foraging' },
            { pest: 'Termites', reason: 'Start of swarm season' }
        ],
        'April': [
            { pest: 'Ants', reason: 'High activity' },
            { pest: 'Mosquitoes', reason: 'Early season larval activity' }
        ],
        'May': [
            { pest: 'Ticks', reason: 'Outdoor activity peak' },
            { pest: 'Mosquitoes', reason: 'Adult emergence' }
        ],
        'June': [
            { pest: 'Mosquitoes', reason: 'Summer peak' },
            { pest: 'Ants', reason: 'Colony expansion' },
            { pest: 'Wasps', reason: 'Nest building' }
        ],
        'July': [
            { pest: 'Mosquitoes', reason: 'High heat activity' },
            { pest: 'Wasps', reason: 'Aggressive behavior' },
            { pest: 'Flies', reason: 'Garbage/Heat association' }
        ],
        'August': [
            { pest: 'Wasps', reason: 'Peak colony size' },
            { pest: 'Mosquitoes', reason: 'Late summer peak' }
        ],
        'September': [
            { pest: 'Rodents', reason: 'Early seeking of winter shelter' },
            { pest: 'Spiders', reason: 'Mating season' }
        ],
        'October': [
            { pest: 'Rodents', reason: 'Active ingress to structures' },
            { pest: 'Stink Bugs', reason: 'Overwintering entry' }
        ],
        'November': [
            { pest: 'Rodents', reason: 'Established indoor nesting' },
            { pest: 'Cockroaches', reason: 'Seeking warmth' }
        ],
        'December': [
            { pest: 'Rodents', reason: 'Indoor nesting' },
            { pest: 'Spiders', reason: 'Indoor sightings' }
        ],
        'default': [
            { pest: 'General Pests', reason: 'Preventative care' }
        ]
    }
};

export function getPriorityPests(month: Month, climate: Climate): PestPriority[] {
    const climateData = SEASONAL_DATA[climate];
    if (!climateData) return [];

    return climateData[month] || climateData['default'] || [];
}

export function determineClimate(location: string): Climate {
    const loc = location.toLowerCase();

    // Simple keyword matching for MVP
    if (loc.includes('miami') || loc.includes('florida') || loc.includes('fl') || loc.includes('houston')) {
        return 'Tropical';
    }

    if (loc.includes('arizona') || loc.includes('phoenix') || loc.includes('vegas') || loc.includes('nevada') || loc.includes('nm')) {
        return 'Dry';
    }

    // Default to Temperate (covers New York, most of US)
    // Explicitly check for NY to be safe/clear
    if (loc.includes('new york') || loc.includes('ny') || loc.includes('austin') || loc.includes('tx')) {
        return 'Temperate';
    }

    return 'Temperate';
}
