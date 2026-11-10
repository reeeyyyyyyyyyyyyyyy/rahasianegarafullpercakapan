import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { RobotBodySVG } from "./RobotBodySVG";
import { TRAY_CONFIG, TRAY_COLORS } from "../constants/trayConstants";

export const TraySVGSelector = ({
  activeTrays = [],
  onToggle,
  className = "",
  style = {}
}) => {

  const isActive = (t) => activeTrays.includes(t);

  const getTrayColor = (t) => (isActive(t) ? TRAY_COLORS.FILLED : TRAY_COLORS.EMPTY);
  const getTextColor = (t) => (isActive(t) ? TRAY_COLORS.TEXT_ACTIVE : TRAY_COLORS.TEXT_INACTIVE);

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: "min(28vw, 240px)", // Increased width to accommodate buttons
        aspectRatio: "3 / 6",
        ...style
      }}
    >

      <div className="relative" style={{ paddingRight: "50px" }}>
        <RobotBodySVG>
          {[1, 2, 3, 4].map((trayNum, idx) => {
            const rectY = TRAY_CONFIG.START_Y + idx * TRAY_CONFIG.SPACING;

            return (
              <g key={trayNum}>
                <rect
                  x={TRAY_CONFIG.X}
                  y={rectY}
                  width={TRAY_CONFIG.WIDTH}
                  height={TRAY_CONFIG.HEIGHT}
                  rx={TRAY_CONFIG.RADIUS}
                  fill={getTrayColor(trayNum)}
                  stroke={TRAY_COLORS.STROKE}
                  strokeWidth={TRAY_CONFIG.STROKE_WIDTH}
                />

                <text
                  x="60"
                  y={rectY + 22}
                  textAnchor="middle"
                  fill={getTextColor(trayNum)}
                  fontSize="12"
                  fontWeight="600"
                >
                  Tray {trayNum}
                </text>
              </g>
            );
          })}
        </RobotBodySVG>

        {/* ACTION BUTTONS */}
        {[1, 2, 3, 4].map((trayNum, idx) => {
          const trayY = TRAY_CONFIG.START_Y + idx * TRAY_CONFIG.SPACING;
          const centerY = trayY + (TRAY_CONFIG.HEIGHT / 2);
          const percentY = ((centerY - 25) / 235) * 100;

          return (
            <button
              key={trayNum}
              onClick={() => onToggle(trayNum)}
              className={`
                absolute p-2 rounded-lg border shadow-sm
                flex items-center justify-center transition-all
                ${isActive(trayNum)
                  ? "bg-red-100 border-red-300 text-red-600"
                  : "bg-gray-200 border-gray-400 text-gray-700 hover:bg-gray-300"}
              `}
              style={{
                top: `${percentY}%`,
                right: "-42px",
                transform: "translateY(-50%)",
                width: "fit-content",
                height: "fit-content",
                zIndex: 10
              }}
            >
              {isActive(trayNum)
                ? <Trash2 size={18} strokeWidth={2} />
                : <Plus size={18} strokeWidth={2} />
              }
            </button>
          );
        })}
      </div>
    </div>
  );
};
