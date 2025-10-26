import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  getDocs
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
      // Call Vercel serverless function
      const apiUrl = '/api/send-invite';
      console.log('🔗 API URL:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          organizerName: 'TimeSyncAI',
          organizerEmail: 'noreply@timesyncai.com',
          plan: `You've been invited to join a participant group for meeting scheduling. Click the link below to accept the invitation and connect your calendar to help find the best meeting times for everyone.\n\nInvitation Link: ${invitationLink}`,
          meeting: {
            title: 'Group Invitation - Connect Your Calendar',
            description: 'You\'ve been invited to join a participant group for meeting scheduling. Please accept this invitation to connect your calendar and help find optimal meeting times.',
            location: 'Virtual Meeting',
            startISO: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            endISO: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour duration
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Email service error: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Group invitation email sent successfully:', result.messageId);
      
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
    const invitationRef = doc(db, 'invitations', invitationId);
    await updateDoc(invitationRef, {
      inviteeId,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    });
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
