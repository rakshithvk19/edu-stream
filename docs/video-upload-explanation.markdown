# Video Upload Feature Explanation

![Video Upload Workflow](./images/video-upload.png)


The video upload feature allows users to upload video files through a simple interface. Here's how it works:

1. **User Interaction**: The user fills in the title and description, selects a video file, and clicks "Upload Video" on the upload page.
2. **Validation**: The system validates the input, ensuring a title and file are provided, then sends a POST request to the `create-upload` API endpoint.
3. **API Processing**: The API creates a direct upload URL and returns it along with an upload ID. This URL is used to upload the video file directly to the Mux Video Service.
4. **Upload Process**: The MuxUploader component handles the file upload, dispatching progress events to update a progress bar and showing the upload percentage.
5. **Database Update**: Once the upload starts, a record is inserted into the Supabase database with the status set to "uploading".
6. **Webhook Handling**: After upload, the WebhookHandler receives notifications from Mux. It processes the video (encoding, thumbnails), and sends updates via POST requests:
   - `video.upload_asset.created`: Updates status to "processing".
   - `video.asset.ready`: Updates with playback ID, duration, thumbnail URL, and status to "ready".
7. **User Feedback**: On success, a success message is shown, and the form resets for the next upload. In error scenarios (e.g., upload error, cancellation), an error message is displayed, and the state resets.
8. **Error Handling**: If an error occurs (e.g., upload fails or is cancelled), the WebhookHandler updates the status to "error" or "cancelled" in the database.

This flow ensures a seamless upload experience with real-time progress and robust error handling.