import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { sendRegistrationConfirmation } from '@/lib/email';

// Ensure Firebase Admin is initialized
firebaseAdmin;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventId,
      handlerName,
      handlerEmail,
      dogName,
      agency,
      specialties,
      additionalInfo,
    } = body;

    // Validation
    if (!eventId || !handlerName || !handlerEmail || !dogName || !agency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(handlerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Verify event exists
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Create registration document
    const registrationData = {
      eventId,
      eventName: eventDoc.data()?.name || 'Unknown Event',
      handlerName,
      handlerEmail: handlerEmail.toLowerCase().trim(),
      dogName,
      agency,
      specialties: specialties || [],
      additionalInfo: additionalInfo || '',
      status: 'pending', // pending, approved, rejected
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const registrationRef = await db.collection('registrations').add(registrationData);

    console.log('Registration created:', {
      id: registrationRef.id,
      eventId,
      handler: handlerName,
      email: handlerEmail,
    });

    // Send confirmation email
    await sendRegistrationConfirmation({
      to: handlerEmail,
      handlerName,
      dogName,
      eventName: eventDoc.data()?.name || 'Unknown Event',
      eventId,
    });

    return NextResponse.json({
      success: true,
      registrationId: registrationRef.id,
      message: 'Registration submitted successfully',
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch registrations (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Fetch all registrations for the event
    const registrationsSnapshot = await db
      .collection('registrations')
      .where('eventId', '==', eventId)
      .orderBy('submittedAt', 'desc')
      .get();

    const registrations = registrationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      registrations,
    });

  } catch (error: any) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
