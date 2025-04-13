import {onDocumentCreated} from "firebase-functions/v2/firestore";
import axios from "axios";
import FormData from "form-data";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Triggered when a new document is added to the
 * 'pendingAudiusUploads' collection.
 */
export const processAudiusUpload2 = onDocumentCreated(
  "pendingAudiusUploads2/{docId}",
  async (event) => {
    // Retrieve document snapshot data.
    const data = event.data?.data();
    const docId = event.params.docId; // Extract the route parameter.

    if (!data || !data.userId) {
      console.error(
        "Missing document data or required field \"userId\".",
        {docId},
      );
      return;
    }

    // Destructure the fields from document data.
    const {userId, trackUrl, coverArtUrl, metadata} = data;

    // Prepare multipart form data using form-data library.
    const form = new FormData();
    form.append("userId", userId);

    if (trackUrl) {
      form.append("trackUrl", trackUrl);
    }
    if (coverArtUrl) {
      form.append("coverUrl", coverArtUrl);
    }

    // Process metadata: ensure valid object and add as strings.
    if (metadata && typeof metadata === "object") {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          form.append(key, value.toString());
        }
      });
    } else {
      console.warn("Metadata field is missing or invalid.", {docId});
    }

    // Set the API endpoint URL.
    const endpointUrl = "https://www.lmlt.ai/api/uploadAudius";

    try {
      // Extract headers for multipart form data.
      const headers = form.getHeaders();

      // Make the POST request with a timeout option.
      const response = await axios.post(endpointUrl, form, {
        headers,
        timeout: 10000, // in milliseconds
      });

      console.log("Audius upload processed successfully.", {
        docId,
        responseData: response.data,
      });

      // Optionally, update the document to indicate processing is complete.
      // await admin.firestore().doc(`pendingAudiusUploads/${docId}`).update({
      //   processed: true,
      //   processedAt: admin.firestore.FieldValue.serverTimestamp(),
      // });

      return response.data;
    } catch (error) {
      console.error("Error processing Audius upload", {
        docId,
        error: error instanceof Error ? error.message : error,
      });
      // Optionally, update the document with error details.
      // eslint-disable-next-line max-len
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await admin.firestore()
        .doc(`pendingAudiusUploads/${docId}`)
        .update({error: errorMessage});
      return null;
    }
  },
);
