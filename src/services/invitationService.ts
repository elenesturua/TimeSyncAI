import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MeetingInvitation } from '../types/firestore';

export class InvitationService {
  // Create invitation for a group participant
  static async createGroupInvitation(
    groupId: string,
    inviterId: string,
    inviteeEmail: string
  ): Promise<string> {
    const invitationToken = this.generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const invitationData: Omit<MeetingInvitation, 'id'> = {
      meetingId: groupId, // Using meetingId field to store groupId
      inviterId,
      inviteeEmail,
      status: 'pending',
      invitationToken,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const docRef = await addDoc(collection(db, 'invitations'), invitationData);
    
    // Send group invitation email
    await this.sendGroupInvitationEmail(inviteeEmail, invitationToken, groupId);
    
    return docRef.id;
  }

  // Send group invitation email
  private static async sendGroupInvitationEmail(
    email: string,
    token: string,
    _groupId: string
  ): Promise<void> {
    // For local development, use localhost. For production, this should be your deployed URL
    const baseUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/invite/${token}`;
    
    try {
      // Call Vercel serverless function (works in both dev and production)
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const backendUrl = isDevelopment ? 'http://localhost:3001/api/send-invite' : '/api/send-invite';
      console.log('🔗 Calling API:', backendUrl);
      console.log('📧 Sending invitation to:', email);
      console.log('🔗 Invitation link:', invitationLink);
      
      const emailPayload = {
        to: email,
        organizerName: 'TimeSyncAI',
        organizerEmail: 'noreply@timesyncai.com',
        plan: `You've been invited to join a participant group for meeting scheduling.\n\nInvitation Link: ${invitationLink}\n\nPlease click the link to accept the invitation and connect your calendar to help find the best meeting times for everyone.`,
        meeting: {
          title: 'Group Invitation - Join TimeSyncAI',
          description: 'You\'ve been invited to join a participant group for meeting scheduling. Please click the invitation link to accept and connect your calendar.',
          location: 'Virtual Meeting',
          startISO: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          endISO: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour duration
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        textOnly: true // Send plain text email without ICS attachment
      };
      
      console.log('📦 Email payload:', JSON.stringify(emailPayload, null, 2));
      
      console.log('📤 Sending fetch request to backend...');
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      });

      console.log('📬 Response received. Status:', response.status, response.statusText);
      console.log('📬 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('❌ Error response data:', errorData);
        throw new Error(`Email service error: ${errorData.error || 'Unknown error'} (Status: ${response.status})`);
      }

      const result = await response.json();
      console.log('✅ Group invitation email sent successfully:', result);
      console.log('✅ Message ID:', result.messageId);
      
    } catch (error) {
      console.error('Failed to send group invitation email:', error);
      console.log(`Group invitation link for ${email}: ${invitationLink}`);
      throw error;
    }
  }

  // Generate unique invitation token
  private static generateInvitationToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }


  // Get invitation by token
  static async getInvitationByToken(token: string): Promise<MeetingInvitation | null> {
    const q = query(
      collection(db, 'invitations'),
      where('invitationToken', '==', token),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as MeetingInvitation;
  }

  // Accept invitation
  static async acceptInvitation(
    invitationId: string, 
    inviteeId: string
  ): Promise<void> {
    // Get the invitation data
    const invitationDoc = await getDoc(doc(db, 'invitations', invitationId));
    const invitationData = invitationDoc.data();
    
    if (!invitationData) {
      throw new Error('Invitation not found');
    }
    
    const groupId = invitationData.meetingId || invitationData.groupId;
    
    if (!groupId) {
      throw new Error('Group ID not found in invitation');
    }
    
    // Update invitation status
    const invitationRef = doc(db, 'invitations', invitationId);
    await updateDoc(invitationRef, {
      inviteeId,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    });
    
    // Add user to group's participants
    const groupRef = doc(db, 'participantGroups', groupId);
    const groupDoc = await getDoc(groupRef);
    const groupData = groupDoc.data();
    const currentParticipants = groupData?.participants || [];
    
    if (!currentParticipants.includes(inviteeId)) {
      await updateDoc(groupRef, {
        participants: [...currentParticipants, inviteeId],
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ User added to group participants');
    }
  }

  // Get pending invitations for a user
  static async getPendingInvitations(email: string): Promise<MeetingInvitation[]> {
    const q = query(
      collection(db, 'invitations'),
      where('inviteeEmail', '==', email),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MeetingInvitation[];
  }

}
