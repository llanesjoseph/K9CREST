
'use server';
/**
 * @fileOverview An AI agent that invites a new user to the platform.
 *
 * - inviteUser - Creates a user, sets their role via custom claims, and saves their info to Firestore.
 * - InviteUserInput - The input type for the inviteUser function.
 * - InviteUserOutput - The return type for the inviteUser function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

const InviteUserInputSchema = z.object({
  email: z.string().email().describe('The email address of the user to invite.'),
  role: z.enum(['admin', 'judge', 'competitor', 'spectator']).describe('The role to assign to the new user.'),
});
export type InviteUserInput = z.infer<typeof InviteUserInputSchema>;

const InviteUserOutputSchema = z.object({
  uid: z.string().describe('The unique ID of the newly created user.'),
  email: z.string().email().describe('The email of the invited user.'),
  role: z.string().describe('The role assigned to the user.'),
});
export type InviteUserOutput = z.infer<typeof InviteUserOutputSchema>;


export async function inviteUser(
  input: InviteUserInput
): Promise<InviteUserOutput> {
  return inviteUserFlow(input);
}


const inviteUserFlow = ai.defineFlow(
  {
    name: 'inviteUserFlow',
    inputSchema: InviteUserInputSchema,
    outputSchema: InviteUserOutputSchema,
  },
  async ({ email, role }) => {
    try {
      const auth = getAuth();
      
      // 1. Create the user in Firebase Authentication
      const userRecord = await auth.createUser({
        email,
        emailVerified: false, // They will verify by setting password
      });
      
      // 2. Set custom claims to assign the role
      await auth.setCustomUserClaims(userRecord.uid, { role });

      // 3. Create a user profile document in Firestore
      const userDocRef = adminDb.collection('users').doc(userRecord.uid);
      await userDocRef.set({
        email,
        role,
        uid: userRecord.uid,
        status: 'pending', // User has been invited but hasn't logged in yet
        createdAt: new Date().toISOString(),
      });
      
      // 4. Send an invitation email with a password reset link
      // This allows the user to set their own password for the first time.
      const passwordResetLink = await auth.generatePasswordResetLink(email);

      const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT),
          secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for other ports
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
      });

      const mailOptions = {
          from: process.env.EMAIL_FROM,
          to: email,
          subject: 'You have been invited to the K9 Trial Platform!',
          html: `
            <h1>Welcome!</h1>
            <p>You have been invited to join the K9 Trial Platform as a ${role}.</p>
            <p>Please click the link below to set your password and activate your account:</p>
            <a href="${passwordResetLink}" target="_blank" rel="noopener noreferrer">Set Your Password</a>
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
          `,
      };

      await transporter.sendMail(mailOptions);
      
      return {
        uid: userRecord.uid,
        email: userRecord.email!,
        role,
      };

    } catch (error: any) {
      console.error("Error in inviteUserFlow: ", error);
      if (error.code === 'auth/email-already-exists') {
        throw new Error(`A user with the email ${email} already exists.`);
      }
      throw new Error(`Failed to create or invite user: ${error.message}`);
    }
  }
);
