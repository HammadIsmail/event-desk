// src/services/ticketService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Registration } from '@/types';

function buildTicketHTML(registration: Registration): string {
  const isPaid = registration.payment_status === 'PAID';
  const isPartial = registration.payment_status === 'PARTIAL';
  const isFree = registration.payment_status === 'FREE';

  const statusBadgeColor = isPaid
    ? '#059669' // Green
    : isPartial
    ? '#d97706' // Amber
    : isFree
    ? '#7c3aed' // Purple
    : '#dc2626'; // Red

  const balance = Math.max(0, (registration.total_fee || 0) - (registration.paid_amount || 0));

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    registration.qr_token
  )}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pass - ${registration.reg_no}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
          }
          .ticket-card {
            background: #ffffff;
            width: 100%;
            max-width: 580px;
            border-radius: 18px;
            border: 2px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
          }
          .ticket-header {
            background: #0f172a;
            color: #ffffff;
            padding: 24px;
            text-align: center;
          }
          .society-tag {
            font-size: 11px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #38bdf8;
            font-weight: 800;
            margin-bottom: 4px;
          }
          .event-title {
            font-size: 22px;
            font-weight: 800;
            margin: 0;
            letter-spacing: -0.3px;
          }
          .ticket-badge {
            display: inline-block;
            margin-top: 10px;
            background: ${statusBadgeColor};
            color: white;
            font-weight: 800;
            font-size: 12px;
            padding: 5px 16px;
            border-radius: 20px;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .ticket-body {
            padding: 24px;
          }
          .reg-header {
            text-align: center;
            border-bottom: 2px dashed #cbd5e1;
            padding-bottom: 18px;
            margin-bottom: 20px;
          }
          .reg-number {
            font-size: 30px;
            font-weight: 900;
            letter-spacing: 1.5px;
            color: #0284c7;
            margin: 0;
          }
          .student-name {
            font-size: 19px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 4px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
          }
          .detail-item {
            background: #f8fafc;
            padding: 10px 14px;
            border-radius: 10px;
            border: 1px solid #f1f5f9;
          }
          .detail-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .detail-value {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .qr-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 18px;
            text-align: center;
          }
          .qr-code-img {
            width: 160px;
            height: 160px;
            border-radius: 6px;
          }
          .qr-token {
            font-family: monospace;
            font-size: 11px;
            color: #475569;
            margin-top: 10px;
            word-break: break-all;
          }
          .ticket-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 14px 24px;
            font-size: 11px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="ticket-card">
          <div class="ticket-header">
            <div class="society-tag">Society of Chemical Engineers</div>
            <h1 class="event-title">Official Participant Pass</h1>
            <div class="ticket-badge">${registration.payment_status}</div>
          </div>
          <div class="ticket-body">
            <div class="reg-header">
              <h2 class="reg-number">${registration.reg_no}</h2>
              <div class="student-name">${registration.student_name}</div>
            </div>

            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">Sport / Event</div>
                <div class="detail-value">${registration.sport_name}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Format / Category</div>
                <div class="detail-value">${registration.category_format}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Department</div>
                <div class="detail-value">${registration.department_code}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Session</div>
                <div class="detail-value">${registration.session_year}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Fee Paid</div>
                <div class="detail-value">PKR ${registration.paid_amount}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Balance Due</div>
                <div class="detail-value" style="color: ${balance > 0 ? '#dc2626' : '#059669'}">
                  PKR ${balance}
                </div>
              </div>
            </div>

            ${
              registration.partner_name
                ? `
            <div style="background:#e0f2fe;padding:10px 14px;border-radius:10px;margin-bottom:16px;">
              <div style="font-size:10px;color:#0369a1;font-weight:700;text-transform:uppercase;">Teammate / Partner</div>
              <div style="font-size:13px;color:#0c4a6e;font-weight:800;margin-top:2px;">
                ${registration.partner_name} ${registration.partner_reg_no ? `(${registration.partner_reg_no})` : ''}
              </div>
            </div>`
                : ''
            }

            <div class="qr-section">
              <img class="qr-code-img" src="${qrUrl}" alt="QR Ticket" />
              <div class="qr-token">SCAN TOKEN: ${registration.qr_token}</div>
            </div>
          </div>

          <div class="ticket-footer">
            <div>Desk Officer: <strong>${registration.created_by_username}</strong></div>
            <div>Issued: <strong>${new Date(registration.created_at).toLocaleDateString()}</strong></div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// 1. Direct Save / Export Pass (No print preview screen!)
export async function downloadPassDirectly(registration: Registration): Promise<string> {
  const html = buildTicketHTML(registration);
  const cleanReg = registration.reg_no.replace(/[^A-Za-z0-9_-]/g, '_');
  const filename = `Pass_${cleanReg}.pdf`;

  if (Platform.OS === 'web') {
    const printRes = await Print.printToFileAsync({ html });
    const a = document.createElement('a');
    a.href = printRes.uri;
    a.download = filename;
    a.click();
    return filename;
  }

  // Generate PDF file with base64 data to avoid unreadable cache path issues on Android
  const printRes = await Print.printToFileAsync({ html, base64: true });
  let targetUri = printRes.uri;

  if (printRes.base64) {
    try {
      const localTarget = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(localTarget, printRes.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      targetUri = localTarget;
    } catch {
      targetUri = printRes.uri;
    }
  }

  // Open native bottom sheet with direct Save to Files / WhatsApp / Drive
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(targetUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Pass - ${registration.reg_no}`,
      UTI: 'com.adobe.pdf',
    });
  }

  return targetUri;
}

// 2. Share Pass (opens native share sheet with file:// URI)
export async function shareTicketPDF(registration: Registration): Promise<void> {
  await downloadPassDirectly(registration);
}

// 3. Share or Download CSV file with proper local file:// URI
export async function shareOrDownloadCSV(filename: string, csvContent: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Write directly to document directory with local file:// scheme
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Open native sharing sheet with valid file:// URI
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: filename,
      UTI: 'public.comma-separated-values-text',
    });
  }
}
