// Map Data Builder
// Builds a base64-encoded ZIP of map files for MAP_DATA WebSocket command
// Uses g_file records from DB and reads files from the local filesystem
// In production, file_path in g_file points to actual files on the same server

import { query } from '@/lib/dbClient';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { PassThrough } from 'stream';

type FileRecord = {
    g_file_id: number;
    file_group_id: number;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    metadata: Record<string, unknown> | null;
};

/**
 * Build a base64-encoded ZIP from map files stored on the filesystem.
 * 
 * Flow:
 * 1. Look up map's file_group_id from m_map or m_map_version
 * 2. Get file records from g_file
 * 3. Read each file from file_path
 * 4. Create ZIP archive and encode as base64
 * 
 * Returns null if files can't be found or read.
 */
export async function buildMapDataBase64(mapId: number): Promise<string | null> {
    try {
        // 1. Find the file_group_id for this map
        //    Check m_map_version first (latest version), then fall back to m_map.file_group_id
        let fileGroupId: number | null = null;

        const versionRows = await query<{ gfile_group_id: number }>(
            `SELECT gfile_group_id FROM m_map_version 
             WHERE map_id = $1 AND gfile_group_id IS NOT NULL
             ORDER BY version_number DESC LIMIT 1`,
            [mapId]
        );
        if (versionRows.length > 0) {
            fileGroupId = versionRows[0].gfile_group_id;
        }

        // Fallback to m_map.file_group_id
        if (!fileGroupId) {
            const mapRows = await query<{ file_group_id: number }>(
                `SELECT file_group_id FROM m_map WHERE map_id = $1 AND file_group_id IS NOT NULL`,
                [mapId]
            );
            if (mapRows.length > 0) {
                fileGroupId = mapRows[0].file_group_id;
            }
        }

        if (!fileGroupId) {
            console.warn(`[mapDataBuilder] No file_group_id found for map_id=${mapId}`);
            return null;
        }

        // 2. Get file records from g_file
        const files = await query<FileRecord>(
            `SELECT g_file_id, file_group_id, file_name, file_path, file_type, file_size, metadata
             FROM g_file WHERE file_group_id = $1`,
            [fileGroupId]
        );

        if (files.length === 0) {
            console.warn(`[mapDataBuilder] No files found for file_group_id=${fileGroupId}`);
            return null;
        }

        // 3. Read files from filesystem and create ZIP
        const readableFiles: { name: string; buffer: Buffer }[] = [];

        for (const file of files) {
            // Try the stored file_path directly
            let filePath = file.file_path;

            // On Windows dev, paths like /opt/tifa/uploads/maps/... won't exist
            // Try to resolve the file path
            if (!fs.existsSync(filePath)) {
                // Try alternative paths
                const altPaths = [
                    filePath,
                    path.join('D:', 'data', 'maps', String(mapId), '1', `map.${file.file_type}`),
                    path.join('/opt', 'tifa', 'uploads', 'maps', String(mapId), '1', `map.${file.file_type}`),
                ];

                const foundPath = altPaths.find(p => fs.existsSync(p));
                if (foundPath) {
                    filePath = foundPath;
                } else {
                    console.warn(`[mapDataBuilder] File not found: ${file.file_path} (tried alternatives)`);
                    continue;
                }
            }

            try {
                const buffer = fs.readFileSync(filePath);

                // Get the file extension from the original file name or file type
                const extension = file.file_name.split('.').pop() || file.file_type || 'dat';
                // User requirement: Always name the files map.pgm, map.yaml, etc. inside the ZIP
                let uniformName = `map.${extension}`;

                // Prevent duplicate names in the zip to avoid archiver crash
                if (readableFiles.some(f => f.name === uniformName)) {
                    uniformName = `map_extra_${file.g_file_id}.${extension}`;
                }

                readableFiles.push({ name: uniformName, buffer });
                console.log(`[mapDataBuilder] ✅ Read file: ${file.file_name} -> renamed to ${uniformName} inside ZIP (${buffer.length} bytes)`);
            } catch (readErr) {
                console.warn(`[mapDataBuilder] Cannot read file ${filePath}:`, readErr);
            }
        }

        if (readableFiles.length === 0) {
            console.warn(`[mapDataBuilder] No files could be read for map_id=${mapId}`);
            return null;
        }

        // 4. Create ZIP archive as base64
        const base64 = await createZipBase64(readableFiles);
        console.log(`[mapDataBuilder] ✅ ZIP created for map_id=${mapId}: ${readableFiles.length} files, ${base64.length} chars base64`);
        return base64;

    } catch (err) {
        console.error(`[mapDataBuilder] Error building MAP_DATA for map_id=${mapId}:`, err);
        return null;
    }
}

/**
 * Create a ZIP archive from file buffers and return as base64 string.
 */
function createZipBase64(files: { name: string; buffer: Buffer }[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const passThrough = new PassThrough();

        passThrough.on('data', (chunk: Buffer) => chunks.push(chunk));
        passThrough.on('end', () => {
            const zipBuffer = Buffer.concat(chunks);
            resolve(zipBuffer.toString('base64'));
        });
        passThrough.on('error', reject);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', reject);
        archive.pipe(passThrough);

        for (const file of files) {
            archive.append(file.buffer, { name: file.name });
        }

        void archive.finalize();
    });
}

/**
 * Build map metadata as a ZIP payload (fallback when actual map files are not accessible).
 * Wraps the metadata JSON inside a ZIP so the robot always receives format='zip'.
 * Contains map info, goal coordinates, and file metadata so the robot can reconstruct context.
 */
export async function buildMapMetadataPayload(mapId: number): Promise<string> {
    try {
        // Get map info
        const mapRows = await query<{ map_name: string; description: string }>(
            `SELECT map_name, description FROM m_map WHERE map_id = $1`,
            [mapId]
        );
        const mapInfo = mapRows[0] ?? { map_name: 'Unknown', description: '' };

        // Get goals for this map
        const goals = await query<{ goal_name: string; goal_type: string; x: number; y: number; yaw: number }>(
            `SELECT goal_name, goal_type, x, y, yaw FROM m_goal WHERE map_id = $1`,
            [mapId]
        );

        // Get file metadata (yaml metadata contains origin, resolution etc.)
        const fileMetadata = await query<{ metadata: Record<string, unknown>; file_name: string }>(
            `SELECT f.metadata, f.file_name FROM g_file f
             JOIN m_map m ON m.file_group_id = f.file_group_id
             WHERE m.map_id = $1 AND f.metadata IS NOT NULL`,
            [mapId]
        );

        const payload = {
            map_id: mapId,
            map_name: mapInfo.map_name,
            description: mapInfo.description,
            goals: goals.map(g => ({
                name: g.goal_name,
                type: g.goal_type,
                x: g.x,
                y: g.y,
                yaw: g.yaw,
            })),
            file_metadata: fileMetadata.map(f => ({
                file_name: f.file_name,
                ...f.metadata,
            })),
        };

        // Wrap metadata JSON inside a ZIP so format is always 'zip'
        const jsonBuffer = Buffer.from(JSON.stringify(payload, null, 2));
        return await createZipBase64([{ name: 'map_metadata.json', buffer: jsonBuffer }]);
    } catch (err) {
        console.error(`[mapDataBuilder] Error building metadata for map_id=${mapId}:`, err);
        return '';
    }
}
