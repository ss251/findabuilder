import { NextResponse } from 'next/server';

const GALADRIEL_API_KEY = process.env.GALADRIEL_API_KEY || '';
const TALENT_API_KEY = process.env.TALENT_API_KEY || '';

interface SearchFilters {
  searchByName: boolean;
  name: string;
  minScore: number | null;
  searchById: boolean;
  id: string;
}

interface PassportProfile {
  image_url: string;
  name: string;
  bio: string;
  display_name: string;
  location: string | null;
  tags: string[];
}

interface PassportSocial {
  profile_name: string;
  source: string;
}

interface PassportResult {
  score: number;
  passport_id: number;
  verified: boolean;
  activity_score: number;
  identity_score: number;
  skills_score: number;
  human_checkmark: boolean;
  main_wallet: string;
  passport_profile: PassportProfile;
  passport_socials: PassportSocial[];
  verified_wallets: string[];
  credentials?: PassportCredential[];
}

interface PassportCredential {
  earned_at: string;
  id: string;
  category: string;
  last_calculated_at: string;
  name: string;
  score: number;
  type: string;
  value: string;
  max_score: number;
}

interface PassportsResponse {
  passports: PassportResult[];
  pagination: {
    current_page: number;
    last_page: number;
    total: number;
  };
}


const processQuery = async (query: string): Promise<SearchFilters> => {
  try {
    const response = await fetch('https://api.galadriel.com/v1/chat/completions', {
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
            content: `Extract search parameters from queries about web3 builders.
            Return JSON with:
            - searchByName (boolean): true if query is looking for specific person/username
            - name (string): the name/username to search for
            - minScore (number | null): minimum score if specified
            - searchById (boolean): true if query contains passport ID or wallet address
            - id (string): the passport ID or wallet address if present
            
            Examples:
            "find thescoho" -> {"searchByName":true,"name":"thescoho","minScore":null,"searchById":false,"id":""}
            "show me 0x09928cebb4c977c5e5db237a2a2ce5cd10497cb8" -> {"searchByName":false,"name":"","minScore":null,"searchById":true,"id":"0x09928cebb4c977c5e5db237a2a2ce5cd10497cb8"}
            "get passport 794066" -> {"searchByName":false,"name":"","minScore":null,"searchById":true,"id":"794066"}`
          },
          { role: "user", content: query }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    console.log('LLM response:', data.choices[0].message.content);
    
    try {
      const parsed = JSON.parse(data.choices[0].message.content);
      
      // Convert string values to proper types
      return {
        searchByName: parsed.searchByName === "true",
        name: String(parsed.name || ""),
        minScore: parsed.minScore === "null" ? null : Number(parsed.minScore),
        searchById: parsed.searchById === "true",
        id: String(parsed.id || "")
      };
    } catch (e) {
      console.error('Failed to parse LLM response:', e);
      return { searchByName: false, name: '', minScore: null, searchById: false, id: '' };
    }
  } catch (e) {
    console.error('LLM API error:', e);
    return { searchByName: false, name: '', minScore: null, searchById: false, id: '' };
  }
};

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    console.log('Received query:', query);

    const filters = await processQuery(query);
    console.log('Processed filters:', filters);

    if (filters.searchById && filters.id) {
      const isWallet = filters.id.startsWith('0x');
      const endpoint = isWallet ? filters.id : filters.id;
      
      console.log('Searching by ID:', endpoint);

      const response = await fetch(
        `https://api.talentprotocol.com/api/v2/passports/${endpoint}`,
        {
          headers: {
            'X-API-KEY': TALENT_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch passport');
      }

      const data = await response.json();
      console.log('Found passport by ID');

      const builder = {
        id: data.passport.main_wallet,
        name: data.passport.passport_profile.display_name,
        description: data.passport.passport_profile.bio,
        activity_score: data.passport.activity_score,
        identity_score: data.passport.identity_score,
        skills_score: data.passport.skills_score,
        score: data.passport.score,
        human_checkmark: data.passport.human_checkmark,
        location: data.passport.passport_profile.location || 'Remote',
        tags: data.passport.passport_profile.tags,
        image_url: data.passport.passport_profile.image_url,
        socials: data.passport.passport_socials,
        verified_wallets: data.passport.verified_wallets,
        verified: data.passport.verified,
        credentials: data.passport.credentials || []
      };

      return NextResponse.json({
        content: `Found builder ${builder.name}`,
        builders: [builder]
      });
    }

    const searchParams = new URLSearchParams({
      per_page: '40'
    });

    if (filters.searchByName && filters.name) {
      const searchName = filters.name.replace(/\.eth$/i, '').replace('@', '');
      searchParams.append('keyword', searchName);
      console.log('Searching by name:', searchName);
    }

    console.log('Search params:', searchParams.toString());

    const buildersResponse = await fetch(
      `https://api.talentprotocol.com/api/v2/passports?${searchParams.toString()}`,
      {
        headers: {
          'X-API-KEY': TALENT_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!buildersResponse.ok) {
      console.error('Builders API error:', {
        status: buildersResponse.status,
        statusText: buildersResponse.statusText
      });
      throw new Error('Failed to fetch builders');
    }

    const buildersData = await buildersResponse.json() as PassportsResponse;
    console.log('Total builders found:', buildersData.passports.length);

    const topBuilders = buildersData.passports
      .filter(builder => {
        console.log('Checking builder:', {
          name: builder.passport_profile.display_name,
          score: builder.score,
          minScoreRequired: filters.minScore
        });
        return !filters.minScore || builder.score >= filters.minScore;
      })
      .sort((a, b) => b.score - a.score);

    console.log('Filtered and sorted builders:', topBuilders.map(b => ({
      name: b.passport_profile.display_name,
      score: b.score,
      meetsScoreRequirement: !filters.minScore || b.score >= filters.minScore
    })));

    const buildersWithCredentials = topBuilders.map((passport: PassportResult) => ({
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
      socials: passport.passport_socials,
      verified_wallets: passport.verified_wallets,
      verified: passport.verified,
      credentials: passport.credentials || []
    }));

    const validBuilders = buildersWithCredentials;
    console.log('Final builders count:', validBuilders.length);

    const content = validBuilders.length > 0
      ? `Found ${validBuilders.length} builders with score ${filters.minScore ? `>= ${filters.minScore}` : ''}, sorted by highest score`
      : 'No builders found matching your criteria. Try broadening your search.';

    return NextResponse.json({
      content,
      builders: validBuilders
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to process search' },
      { status: 500 }
    );
  }
} 