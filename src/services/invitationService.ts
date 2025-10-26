import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MeetingInvitation, Meeting } from '../types/firestore';

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
    groupId: string
  ): Promise<void> {
    // For local development, use localhost. For production, this should be your deployed URL
    const baseUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/invite/${token}`;
    
    try {
      // Call your existing backend email service
      const backendUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787'}/api/send-invite`;
      console.log('🔗 Backend URL:', backendUrl);
      console.log('🔗 VITE_BACKEND_URL env var:', import.meta.env.VITE_BACKEND_URL);
      const response = await fetch(backendUrl, {
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

  // Send invitation email using your existing backend service
  private static async sendInvitationEmail(
    email: string, 
    token: string, 
    meetingId: string
  ): Promise<void> {
    // For local development, use localhost. For production, this should be your deployed URL
    const baseUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/invite/${token}`;
    
    try {
      // Call your existing backend email service
      const backendUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787'}/api/send-invite`;
      console.log('🔗 Backend URL (meeting):', backendUrl);
      console.log('🔗 VITE_BACKEND_URL env var (meeting):', import.meta.env.VITE_BACKEND_URL);
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          organizerName: 'TimeSyncAI',
          organizerEmail: 'noreply@timesyncai.com',
          plan: `You've been invited to participate in a meeting scheduling session. Click the link below to accept the invitation and connect your calendar to help find the best meeting time for everyone.\n\nInvitation Link: ${invitationLink}`,
          meeting: {
            title: 'Meeting Invitation - Connect Your Calendar',
            description: 'You\'ve been invited to participate in a meeting scheduling session. Please accept this invitation to connect your calendar and help find the optimal meeting time.',
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
      console.log('Invitation email sent successfully:', result.messageId);
      
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      // For now, just log the invitation link - in production you'd want to retry or notify admin
      console.log(`Invitation link for ${email}: ${invitationLink}`);
      throw error;
    }
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

  // Get invitation email template
  private static getInvitationEmailTemplate(invitationLink: string, meetingId: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to a meeting!</h2>
        <p>Someone has invited you to participate in a meeting scheduling session.</p>
        <p>Click the button below to accept the invitation and connect your calendar:</p>
        <a href="${invitationLink}" 
           style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          This invitation will expire in 7 days. If you didn't expect this invitation, 
          you can safely ignore this email.
        </p>
      </div>
    `;
  }
}
