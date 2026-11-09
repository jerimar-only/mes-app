# Google Drive setup for MES (case documents)

Same pattern as the PDF merger: **local form → upload API → Google Drive**, with connection managed in **Settings**.

## 1. Google Cloud (one-time)

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable **Google Drive API**
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URI:  
     `https://YOUR-MES-DOMAIN/api/google/callback`  
     (local: `http://localhost:3000/api/google/callback`)
5. Copy **Client ID** and **Client secret**

## 2. Environment variables

Add to `.env`:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

(Use your production URL for `GOOGLE_REDIRECT_URI` in production.)

Also ensure `googleapis` is installed:

```
npm install googleapis
```

## 3. Database

Add a key/value settings table (Prisma):

```prisma
model Setting {
  key   String @id
  value String
}
```

On the apprehension / record model, add a nullable URL field, e.g.:

```prisma
caseDocumentsUrl  String?
```

Then run your usual migrate / `prisma db push`.

Wire `caseDocumentsUrl` in create/update actions so the value from the form is saved.

## 4. In the app (Super Admin)

1. Open **Google Drive** in the sidebar (Administration)
2. Click **Connect Google** and sign in with the account that owns the docs folder
3. Paste the **parent folder** link (Restricted sharing recommended) → **Save folder**
4. Status should show **Ready**

## 5. Staff usage

On **Log new apprehension** (and later on edit):

- Use **Upload to Google Drive** under Case documents
- File goes into the parent folder (optional per-case subfolder if you pass `caseLabel`)
- Drive link is stored on the record (`caseDocumentsUrl`)

## Files added

| Path | Role |
|------|------|
| `lib/googleSettings.ts` | OAuth + Setting get/set |
| `lib/drive.ts` | Resumable upload + create folder |
| `app/api/google/connect` | Start OAuth |
| `app/api/google/callback` | Store tokens |
| `app/api/settings` | Parent folder + disconnect |
| `app/api/drive/upload` | Upload case file → Drive |
| `app/(app)/settings/page.tsx` | Settings UI |
| `components/settings/GoogleDriveSettings.tsx` | Connect / folder UI |
| `components/ui/CaseDocumentsUpload.tsx` | Upload control on forms |

## Security

- Prefer **Restricted** folder sharing (dedicated account + staff who must open scans)
- Avoid “Anyone with the link” for case scans
- Only Super Admin can connect/disconnect Google and set the parent folder
