import { NextResponse } from 'next/server';

const GALADRIEL_API_KEY = process.env.GALADRIEL_API_KEY || '';
const TALENT_API_KEY = process.env.TALENT_API_KEY || '';

interface SearchParams {
  location?: string;
  skills?: string[];
  minScore?: number;
}

interface TalentPassport {
  passport_profile: {
    location: string | null;
    tags: string[];
    display_name: string;
    bio: string;
    image_url: string;
    name: string;
  };
  score: number;
  activity_score: number;
  identity_score: number;
  skills_score: number;
  human_checkmark: boolean;
  main_wallet: string;
  verified: boolean;
  verified_wallets: string[];
}

interface TalentPassportsResponse {
  passports: TalentPassport[];
}

interface GaladrielResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    // 1. Get structured filters from Galadriel
    const filtersResponse = await fetch('https://api.galadriel.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GALADRIEL_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3.1:70b",
        messages: [
          { 
            role: "system", 
            content: "Extract search parameters from the query. Return a JSON object with location (string), skills (array of strings), and minScore (number). Example: {\"location\":\"Asia\",\"skills\":[\"Solidity\",\"TypeScript\"],\"minScore\":90}" 
          },
          { role: "user", content: query }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!filtersResponse.ok) throw new Error('Failed to process query');
    const filtersData = await filtersResponse.json() as GaladrielResponse;
    const filters = JSON.parse(filtersData.choices[0].message.content) as SearchParams;

    console.log('env: ', process.env.TALENT_API_KEY);

    // 2. Get builders from Talent API with correct header
    const buildersResponse = await fetch('https://api.talentprotocol.com/api/v2/passports', {
      method: 'GET',
      headers: {
        'X-API-KEY': TALENT_API_KEY,
      }
    });

    console.log('buildersResponse: ', buildersResponse);

    if (!buildersResponse.ok) {
      const errorText = await buildersResponse.text();
      console.error('Talent API Error:', {
        status: buildersResponse.status,
        statusText: buildersResponse.statusText,
        body: errorText
      });
      throw new Error(`Failed to fetch builders: ${buildersResponse.status} ${buildersResponse.statusText}`);
    }

    const buildersData = await buildersResponse.json() as TalentPassportsResponse;

    // Add logging for filters and response data
    console.log('Filters from Galadriel:', filters);
    console.log('First passport from response:', buildersData.passports[0]);

    // 3. Get credentials for filtered builders
    const filteredBuilders = buildersData.passports
      .filter((passport) => {
        // Log each passport being processed
        console.log('Processing passport:', {
          display_name: passport.passport_profile.display_name,
          location: passport.passport_profile.location,
          tags: passport.passport_profile.tags,
          score: passport.score
        });

        // More lenient location check
        const locationMatch = !filters.location || 
          !passport.passport_profile.location || // Accept if location is null/undefined
          passport.passport_profile.location.toLowerCase().includes(filters.location.toLowerCase());

        // More defensive skills check
        const skillsMatch = !filters.skills || !Array.isArray(filters.skills) || !filters.skills.length || 
          filters.skills.some(skill => 
            passport.passport_profile.tags.some(tag => 
              tag.toLowerCase().includes(skill.toLowerCase())
            )
          );

        const scoreMatch = !filters.minScore || 
          passport.score >= filters.minScore;

        // Log the match results
        console.log('Match results:', {
          passport: passport.passport_profile.display_name,
          locationMatch,
          skillsMatch,
          scoreMatch
        });

        return locationMatch && skillsMatch && scoreMatch;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Log filtered results
    console.log('Filtered builders:', filteredBuilders.map(b => ({
      name: b.passport_profile.display_name,
      score: b.score
    })));

    const buildersWithCredentials = await Promise.all(
      filteredBuilders.map(async (passport) => {
        const credentialsResponse = await fetch('https://api.talentprotocol.com/api/v2/passport_credentials', {
          method: 'GET',
          headers: {
            'X-API-KEY': TALENT_API_KEY,
          }
        });

        if (!credentialsResponse.ok) throw new Error('Failed to fetch credentials');
        const credentials = await credentialsResponse.json();

        return {
          id: passport.main_wallet,
          name: passport.passport_profile.display_name,
          description: passport.passport_profile.bio,
          activity_score: passport.activity_score,
          identity_score: passport.identity_score,
          skills_score: passport.skills_score,
          score: passport.score,
          human_checkmark: passport.human_checkmark,
          location: passport.passport_profile.location || 'Remote',
          tags: passport.passport_profile.tags,
          image_url: passport.passport_profile.image_url,
          credentials: credentials.passport_credentials
        };
      })
    );

    // 4. Generate explanation with Galadriel
    const explanationResponse = await fetch('https://api.galadriel.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GALADRIEL_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3.1:70b",
        messages: [
          { 
            role: "system", 
            content: "Generate a concise explanation of the search results based on the filters used and builders found." 
          },
          { 
            role: "user", 
            content: `Filters: ${JSON.stringify(filters)}\nBuilders found: ${buildersWithCredentials.length}\nTop builder score: ${buildersWithCredentials[0]?.score}` 
          }
        ],
        temperature: 0.7
      })
    });

    if (!explanationResponse.ok) throw new Error('Failed to generate explanation');
    const explanationData = await explanationResponse.json() as GaladrielResponse;

    return NextResponse.json({
      content: explanationData.choices[0].message.content,
      builders: buildersWithCredentials
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to process search' },
      { status: 500 }
    );
  }
} 