import { toast } from "sonner";

export type UploadProgressState = {
  percentage: number;
  message: string;
};

export type UploadProgressCallback = (progress: UploadProgressState) => void;

/**
 * Uploads reference images to /api/portfolio/files/upload with real-time byte-level progress tracking.
 */
export async function uploadReferenceImagesWithProgress(
  files: File[],
  bookingId: number,
  onProgress: UploadProgressCallback
): Promise<void> {
  if (!files || files.length === 0) return;

  const totalBytes = files.reduce((sum, f) => sum + Math.max(1, f.size), 0);
  const loadedPerFile = new Array(files.length).fill(0);

  const updateProgress = () => {
    const totalLoaded = loadedPerFile.reduce((sum, b) => sum + b, 0);
    const fraction = totalBytes > 0 ? totalLoaded / totalBytes : 1;
    // Map upload phase between 25% and 92%
    const currentPercent = Math.min(92, Math.round(25 + fraction * 67));
    onProgress({
      percentage: currentPercent,
      message: `Uploading to cloud (${currentPercent}%)...`,
    });
  };

  onProgress({
    percentage: 25,
    message: `Uploading reference ${files.length > 1 ? "images" : "image"} to cloud...`,
  });

  await Promise.all(
    files.map((file, index) => {
      return new Promise<void>((resolve) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("booking_id", String(bookingId));
        formData.append("section", "reference");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/portfolio/files/upload");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            loadedPerFile[index] = event.loaded;
            updateProgress();
          }
        };

        xhr.onload = () => {
          loadedPerFile[index] = file.size;
          updateProgress();

          if (xhr.status === 402) {
            toast.error(`Storage quota exceeded: "${file.name}" was not uploaded.`);
          } else if (xhr.status < 200 || xhr.status >= 300) {
            let msg = `Failed to upload "${file.name}"`;
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.message) msg = res.message;
            } catch {}
            toast.error(msg);
          }
          resolve();
        };

        xhr.onerror = () => {
          console.error(`Network error uploading "${file.name}"`);
          toast.error(`Network error uploading "${file.name}"`);
          resolve();
        };

        xhr.send(formData);
      });
    })
  );

  onProgress({
    percentage: 98,
    message: "Finalizing booking...",
  });

  // Brief pause so 100% transition is visibly clear to the user
  await new Promise((r) => setTimeout(r, 200));

  onProgress({
    percentage: 100,
    message: "Upload complete!",
  });

  await new Promise((r) => setTimeout(r, 350));
}
