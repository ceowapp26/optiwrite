import { NextResponse } from 'next/server';
import emailService, { EmailServiceError } from '@/utils/email/emailService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, message } = body;
    
    if (!name || !email || !message) {
      return NextResponse.json(
        { message: 'Missing required fields: name, email, or message' },
        { status: 400 }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    try {
      await emailService.initialize();
      const textContent = `
        New Contact Form Message
        
        From: ${name}
        Email: ${email}
        Message: ${message}
        
        Please respond to this inquiry at your earliest convenience.
      `.trim();
      const htmlContent = `<!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Contact Form Response</title>
        <style>
          /* Reset styles for email clients */
          body, table, td, div, p {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            line-height: 1.6;
          }
          
          /* Container styles */
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          
          /* Header styles */
          .header {
            background-color: #2563eb;
            padding: 30px;
            text-align: center;
          }
          
          .header h1 {
            color: #ffffff;
            font-size: 24px;
            margin: 0;
          }
          
          /* Content styles */
          .content {
            padding: 20px 0 !important;
            background-color: #ffffff;
          }
          
          .message-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
          }
          
          .info-row {
            margin-bottom: 15px;
          }
          
          .label {
            color: #64748b;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          
          .value {
            color: #1e293b;
            font-size: 16px;
          }
          
          /* Footer styles */
          .footer {
            background-color: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }
          
          /* Responsive styles */
          @media screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
            }
            
            .content {
              padding: 20px 0 !important;
            }
          }
        </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>New Contact Form Message</h1>
            </div>
            
            <div class="content">
              <p>You've received a new message from your contact form.</p>
              
              <div class="message-box">
                <div class="info-row">
                  <div class="label">From</div>
                  <div class="value">${name}</div>
                </div>
                
                <div class="info-row">
                  <div class="label">Email</div>
                  <div class="value">${email}</div>
                </div>
                
                <div class="info-row">
                  <div class="label">Message</div>
                  <div class="value">${message}</div>
                </div>
              </div>
              
              <p>Please respond to this inquiry at your earliest convenience.</p>
            </div>
            
            <div class="footer">
              <p>This email was sent from your website's contact form.</p>
              <p>© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>`;
      
      await emailService.sendCustomEmail(
        email,
        `New Contact Form Message from ${name}`,
        htmlContent
      );

      return NextResponse.json(
        { message: 'Email sent successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Failed to send email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        name,
      });
      if (error instanceof EmailServiceError) {
        const errorDetails = {
          code: error.code,
          message: error.message,
          details: error.details,
        };
        console.error('Email service error details:', errorDetails);
        switch (error.code) {
          case 'DATA_ERROR':
            return NextResponse.json(
              { message: 'Invalid email data provided' },
              { status: 400 }
            );
          case 'TEMPLATE_ERROR':
            return NextResponse.json(
              { message: 'Email template error' },
              { status: 500 }
            );
          case 'SEND_ERROR':
            return NextResponse.json(
              { message: 'Failed to send email' },
              { status: 503 }
            );
          default:
            return NextResponse.json(
              { message: 'Unexpected email service error' },
              { status: 500 }
            );
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error processing the request:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}