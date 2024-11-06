import { NextResponse } from 'next/server';

const TALENT_API_KEY = process.env.TALENT_API_KEY || '';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params?.id) {
      return NextResponse.json(
        { error: 'Builder ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.talentprotocol.com/api/v2/passports/${params.id}`,
      {
        headers: {
          'X-API-KEY': TALENT_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch builder:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to fetch builder details');
    }

    const data = await response.json();
    
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

    return NextResponse.json(builder);
  } catch (error) {
    console.error('Builder fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch builder details' },
      { status: 500 }
    );
  }
} 