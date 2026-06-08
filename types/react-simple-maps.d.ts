declare module 'react-simple-maps' {
  import React from 'react';

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
  export const ComposableMap: React.FC<ComposableMapProps>;

  interface ZoomableGroupProps {
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    center?: [number, number];
    children?: React.ReactNode;
  }
  export const ZoomableGroup: React.FC<ZoomableGroupProps>;

  interface Geography {
    rsmKey: string;
    properties: Record<string, string | number>;
    [key: string]: unknown;
  }

  interface GeographiesChildrenProps {
    geographies: Geography[];
  }

  interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children: (props: GeographiesChildrenProps) => React.ReactNode;
  }
  export const Geographies: React.FC<GeographiesProps>;

  interface GeographyStyleObject {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    outline?: string;
    cursor?: string;
  }

  interface GeographyProps {
    geography: Geography;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: GeographyStyleObject;
      hover?: GeographyStyleObject;
      pressed?: GeographyStyleObject;
    };
    onMouseEnter?: (evt: React.MouseEvent) => void;
    onMouseMove?: (evt: React.MouseEvent) => void;
    onMouseLeave?: (evt: React.MouseEvent) => void;
    onClick?: (evt: React.MouseEvent) => void;
  }
  export const Geography: React.FC<GeographyProps>;
}
