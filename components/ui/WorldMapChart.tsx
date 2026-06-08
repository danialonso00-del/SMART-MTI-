'use client';

import { useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Common name aliases to match DB country names with world-atlas names
const NAME_ALIASES: Record<string, string[]> = {
  Spain:                ['Spain'],
  France:               ['France'],
  Germany:              ['Germany'],
  'United Kingdom':     ['United Kingdom', 'UK'],
  UK:                   ['United Kingdom'],
  Italy:                ['Italy'],
  Portugal:             ['Portugal'],
  Netherlands:          ['Netherlands'],
  Belgium:              ['Belgium'],
  'Saudi Arabia':       ['Saudi Arabia'],
  KSA:                  ['Saudi Arabia'],
  UAE:                  ['United Arab Emirates'],
  'United Arab Emirates': ['United Arab Emirates'],
  Qatar:                ['Qatar'],
  Bahrain:              ['Bahrain'],
  Kuwait:               ['Kuwait'],
  Oman:                 ['Oman'],
  Jordan:               ['Jordan'],
  Lebanon:              ['Lebanon'],
  Turkey:               ['Turkey'],
  Morocco:              ['Morocco'],
  Algeria:              ['Algeria'],
  Tunisia:              ['Tunisia'],
  Egypt:                ['Egypt'],
  USA:                  ['United States of America', 'United States'],
  'United States':      ['United States of America'],
  Mexico:               ['Mexico'],
  Colombia:             ['Colombia'],
  Chile:                ['Chile'],
  Argentina:            ['Argentina'],
  Brazil:               ['Brazil'],
  China:                ['China'],
  Japan:                ['Japan'],
  India:                ['India'],
  Singapore:            ['Singapore'],
  Australia:            ['Australia'],
  Switzerland:          ['Switzerland'],
  Sweden:               ['Sweden'],
  Norway:               ['Norway'],
  Poland:               ['Poland'],
  Romania:              ['Romania'],
  Greece:               ['Greece'],
  Croatia:              ['Croatia'],
};

// Build reverse lookup: atlas name → db country name
function buildReverseLookup(mapData: Record<string, { color: string; label: string }>): Record<string, string> {
  const reverse: Record<string, string> = {};
  Object.entries(NAME_ALIASES).forEach(([dbName, atlasNames]) => {
    if (mapData[dbName]) {
      atlasNames.forEach(an => { reverse[an.toLowerCase()] = dbName; });
    }
  });
  // Also try direct name match
  Object.keys(mapData).forEach(dbName => {
    if (!Object.values(reverse).includes(dbName)) {
      reverse[dbName.toLowerCase()] = dbName;
    }
  });
  return reverse;
}

interface Props {
  mapData: Record<string, { amount: number; color: string; label: string }>;
  onCountryHover: (countryName: string | null) => void;
}

export default function WorldMapChart({ mapData, onCountryHover }: Props) {
  const [tooltip, setTooltip] = useState<{ label: string; x: number; y: number } | null>(null);
  const reverseLookup = buildReverseLookup(mapData);

  function resolveGeoName(geoName: string): string | null {
    return reverseLookup[geoName.toLowerCase()] ?? null;
  }

  return (
    <div className="relative px-2 pb-2">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 130, center: [15, 20] }}
        style={{ width: '100%', height: '420px' }}
      >
        <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={6}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const geoName  = geo.properties.name as string;
                const dbName   = resolveGeoName(geoName);
                const data     = dbName ? mapData[dbName] : null;
                const fillColor = data ? data.color : '#e2e8f0';
                const hasData  = !!data;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    style={{
                      default:  { outline: 'none', cursor: hasData ? 'pointer' : 'default' },
                      hover:    { fill: hasData ? '#fbbf24' : '#cbd5e1', outline: 'none', cursor: hasData ? 'pointer' : 'default' },
                      pressed:  { outline: 'none' },
                    }}
                    onMouseEnter={(evt: React.MouseEvent) => {
                      if (hasData && dbName) {
                        onCountryHover(dbName);
                        setTooltip({
                          label: data!.label,
                          x: evt.clientX,
                          y: evt.clientY,
                        });
                      }
                    }}
                    onMouseMove={(evt: React.MouseEvent) => {
                      if (hasData) {
                        setTooltip(prev => prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null);
                      }
                    }}
                    onMouseLeave={() => {
                      onCountryHover(null);
                      setTooltip(null);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap"
          style={{ left: tooltip.x + 12, top: tooltip.y - 32 }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
