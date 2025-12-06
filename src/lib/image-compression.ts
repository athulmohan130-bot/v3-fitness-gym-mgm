import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
}

/**
 * Compresses an image file to reduce its size while maintaining quality
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise<string> - Base64 data URL of the compressed image
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const defaultOptions = {
    maxSizeMB: 0.5, // 500KB max
    maxWidthOrHeight: 800, // Max dimension 800px
    useWebWorker: true,
    quality: 0.8, // 80% quality
    ...options,
  };

  try {
    // Compress the image
    const compressedFile = await imageCompression(file, defaultOptions);
    
    // Convert to base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('Failed to read compressed file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error('Failed to compress image');
  }
}

/**
 * Compresses a canvas element to a base64 data URL
 * @param canvas - The canvas element containing the image
 * @param options - Compression options
 * @returns Promise<string> - Base64 data URL of the compressed image
 */
export async function compressCanvas(
  canvas: HTMLCanvasElement,
  options: CompressionOptions = {}
): Promise<string> {
  const defaultOptions = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 800,
    useWebWorker: true,
    quality: 0.8,
    ...options,
  };

  try {
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        'image/jpeg', // Use JPEG for better compression
        0.9 // Initial quality before further compression
      );
    });

    // Convert blob to File for compression
    const file = new File([blob], 'camera-capture.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    // Compress the file
    return await compressImage(file, defaultOptions);
  } catch (error) {
    console.error('Canvas compression failed:', error);
    throw new Error('Failed to compress canvas image');
  }
}

/**
 * Gets the file size in a human-readable format
 * @param dataUrl - Base64 data URL
 * @returns string - File size (e.g., "245 KB")
 */
export function getImageSize(dataUrl: string): string {
  // Calculate size from base64 string
  const base64 = dataUrl.split(',')[1];
  const bytes = (base64.length * 3) / 4;
  
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  } else if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  } else {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }
}
