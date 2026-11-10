import React, { useState, useEffect } from "react";
import { ModeLayout } from "../../components/ModeLayout";
import { ChevronLeftIcon, ChevronRightIcon } from "../../components/Icons";
import { RobotBodySVG } from "../../components/RobotBodySVG";
import { vw, vh, clamp } from "../../hooks/useResponsive";
import { TRAY_COLORS } from "../../constants/trayConstants";
import { db } from "../../database/indexedDB";
import { useDestinationStore } from "../../store/destinationStore";
import { useStandardDelivery } from "../../hooks/useStandardDelivery";

export const DirectDeliveryMode = () => {
  const { loadDestinations } = useDestinationStore();
  const { isConnected, robotBattery, handleStartDelivery } = useStandardDelivery();

  const [categories, setCategories] = useState([{ id: "all", name: "All Destinations" }]);
  const [destinationsByCategory, setDestinationsByCategory] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [catScrollPos, setCatScrollPos] = useState(0);
  const [selectedDestination, setSelectedDestination] = useState(null);

  // Load destinations and group by category
  useEffect(() => {
    const fetchDestinationsAndCategories = async () => {
      const allDbCategories = await db.categories.toArray();
      const mappedCats = [{ id: "all", name: "All Destinations" }, ...allDbCategories.map(c => ({ id: c.category_id, name: c.category_name }))];
      setCategories(mappedCats);

      const allDestinations = await loadDestinations({ isActive: 1 });
      if (!allDestinations || allDestinations.length === 0) return;

      const grouped = { "all": allDestinations };
      mappedCats.forEach(cat => {
        if (cat.id !== "all") {
          grouped[cat.id] = allDestinations.filter(d => d.category_id === cat.id);
        }
      });

      setDestinationsByCategory(grouped);
    };

    fetchDestinationsAndCategories();
  }, [loadDestinations]);

  const destinationList = destinationsByCategory[selectedCategory] || [];
  const canScrollLeft = catScrollPos > 0;
  const canScrollRight = categories.length > 0 && catScrollPos < categories.length - 2;

  const scrollCategories = (direction) => {
    setCatScrollPos(prev => Math.max(0, Math.min(categories.length - 2, prev + direction)));
  };

  const handleDestinationClick = (dest) => {
    if (selectedDestination?.destination_id === dest.destination_id) {
      setSelectedDestination(null);
    } else {
      setSelectedDestination(dest);
    }
  };

  const handleStart = () => {
    const success = handleStartDelivery(selectedDestination, 'DIRECT');
    if (success) {
      setSelectedDestination(null);
    }
  };

  const getTrayColor = () => selectedDestination ? TRAY_COLORS.FILLED : TRAY_COLORS.EMPTY;
  const isDisabled = !selectedDestination || !isConnected;

  const leftPanelContent = (
    <div className="flex items-start justify-center px-4 py-4 h-full">
      <RobotBodySVG>
        <g>
          <rect
            x="28" y={65} width="65" height="35" rx="6"
            fill={getTrayColor()} stroke="#9CA3AF" strokeWidth="1.5"
            className="transition-colors"
          />
          {selectedDestination && (
            <foreignObject x="30" y={67} width="61" height="31" style={{ pointerEvents: 'none' }}>
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '2px 4px', fontSize: '7px', fontWeight: '500', color: 'white',
                  textAlign: 'center', lineHeight: '1.1', overflow: 'hidden', wordBreak: 'break-word',
                }}
              >
                {selectedDestination.destination_name}
              </div>
            </foreignObject>
          )}
        </g>
      </RobotBodySVG>
    </div>
  );

  const rightPanelContent = (
    <>
      {/* CATEGORIES */}
      <div className="bg-white border-b border-gray-200 flex items-center shrink-0"
        style={{ padding: `${vh(1.5)} ${vw(2)}` }}>
        <button onClick={() => scrollCategories(-1)} disabled={!canScrollLeft} className="p-2 rounded transition-colors disabled:opacity-60">
          <ChevronLeftIcon size={2.5} color={canScrollLeft ? "#232a34ff" : "#D1D5DB"} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2 overflow-hidden px-2" style={{ width: vw(20), flexShrink: 0 }}>
          {categories.slice(catScrollPos, catScrollPos + 2).map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedDestination(null);
              }}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all font-medium ${selectedCategory === cat.id ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              style={{ fontSize: clamp(12, 1.2, 14) }}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <button onClick={() => scrollCategories(1)} disabled={!canScrollRight} className="p-2 rounded transition-colors disabled:opacity-60">
          <ChevronRightIcon size={2.5} color={canScrollRight ? "#232a34ff" : "#D1D5DB"} strokeWidth={2} />
        </button>
      </div>

      {/* DESTINATION SELECTION */}
      <div className="flex-1 overflow-y-auto" style={{ padding: `${vh(2)} ${vw(2)}` }}>
        <div className="bg-white rounded-2xl shadow-lg p-6 h-full" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: clamp(14, 1.5, 18) }} className="font-semibold text-gray-700 mb-4">Select Destination</h3>
          <div className="grid grid-cols-4 gap-3" style={{ gap: vw(1.5) }}>
            {destinationList.map(dest => (
              <button
                key={dest.destination_id}
                onClick={() => handleDestinationClick(dest)}
                className={`rounded-xl border-2 transition-all font-semibold ${selectedDestination?.destination_id === dest.destination_id
                    ? "bg-gray-600 border-gray-600 text-white shadow-md"
                    : "bg-white border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50 hover:shadow-sm"
                  }`}
                style={{ padding: `${vh(2.5)} ${vw(1)}`, fontSize: clamp(14, 1.6, 19), minHeight: vh(10) }}
              >
                {dest.destination_name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <ModeLayout
      title="Direct Delivery Mode"
      isConnected={isConnected}
      robotBattery={robotBattery}
      onStart={handleStart}
      isStartDisabled={isDisabled}
      leftPanelContent={leftPanelContent}
      rightPanelContent={rightPanelContent}
    />
  );
};
