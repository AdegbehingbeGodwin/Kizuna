
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateReminderMessage = async (
  petName: string,
  clinicName: string,
  bookingLink: string,
  type: 'vaccination' | 'checkup'
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a friendly, professional WhatsApp reminder for a pet owner.
      Pet Name: ${petName}
      Clinic: ${clinicName}
      Booking Link: ${bookingLink}
      Reminder Type: ${type === 'vaccination' ? 'Vaccination' : 'Annual Checkup'}
      
      Keep it under 150 characters. Use a warm tone. Include the link.`,
      config: {
        temperature: 0.7,
        topP: 0.8,
      }
    });

    return response.text || `Hi! ${petName} is due for a ${type}. Book now at ${clinicName}: ${bookingLink}`;
  } catch (error) {
    console.error("Error generating message:", error);
    return `Hi! ${petName} is due for a ${type}. Book now at ${clinicName}: ${bookingLink}`;
  }
};

export const getAnalyticsSummary = async (stats: any): Promise<string> => {
  try {
    const response = await fetch("http://127.0.0.1:5000/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats })
    });
    const data = await response.json();
    return data.summary || "Keep up the good work! Increasing your reminders could lead to even more bookings.";
  } catch (error) {
    return "Great performance this month!";
  }
};
