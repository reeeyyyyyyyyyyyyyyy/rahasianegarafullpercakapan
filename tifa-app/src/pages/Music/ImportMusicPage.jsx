import React from "react";
import { motion } from "framer-motion";
import { ScreenLayout } from "../../components/ScreenLayout";
import { vw, vh, clamp } from "../../hooks/useResponsive";

export const ImportMusicPage = () => {
  return (
    <ScreenLayout>
      <div className="flex-1 flex flex-col items-center justify-center bg-bg">
        
        <div
          className="bg-card-bg rounded-2xl border border-card-border shadow-md text-center"
          style={{
            width: vw(45),
            maxWidth: "600px",
            padding: `${vh(4)} ${vw(3)}`
          }}
        >
          {/* Title */}
          <h2
            className="font-bold text-text-primary mb-3"
            style={{ fontSize: clamp(22, 2.4, 30) }}
          >
            Import Music
          </h2>

          <p
            className="text-text-secondary mb-6"
            style={{ fontSize: clamp(13, 1.3, 17) }}
          >
            Scan the QR code below to upload your music files
          </p>

          {/* QR BOX */}
          <div
            className="mx-auto bg-gray-100 border border-card-border rounded-xl flex items-center justify-center"
            style={{
              width: vw(22),
              height: vw(22),
              maxWidth: "260px",
              maxHeight: "260px",
              marginBottom: vh(3)
            }}
          >
            <div className="text-center">
              <div
                className="opacity-60 mb-2"
                style={{ fontSize: clamp(50, 6, 80) }}
              >
                📱
              </div>
              <p
                className="text-text-secondary font-medium"
                style={{ fontSize: clamp(12, 1.2, 15) }}
              >
                QR Code
              </p>
            </div>
          </div>

          {/* INSTRUCTIONS */}
          <div
            className="bg-gray-50 rounded-xl border border-card-border text-left"
            style={{ padding: `${vh(2)} ${vw(2)}` }}
          >
            <p
              className="font-semibold text-text-primary mb-2"
              style={{ fontSize: clamp(14, 1.4, 18) }}
            >
              Instructions
            </p>

            <ol
              className="text-text-secondary list-decimal list-inside space-y-1"
              style={{ fontSize: clamp(12, 1.2, 15) }}
            >
              <li>Scan the QR code using your phone</li>
              <li>Select music files from your device</li>
              <li>Upload files into the robot storage</li>
              <li>Uploaded files will appear in Music Files</li>
            </ol>
          </div>

          {/* URL */}
          <div className="mt-5">
            <p
              className="text-text-secondary mb-1"
              style={{ fontSize: clamp(11, 1.1, 14) }}
            >
              Or open:
            </p>

            <div
              className="font-mono bg-gray-100 border border-card-border rounded-lg text-text-primary"
              style={{
                padding: `${vh(1)} ${vw(1.5)}`,
                fontSize: clamp(12, 1.2, 16)
              }}
            >
              http://192.168.1.100:8080/upload
            </div>
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
};
