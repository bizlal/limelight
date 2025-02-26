// // pages/api/audius/uploadTrack.js
// import nc from 'next-connect';
// import { IncomingForm } from 'formidable';
// import fs from 'fs';
// import { Mood, Genre } from '@audius/sdk';
// import { audiusSdk } from '@/api-lib/AudiusSDK'; // adjust this path as needed

// export const config = {
//   api: {
//     bodyParser: false, // Disable Next.js built-in body parsing so formidable can handle it.
//   },
// };

// const handler = nc();

// handler.post(async (req, res) => {
//   const form = new IncomingForm({ keepExtensions: true });

//   form.parse(req, async (err, fields, files) => {
//     if (err) {
//       console.error('Form parse error:', err);
//       return res.status(500).json({ error: 'Failed to parse form data' });
//     }

//     try {
//       const userId = fields.userId || 'defaultUserId';

//       // Ensure both coverArtFile and trackFile are provided
//       if (!files.coverArtFile || !files.trackFile) {
//         return res
//           .status(400)
//           .json({ error: 'Missing cover art or track file' });
//       }

//       // Read files from their temporary paths
//       const coverArtBuffer = fs.readFileSync(files.coverArtFile.filepath);
//       const trackBuffer = fs.readFileSync(files.trackFile.filepath);

//       // Build metadata from fields
//       const metadata = {
//         title: fields.title || 'Untitled Track',
//         genre: fields.genre ? fields.genre : Genre.UNKNOWN,
//         description: fields.description || '',
//         mood: fields.mood ? fields.mood : Mood.UNKNOWN,
//         releaseDate: fields.releaseDate
//           ? new Date(fields.releaseDate)
//           : new Date(),
//         tags: fields.tags || '',
//         remixOf: fields.remixOf ? JSON.parse(fields.remixOf) : undefined,
//         aiAttributionUserId: fields.aiAttributionUserId || '',
//         isStreamGated: fields.isStreamGated === 'true',
//         streamConditions: fields.streamConditions
//           ? JSON.parse(fields.streamConditions)
//           : undefined,
//         isDownloadGated: fields.isDownloadGated === 'true',
//         downloadConditions: fields.downloadConditions
//           ? JSON.parse(fields.downloadConditions)
//           : undefined,
//         isUnlisted: fields.isUnlisted === 'true',
//         fieldVisibility: fields.fieldVisibility
//           ? JSON.parse(fields.fieldVisibility)
//           : undefined,
//         isrc: fields.isrc || '',
//         iswc: fields.iswc || '',
//         license: fields.license || '',
//       };

//       // Call Audius SDK's uploadTrack method
//       const { trackId } = await audiusSdk.tracks.uploadTrack({
//         userId,
//         coverArtFile: {
//           buffer: Buffer.from(coverArtBuffer),
//           name: 'coverArt',
//         },
//         metadata,
//         trackFile: {
//           buffer: Buffer.from(trackBuffer),
//           name: 'trackAudio',
//         },
//       });

//       return res.status(200).json({ trackId });
//     } catch (uploadError) {
//       console.error('Error uploading track:', uploadError);
//       return res
//         .status(500)
//         .json({ error: uploadError.message || 'Failed to upload track' });
//     }
//   });
// });

// export default handler;
