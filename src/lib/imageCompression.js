/**
 * Compress an image file using Canvas API
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width (default: 1920)
 * @param {number} maxHeight - Maximum height (default: 1920)
 * @param {number} quality - Compression quality 0-1 (default: 0.8)
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            // Not an image, return original file
            resolve(file);
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }
                }
                
                // Create canvas and compress
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Compression failed'));
                            return;
                        }
                        
                        // Create a new File object with the compressed blob
                        const compressedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now(),
                        });
                        
                        resolve(compressedFile);
                    },
                    file.type,
                    quality
                );
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
};

/**
 * Compress image if it's larger than a certain size
 * @param {File} file - The file to potentially compress
 * @param {number} maxSizeMB - Maximum size in MB before compression (default: 1MB)
 * @returns {Promise<File>} - Original or compressed file
 */
export const compressImageIfNeeded = async (file, maxSizeMB = 1) => {
    // Only compress image files
    if (!file.type.startsWith('image/')) {
        return file;
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    // If file is already small enough, return as-is
    if (file.size <= maxSizeBytes) {
        return file;
    }
    
    // Compress the image
    try {
        const compressed = await compressImage(file);
        
        // If compression didn't help much, return original
        if (compressed.size >= file.size * 0.9) {
            return file;
        }
        
        return compressed;
    } catch (error) {
        console.error('Image compression failed:', error);
        // Return original file if compression fails
        return file;
    }
};

