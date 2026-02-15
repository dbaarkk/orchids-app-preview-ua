import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!lat || !lng) {
      return NextResponse.json({ status: 'INVALID_REQUEST', message: 'Missing lat/lng' }, { status: 400 });
    }

    if (!apiKey) {
      console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined');
      return NextResponse.json({ status: 'ERROR', message: 'API key missing' }, { status: 500 });
    }

    const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Server-side geocode error:', error);
    return NextResponse.json({ status: 'ERROR', message: error.message }, { status: 500 });
  }
}
